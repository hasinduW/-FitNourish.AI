from sqlalchemy import Column, Integer, String, Date, DateTime
from datetime import datetime, date
from db import Base


class DietPrinciples(Base):
    __tablename__ = 'diet_principles'

    id             = Column(Integer, primary_key=True, autoincrement=True)
    user_id        = Column(Integer, nullable=False)
    date           = Column(Date, nullable=False, default=date.today)
    updated_at     = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Diet name
    diet_name      = Column(String(100), nullable=False)

    # Up to 4 principles stored as separate columns
    principle_1    = Column(String(255), nullable=True)
    principle_2    = Column(String(255), nullable=True)
    principle_3    = Column(String(255), nullable=True)
    principle_4    = Column(String(255), nullable=True)

    def to_dict(self):
        principles = [
            p for p in [
                self.principle_1,
                self.principle_2,
                self.principle_3,
                self.principle_4,
            ] if p is not None
        ]
        return {
            'id':         self.id,
            'userId':     self.user_id,
            'date':       self.date.isoformat() if self.date else None,
            'updatedAt':  self.updated_at.isoformat() if self.updated_at else None,
            'dietName':   self.diet_name,
            'principles': principles,
        }