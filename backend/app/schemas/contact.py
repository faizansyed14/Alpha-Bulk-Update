"""
Contact Schemas
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class ContactBase(BaseModel):
    """Base contact schema"""
    company: str
    name: str
    surname: str
    email: str
    position: Optional[str] = None
    phone: str


class ContactCreate(ContactBase):
    """Schema for creating a contact"""
    pass


class ContactUpdate(BaseModel):
    """Schema for updating a contact"""
    company: Optional[str] = None
    name: Optional[str] = None
    surname: Optional[str] = None
    email: Optional[str] = None
    position: Optional[str] = None
    phone: Optional[str] = None


class ContactResponse(ContactBase):
    """Schema for contact response"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class Contact(ContactBase):
    """Full contact schema"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

