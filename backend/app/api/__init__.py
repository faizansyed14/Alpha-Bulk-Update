"""API route handlers"""

from fastapi import APIRouter
from app.api.routes import upload, records, export, auth

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(records.router, prefix="/records", tags=["records"])
api_router.include_router(export.router, prefix="/export", tags=["export"])
