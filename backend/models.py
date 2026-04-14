from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, LargeBinary
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String)  # 'lab_tech', 'physician', 'admin'
    entity_name = Column(String) # e.g., 'City Lab', 'General Hospital'

class Entity(Base):
    __tablename__ = "entities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    type = Column(String) # 'lab', 'hospital'
    public_key = Column(LargeBinary) # PEM format

class MedicalReport(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    sender_id = Column(Integer, ForeignKey("users.id"))
    receiver_entity_id = Column(Integer, ForeignKey("entities.id"))
    encrypted_payload_path = Column(String)
    encrypted_aes_key = Column(LargeBinary)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    sender = relationship("User")
    receiver = relationship("Entity")
