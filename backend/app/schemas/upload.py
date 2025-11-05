"""
Upload and Processing Schemas
"""

from pydantic import BaseModel
from typing import List, Dict, Optional, Any


class UploadResponse(BaseModel):
    """Response for file upload"""
    success: bool
    message: str
    filename: str
    file_type: Optional[str] = None
    sheet_names: List[str] = []
    error: Optional[str] = None


class ProcessSheetsRequest(BaseModel):
    """Request for processing sheets"""
    sheet_names: List[str]


class ProcessSheetsResponse(BaseModel):
    """Response for processing sheets"""
    success: bool
    message: str
    data: List[Dict[str, Any]] = []
    column_mapping: Dict[str, Dict[str, Optional[str]]] = {}
    errors: Dict[str, List[str]] = {}
    total_rows: int = 0


class PreviewChangesRequest(BaseModel):
    """Request for previewing changes"""
    records: List[Dict[str, Any]]
    update_mode: str  # "replace" or "append"


class ChangeDetail(BaseModel):
    """Detail of a change"""
    old: Any
    new: Any


class UpdateItem(BaseModel):
    """Item to update"""
    id: int
    old_record: Dict[str, Any]
    new_record: Dict[str, Any]
    match_type: str
    identity_conflict: bool
    changes: Dict[str, ChangeDetail]


class PreviewChangesResponse(BaseModel):
    """Response for previewing changes"""
    updates: List[Dict[str, Any]] = []
    new_records: List[Dict[str, Any]] = []
    duplicates: List[Dict[str, Any]] = []
    identity_conflicts: List[Dict[str, Any]] = []
    summary: Dict[str, int] = {}


class UpdateDatabaseRequest(BaseModel):
    """Request for updating database"""
    preview_data: Dict[str, Any]
    selected_ids: Optional[List[int]] = None


class UpdateDatabaseResponse(BaseModel):
    """Response for updating database"""
    success: bool
    message: str
    updated_count: int = 0
    inserted_count: int = 0
    skipped_count: int = 0
    errors: List[str] = []
    snapshot_id: Optional[int] = None


class SnapshotResponse(BaseModel):
    """Response for snapshot information"""
    id: int
    snapshot_name: str
    timestamp: Optional[str] = None
    update_details: Optional[Dict[str, Any]] = None
    rolled_back: bool = False
    records_count: int = 0
    changes_data: Optional[Dict[str, Any]] = None  # Preview data with changes for display


class RollbackRequest(BaseModel):
    """Request for rolling back a snapshot"""
    snapshot_id: int


class RollbackResponse(BaseModel):
    """Response for rollback operation"""
    success: bool
    message: str
    restored_count: int = 0
    deleted_count: int = 0
    errors: List[str] = []

