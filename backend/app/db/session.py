"""
Database Session Factory
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from app.db.base import _session_factory


async def get_session() -> AsyncSession:
    """Get a new database session."""
    if _session_factory is None:
        from app.db.base import init_db
        await init_db()
    
    return _session_factory()

