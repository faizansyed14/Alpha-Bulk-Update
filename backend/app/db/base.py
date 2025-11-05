"""
Base Database Connection - Multi-Database Support
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from typing import AsyncGenerator
from app.config.database import get_database_url, get_database_config, DATABASE_TYPE

Base = declarative_base()

# Global engine and session factory
_engine = None
_session_factory = None


async def init_db() -> None:
    """Initialize database connection."""
    global _engine, _session_factory
    
    db_url = get_database_url()
    db_config = get_database_config()
    
    # SQLite doesn't support pool_size and max_overflow
    engine_kwargs = {"echo": False}  # Set to True for SQL logging
    if DATABASE_TYPE.value != "sqlite":
        engine_kwargs["pool_size"] = db_config.get("pool_size", 10)
        engine_kwargs["max_overflow"] = db_config.get("max_overflow", 20)
    
    # Create engine with appropriate pool settings
    _engine = create_async_engine(
        db_url,
        **engine_kwargs
    )
    
    # Create session factory
    _session_factory = async_sessionmaker(
        _engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session."""
    if _session_factory is None:
        await init_db()
    
    async with _session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


async def close_db() -> None:
    """Close database connection."""
    global _engine
    if _engine:
        await _engine.dispose()
        _engine = None

