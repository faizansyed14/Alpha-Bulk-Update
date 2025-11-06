"""
Database Records Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional
from math import ceil

from app.db.base import get_db
from app.models.contact import Contact
from app.schemas.contact import ContactResponse, ContactCreate, ContactUpdate

router = APIRouter()


@router.get("", response_model=List[ContactResponse])
async def get_records(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_db)
):
    """Get all records with pagination and search"""
    try:
        query = select(Contact)
        
        # Apply search filter
        if search:
            search_term = f"%{search.lower()}%"
            query = query.where(
                or_(
                    func.lower(Contact.company).like(search_term),
                    func.lower(Contact.name).like(search_term),
                    func.lower(Contact.surname).like(search_term),
                    func.lower(Contact.email).like(search_term),
                    func.lower(Contact.position).like(search_term),
                    func.lower(Contact.phone).like(search_term),
                )
            )
        
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await session.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        
        # Execute query
        result = await session.execute(query)
        contacts = result.scalars().all()
        
        return [ContactResponse.model_validate(c) for c in contacts]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching records: {str(e)}")


@router.get("/stats")
async def get_stats(session: AsyncSession = Depends(get_db)):
    """Get database statistics"""
    try:
        # Get total count
        count_query = select(func.count(Contact.id))
        count_result = await session.execute(count_query)
        total_records = count_result.scalar()
        
        return {
            "total_records": total_records,
            "columns": 6,  # Company, Name, Surname, Email, Position, Phone
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")


@router.get("/{record_id}", response_model=ContactResponse)
async def get_record(
    record_id: int,
    session: AsyncSession = Depends(get_db)
):
    """Get single record by ID"""
    try:
        result = await session.execute(
            select(Contact).where(Contact.id == record_id)
        )
        contact = result.scalar_one_or_none()
        
        if not contact:
            raise HTTPException(status_code=404, detail="Record not found")
        
        return ContactResponse.model_validate(contact)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching record: {str(e)}")


@router.put("/{record_id}", response_model=ContactResponse)
async def update_record(
    record_id: int,
    contact_update: ContactUpdate,
    session: AsyncSession = Depends(get_db)
):
    """Update single record"""
    try:
        result = await session.execute(
            select(Contact).where(Contact.id == record_id)
        )
        contact = result.scalar_one_or_none()
        
        if not contact:
            raise HTTPException(status_code=404, detail="Record not found")
        
        # Update fields
        update_data = contact_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(contact, field, value)
        
        # Update normalized fields
        from app.services.email_normalizer import EmailNormalizer
        from app.services.phone_normalizer import PhoneNormalizer
        
        email_normalizer = EmailNormalizer()
        phone_normalizer = PhoneNormalizer()
        
        if "email" in update_data:
            contact.email_normalized = email_normalizer.normalize(contact.email)
        
        if "phone" in update_data:
            contact.phone_normalized = phone_normalizer.normalize(contact.phone)
        
        # Explicitly update the updated_at timestamp to ensure it's always updated
        from datetime import datetime, timezone
        new_timestamp = datetime.now(timezone.utc)
        contact.updated_at = new_timestamp
        print(f"Updating record {record_id}: Setting updated_at to {new_timestamp}")
        
        await session.commit()
        await session.refresh(contact)
        
        print(f"Record {record_id} updated_at after refresh: {contact.updated_at}")
        return ContactResponse.model_validate(contact)
    
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating record: {str(e)}")


@router.delete("/{record_id}")
async def delete_record(
    record_id: int,
    session: AsyncSession = Depends(get_db)
):
    """Delete single record"""
    try:
        result = await session.execute(
            select(Contact).where(Contact.id == record_id)
        )
        contact = result.scalar_one_or_none()
        
        if not contact:
            raise HTTPException(status_code=404, detail="Record not found")
        
        await session.delete(contact)
        await session.commit()
        
        return {"success": True, "message": "Record deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting record: {str(e)}")


@router.delete("")
async def delete_all_records(
    confirm: bool = Query(False),
    session: AsyncSession = Depends(get_db)
):
    """Delete entire database"""
    try:
        if not confirm:
            raise HTTPException(
                status_code=400,
                detail="Confirmation required. Set confirm=true to delete all records."
            )
        
        # Get count before deletion
        count_query = select(func.count(Contact.id))
        count_result = await session.execute(count_query)
        total_count = count_result.scalar()
        
        # Delete all records
        result = await session.execute(select(Contact))
        contacts = result.scalars().all()
        
        for contact in contacts:
            await session.delete(contact)
        
        await session.commit()
        
        return {
            "success": True,
            "message": f"Deleted {total_count} records successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting records: {str(e)}")

