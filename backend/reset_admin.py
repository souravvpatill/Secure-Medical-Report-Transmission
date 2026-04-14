import sys
import os
# Add current directory to path to handle imports correctly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
import models, auth

def reset_admin():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Delete existing admin if any
    db.query(models.User).filter(models.User.username == "admin").delete()
    db.commit()
    
    # Create fresh admin with current hashing scheme
    admin_user = models.User(
        username="admin",
        hashed_password=auth.get_password_hash("admin123"),
        role="admin",
        entity_name="Central Admin"
    )
    db.add(admin_user)
    db.commit()
    print("Admin user reset successfully (admin / admin123)")
    db.close()

if __name__ == "__main__":
    reset_admin()
