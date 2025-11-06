"""
File Upload and Processing Endpoints
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
import io
import json

from app.db.base import get_db
from app.services.excel_processor import ExcelProcessor
from app.services.database_updater import DatabaseUpdater
from app.services.s3_storage import s3_storage
from app.settings import settings
from app.schemas.upload import (
    UploadResponse,
    ProcessSheetsRequest,
    ProcessSheetsResponse,
    PreviewChangesRequest,
    PreviewChangesResponse,
    UpdateDatabaseRequest,
    UpdateDatabaseResponse,
    SnapshotResponse,
    RollbackRequest,
    RollbackResponse,
    DeleteSnapshotRequest,
    DeleteSnapshotResponse,
    DeleteAllSnapshotsRequest,
    DeleteAllSnapshotsResponse,
)
import os
from pathlib import Path
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
excel_processor = ExcelProcessor()
database_updater = DatabaseUpdater()

# In-memory storage for processed files (temporary, for processing)
processed_files: Dict[str, Any] = {}


@router.post("", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
):
    """Upload Excel file"""
    try:
        # Read file content
        file_content = await file.read()
        
        # Validate file
        is_valid, error_message, file_type = excel_processor.validate_file(
            file_content, file.filename
        )
        
        if not is_valid:
            return UploadResponse(
                success=False,
                message="File validation failed",
                filename=file.filename,
                error=error_message
            )
        
        # Get sheet names
        sheet_names = excel_processor.get_sheet_names(file_content, file_type)
        
        # Save file to storage (S3 if configured, otherwise local filesystem)
        file_id = f"{file.filename}_{hash(file_content)}"
        saved_path = None
        
        # Try S3 first if configured
        if s3_storage.is_available():
            saved_path = s3_storage.upload_file(file_content, file.filename, "uploads")
            if saved_path:
                logger.info(f"File saved to S3: {saved_path}")
        else:
            # Save to local filesystem (EBS)
            upload_dir = Path(settings.UPLOAD_DIR)
            upload_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate unique filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_filename = f"{timestamp}_{file.filename}"
            file_path = upload_dir / safe_filename
            
            # Save file
            with open(file_path, "wb") as f:
                f.write(file_content)
            
            saved_path = str(file_path)
            logger.info(f"File saved to local filesystem: {saved_path}")
        
        # Store file info temporarily for processing
        processed_files[file_id] = {
            "filename": file.filename,
            "content": file_content,
            "file_type": file_type,
            "sheet_names": sheet_names,
            "saved_path": saved_path,
        }
        
        return UploadResponse(
            success=True,
            message="File uploaded successfully",
            filename=file.filename,
            file_type=file_type,
            sheet_names=sheet_names
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")


@router.post("/process-sheets")
async def process_sheets(
    file: UploadFile = File(...),
    sheet_names: str = Form(...),  # JSON string of sheet names
):
    """Process selected sheets"""
    try:
        # Parse sheet names from form data
        try:
            sheet_names_list = json.loads(sheet_names) if isinstance(sheet_names, str) else sheet_names
        except:
            # If not JSON, try as comma-separated
            sheet_names_list = sheet_names.split(',') if isinstance(sheet_names, str) else []
        
        # Read file content
        file_content = await file.read()
        
        # Determine file type from filename
        filename_lower = file.filename.lower()
        if filename_lower.endswith('.xlsx'):
            file_type = 'xlsx'
        elif filename_lower.endswith('.xls'):
            file_type = 'xls'
        else:
            raise HTTPException(status_code=400, detail="Invalid file type")
        
        # Process sheets
        processed_df, sheet_mappings, sheet_errors = excel_processor.process_multiple_sheets(
            file_content,
            file_type,
            sheet_names_list
        )
        
        if processed_df.empty:
            return ProcessSheetsResponse(
                success=False,
                message="No data processed",
                errors=sheet_errors,
                total_rows=0
            )
        
        # Convert to dict
        data = excel_processor.dataframe_to_dict(processed_df)
        
        return ProcessSheetsResponse(
            success=True,
            message="Sheets processed successfully",
            data=data,
            column_mapping=sheet_mappings,
            errors=sheet_errors,
            total_rows=len(data)
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing sheets: {str(e)}")


@router.post("/preview-changes", response_model=PreviewChangesResponse)
async def preview_changes(
    request: PreviewChangesRequest,
    session: AsyncSession = Depends(get_db)
):
    """Preview database changes"""
    try:
        preview_data = await database_updater.preview_changes(
            session,
            request.records,
            request.update_mode
        )
        
        return PreviewChangesResponse(**preview_data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error previewing changes: {str(e)}")


@router.post("/update-database", response_model=UpdateDatabaseResponse)
async def update_database(
    request: UpdateDatabaseRequest,
    session: AsyncSession = Depends(get_db)
):
    """Update database with selected records"""
    try:
        results = await database_updater.update_database(
            session,
            request.preview_data,
            request.selected_ids
        )
        
        return UpdateDatabaseResponse(
            success=len(results["errors"]) == 0,
            message="Database updated successfully" if len(results["errors"]) == 0 else "Database updated with errors",
            updated_count=results["updated_count"],
            inserted_count=results["inserted_count"],
            skipped_count=results["skipped_count"],
            errors=results["errors"],
            snapshot_id=results.get("snapshot_id")
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating database: {str(e)}")


@router.get("/snapshots", response_model=List[SnapshotResponse])
async def get_snapshots(
    session: AsyncSession = Depends(get_db)
):
    """Get all bulk update snapshots"""
    try:
        snapshots = await database_updater.get_all_snapshots(session)
        return [SnapshotResponse(**s) for s in snapshots]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching snapshots: {str(e)}")


@router.get("/snapshots/{snapshot_id}", response_model=SnapshotResponse)
async def get_snapshot(
    snapshot_id: int,
    session: AsyncSession = Depends(get_db)
):
    """Get a specific snapshot by ID"""
    try:
        snapshot = await database_updater.get_snapshot(session, snapshot_id)
        if not snapshot:
            raise HTTPException(status_code=404, detail="Snapshot not found")
        return SnapshotResponse(**snapshot)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching snapshot: {str(e)}")


@router.post("/rollback", response_model=RollbackResponse)
async def rollback_snapshot(
    request: RollbackRequest,
    session: AsyncSession = Depends(get_db)
):
    """Rollback database to a previous snapshot state"""
    try:
        results = await database_updater.rollback_snapshot(
            session,
            request.snapshot_id
        )
        
        return RollbackResponse(
            success=results["success"],
            message=results["message"],
            restored_count=results["restored_count"],
            deleted_count=results.get("deleted_count", 0),
            errors=results["errors"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error rolling back snapshot: {str(e)}")


@router.delete("/snapshots/{snapshot_id}", response_model=DeleteSnapshotResponse)
async def delete_snapshot(
    snapshot_id: int,
    session: AsyncSession = Depends(get_db)
):
    """Delete a specific snapshot"""
    try:
        results = await database_updater.delete_snapshot(
            session,
            snapshot_id
        )
        
        return DeleteSnapshotResponse(
            success=results["success"],
            message=results["message"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting snapshot: {str(e)}")


@router.post("/snapshots/delete-all", response_model=DeleteAllSnapshotsResponse)
async def delete_all_snapshots(
    request: DeleteAllSnapshotsRequest,
    session: AsyncSession = Depends(get_db)
):
    """Delete all snapshots, optionally filtered by age"""
    try:
        results = await database_updater.delete_all_snapshots(
            session,
            request.older_than_days
        )
        
        return DeleteAllSnapshotsResponse(
            success=results["success"],
            message=results["message"],
            deleted_count=results.get("deleted_count", 0)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting snapshots: {str(e)}")

