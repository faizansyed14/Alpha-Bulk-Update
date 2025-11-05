"""
Export Endpoints
"""

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import csv
import io
from datetime import datetime

from app.db.base import get_db
from app.models.contact import Contact

router = APIRouter()


@router.get("/csv")
async def export_csv(session: AsyncSession = Depends(get_db)):
    """Export database as CSV"""
    try:
        # Get all records
        result = await session.execute(select(Contact))
        contacts = result.scalars().all()
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(["Company", "Name", "Surname", "Email", "Position", "Phone"])
        
        # Write data
        for contact in contacts:
            writer.writerow([
                contact.company,
                contact.name,
                contact.surname,
                contact.email,
                contact.position or "",
                contact.phone,
            ])
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"contacts_export_{timestamp}.csv"
        
        # Convert to bytes
        output.seek(0)
        csv_bytes = output.getvalue().encode('utf-8-sig')  # UTF-8 with BOM for Excel
        
        return StreamingResponse(
            io.BytesIO(csv_bytes),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting CSV: {str(e)}")

