"""
Contact Model
"""

from sqlalchemy import Column, Integer, String, DateTime, Index
from sqlalchemy.sql import func
from app.db.base import Base


class Contact(Base):
    """Contact data model"""
    
    __tablename__ = "contacts_data"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    company = Column(String, nullable=False)
    name = Column(String, nullable=False)
    surname = Column(String, nullable=False)
    email = Column(String, nullable=False)
    position = Column(String, nullable=True)
    phone = Column(String, nullable=False)
    
    # Normalized fields for matching
    email_normalized = Column(String, nullable=True, index=True)
    phone_normalized = Column(String, nullable=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Indexes for fast composite matching
    __table_args__ = (
        Index("idx_email_normalized", "email_normalized"),
        Index("idx_phone_normalized", "phone_normalized"),
        Index("idx_composite_identity", "email_normalized", "phone_normalized"),
    )
    
    def __repr__(self):
        return f"<Contact(id={self.id}, email={self.email}, phone={self.phone})>"

