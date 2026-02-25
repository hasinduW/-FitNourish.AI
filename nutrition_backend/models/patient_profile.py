from sqlalchemy import Column, Integer, String, DateTime, UniqueConstraint
from sqlalchemy.orm import declarative_base
from datetime import datetime

# Base = declarative_base()
from db import Base


class PatientProfile(Base):
    __tablename__ = 'patient_profiles'

    id      = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, unique=True)

    # Basic Info
    age        = Column(Integer, nullable=False)
    gender     = Column(String(10), nullable=False)
    married    = Column(String(5), nullable=False)
    profession = Column(String(50), nullable=False)
    smoking    = Column(String(5), nullable=False)
    alcohol    = Column(String(5), nullable=False)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        return {
            'id':         self.id,
            'userId':     self.user_id,
            'age':        self.age,
            'gender':     self.gender,
            'married':    self.married,
            'profession': self.profession,
            'smoking':    self.smoking,
            'alcohol':    self.alcohol,
            'createdAt':  self.created_at.isoformat() if self.created_at else None,
            'updatedAt':  self.updated_at.isoformat() if self.updated_at else None,
        }