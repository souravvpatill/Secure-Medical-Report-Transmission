import os
import shutil
import uuid
from typing import List
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models, database, auth, crypto_utils
from fastapi.middleware.cors import CORSMiddleware
from database import engine, get_db

# --- Schemas ---
class UserCreate(BaseModel):
    username: str
    password: str
    role: str
    entity_name: str

class EntityCreate(BaseModel):
    name: str
    type: str

# Initialize database
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="MediSecure Medical Transmission System")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure required directories exist
os.makedirs("storage", exist_ok=True)
os.makedirs("keys", exist_ok=True)

# --- Authentication ---

@app.post("/auth/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", tags=["Authentication"])
async def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return {
        "username": current_user.username,
        "role": current_user.role,
        "entity_name": current_user.entity_name
    }

# --- Admin Routes ---

@app.post("/admin/entities", tags=["Admin"])
def create_entity(entity: EntityCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.RoleChecker(["admin"]))):
    existing = db.query(models.Entity).filter(models.Entity.name == entity.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Entity already exists")
    
    # Generate RSA keys for the entity
    private_key, public_key = crypto_utils.generate_rsa_key_pair()
    pub_pem = crypto_utils.serialize_public_key(public_key)
    priv_pem = crypto_utils.serialize_private_key(private_key)
    
    # Save private key locally
    key_filename = f"keys/{entity.name.replace(' ', '_').lower()}_private.pem"
    with open(key_filename, "wb") as f:
        f.write(priv_pem)
    
    new_entity = models.Entity(name=entity.name, type=entity.type, public_key=pub_pem)
    db.add(new_entity)
    db.commit()
    db.refresh(new_entity)
    return {"message": f"Entity {entity.name} created", "entity_id": new_entity.id}

@app.post("/admin/users", tags=["Admin"])
def create_user(user: UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.RoleChecker(["admin"]))):
    existing = db.query(models.User).filter(models.User.username == user.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, hashed_password=hashed_password, role=user.role, entity_name=user.entity_name)
    db.add(new_user)
    db.commit()
    return {"message": f"User {user.username} created"}

@app.get("/entities", tags=["Directory"])
def list_entities(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    entities = db.query(models.Entity).all()
    return [{"id": e.id, "name": e.name, "type": e.type} for e in entities]

# --- Lab Tech Routes ---

@app.post("/reports/upload", tags=["Reports"])
async def upload_report(
    receiver_entity_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.RoleChecker(["lab_tech"]))
):
    recipient = db.query(models.Entity).filter(models.Entity.id == receiver_entity_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient entity not found")
    
    # Read file content
    content = await file.read()
    
    # 1. Encrypt payload with AES-256-GCM
    encrypted_payload, aes_key = crypto_utils.encrypt_payload(content)
    
    # 2. Save encrypted payload to storage
    stored_filename = f"{uuid.uuid4()}.enc"
    storage_path = os.path.join("storage", stored_filename)
    with open(storage_path, "wb") as f:
        f.write(encrypted_payload)
    
    # 3. Wrap AES key with recipient's RSA public key
    pub_key = crypto_utils.load_public_key(recipient.public_key)
    wrapped_aes_key = crypto_utils.wrap_key(aes_key, pub_key)
    
    # 4. Save to DB
    new_report = models.MedicalReport(
        filename=file.filename,
        sender_id=current_user.id,
        receiver_entity_id=receiver_entity_id,
        encrypted_payload_path=storage_path,
        encrypted_aes_key=wrapped_aes_key
    )
    db.add(new_report)
    db.commit()
    
    return {"message": "Report uploaded and encrypted successfully", "report_id": new_report.id}

# --- Shared/Physician Routes ---

@app.get("/reports/list", response_model=List[dict], tags=["Reports"])
def list_reports(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Lab techs see what they sent, Physicians see what was sent to their entity
    if current_user.role == "lab_tech":
        reports = db.query(models.MedicalReport).filter(models.MedicalReport.sender_id == current_user.id).all()
    else:
        # Resolve entity ID from name for physician
        entity = db.query(models.Entity).filter(models.Entity.name == current_user.entity_name).first()
        if not entity:
            return []
        reports = db.query(models.MedicalReport).filter(models.MedicalReport.receiver_entity_id == entity.id).all()
    
    return [{"id": r.id, "filename": r.filename, "timestamp": r.timestamp} for r in reports]

@app.get("/reports/download/{report_id}", tags=["Reports"])
async def download_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.RoleChecker(["physician"]))
):
    report = db.query(models.MedicalReport).filter(models.MedicalReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Verify physician belongs to the recipient entity
    recipient_entity = db.query(models.Entity).filter(models.Entity.id == report.receiver_entity_id).first()
    if not recipient_entity or current_user.entity_name != recipient_entity.name:
        raise HTTPException(status_code=403, detail="You do not have access to this report")
    
    # 1. Load recipient entity's private key
    key_filename = f"keys/{recipient_entity.name.replace(' ', '_').lower()}_private.pem"
    if not os.path.exists(key_filename):
        raise HTTPException(status_code=500, detail="Recipient private key missing on server")
    
    with open(key_filename, "rb") as f:
        priv_pem = f.read()
    priv_key = crypto_utils.load_private_key(priv_pem)
    
    # 2. Unwrap AES key
    try:
        aes_key = crypto_utils.unwrap_key(report.encrypted_aes_key, priv_key)
    except Exception:
        raise HTTPException(status_code=500, detail="Decryption failed (Key mismatch)")
    
    # 3. Read and decrypt payload
    with open(report.encrypted_payload_path, "rb") as f:
        encrypted_data = f.read()
    
    try:
        decrypted_content = crypto_utils.decrypt_payload(encrypted_data, aes_key)
    except Exception:
        raise HTTPException(status_code=500, detail="Decryption failed (Payload corruption)")
    
    # 4. Save temp file for response (or stream it)
    temp_filename = f"temp_{report.filename}"
    with open(temp_filename, "wb") as f:
        f.write(decrypted_content)
    
    return FileResponse(temp_filename, filename=report.filename, background=None)

@app.get("/")
def read_root():
    return {"status": "Secure Medical Transmission System API is running"}
