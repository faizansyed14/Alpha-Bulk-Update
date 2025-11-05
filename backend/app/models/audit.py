"""
Audit Log Models
"""

from sqlalchemy import Column, Integer, String, DateTime, JSON, Text
from sqlalchemy.sql import func
from app.db.base import Base


class UpdateHistory(Base):
    """Track all database updates"""
    
    __tablename__ = "update_history"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    update_type = Column(String, nullable=False)  # 'update', 'insert', 'delete'
    record_id = Column(Integer, nullable=True)
    changes_json = Column(JSON, nullable=True)
    user_id = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


class FileUpload(Base):
    """Track file uploads"""
    
    __tablename__ = "file_uploads"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    sheets_processed = Column(Text, nullable=True)  # JSON array of sheet names
    rows_processed = Column(Integer, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(String, nullable=True)


class BulkUpdateSnapshot(Base):
    """Store backup snapshots before bulk updates for rollback functionality"""
    
    __tablename__ = "bulk_update_snapshots"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    snapshot_name = Column(String, nullable=False)  # Description of the update
    records_backup = Column(JSON, nullable=False)  # Full backup of affected records before update
    update_details = Column(JSON, nullable=True)  # Details of what was updated (updated_count, inserted_count, etc.)
    changes_data = Column(JSON, nullable=True)  # Preview data with changes (updates, new_records, etc.) for display
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(String, nullable=True)
    rolled_back = Column(Integer, default=0)  # 0 = not rolled back, 1 = rolled back

