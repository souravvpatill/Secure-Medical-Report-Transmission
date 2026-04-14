from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models, auth

def seed_db():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if admin already exists
    admin = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin:
        admin_user = models.User(
            username="admin",
            hashed_password=auth.get_password_hash("admin123"),
            role="admin",
            entity_name="Central Admin"
        )
        db.add(admin_user)
        db.commit()
        print("Admin user created (admin / admin123)")
    else:
        print("Admin user already exists")
    db.close()

if __name__ == "__main__":
    seed_db()
