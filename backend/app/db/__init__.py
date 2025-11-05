"""Database abstraction layer"""

from .base import get_db, init_db, close_db

__all__ = ["get_db", "init_db", "close_db"]

