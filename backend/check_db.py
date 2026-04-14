from backend.database import SessionLocal
from backend import models, auth

def check_user():
    db = SessionLocal()
    user = db.query(models.User).filter(models.User.username == "admin").first()
    if user:
        print(f"User found: {user.username}")
        print(f"Role: {user.role}")
        print(f"Hashed Password: {user.hashed_password}")
        
        # Test verification
        is_match = auth.verify_password("admin123", user.hashed_password)
        print(f"Password 'admin123' match: {is_match}")
    else:
        print("User 'admin' not found in database.")
    db.close()

if __name__ == "__main__":
    check_user()
