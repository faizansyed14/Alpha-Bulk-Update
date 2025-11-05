"""
FastAPI Application - Main Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.settings import settings
from app.api import api_router
from app.db.base import init_db, close_db
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events for application startup and shutdown"""
    # Startup
    from app.db.base import Base
    from app.models.contact import Contact
    from app.models.audit import UpdateHistory, FileUpload, BulkUpdateSnapshot
    from app.config.database import DATABASE_TYPE
    import app.db.base as db_module
    from sqlalchemy import text
    
    await init_db()
    
    # Create tables if they don't exist
    if db_module._engine:
        async with db_module._engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            
            # Migration: Add changes_data column to bulk_update_snapshots if it doesn't exist
            # Check if the column exists
            if DATABASE_TYPE.value == "sqlite":
                try:
                    # Check if column exists by trying to select it
                    result = await conn.execute(
                        text("PRAGMA table_info(bulk_update_snapshots)")
                    )
                    columns = [row[1] for row in result.fetchall()]
                    
                    if "changes_data" not in columns:
                        # Add the column
                        await conn.execute(
                            text("ALTER TABLE bulk_update_snapshots ADD COLUMN changes_data JSON")
                        )
                        print("Added changes_data column to bulk_update_snapshots table")
                except Exception as e:
                    print(f"Migration check error (may be expected): {e}")
            else:
                # For other databases, use information_schema
                try:
                    if DATABASE_TYPE.value == "postgresql":
                        result = await conn.execute(
                            text("""
                                SELECT column_name 
                                FROM information_schema.columns 
                                WHERE table_name = 'bulk_update_snapshots' 
                                AND column_name = 'changes_data'
                            """)
                        )
                        if not result.fetchone():
                            await conn.execute(
                                text("ALTER TABLE bulk_update_snapshots ADD COLUMN changes_data JSON")
                            )
                            print("Added changes_data column to bulk_update_snapshots table")
                    elif DATABASE_TYPE.value == "mysql":
                        result = await conn.execute(
                            text("""
                                SELECT column_name 
                                FROM information_schema.columns 
                                WHERE table_name = 'bulk_update_snapshots' 
                                AND column_name = 'changes_data'
                                AND table_schema = DATABASE()
                            """)
                        )
                        if not result.fetchone():
                            await conn.execute(
                                text("ALTER TABLE bulk_update_snapshots ADD COLUMN changes_data JSON")
                            )
                            print("Added changes_data column to bulk_update_snapshots table")
                except Exception as e:
                    print(f"Migration check error (may be expected): {e}")
    
    yield
    # Shutdown
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Excel Bulk Update Tool - Production API",
    lifespan=lifespan
)

# CORS middleware
cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

