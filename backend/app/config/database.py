"""
Database Configuration - Multi-Database Support
Only change DATABASE_TYPE and connection strings to switch databases!
"""

from enum import Enum
from typing import Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()


class DatabaseType(str, Enum):
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    SQLSERVER = "sqlserver"
    SQLITE = "sqlite"


# CHANGE THIS LINE to switch databases
DATABASE_TYPE = DatabaseType(os.getenv("DATABASE_TYPE", "sqlite"))

# Database connection settings (all in one place)
DATABASE_CONFIG: Dict[DatabaseType, Dict[str, Any]] = {
    DatabaseType.POSTGRESQL: {
        "url": os.getenv(
            "POSTGRESQL_URL",
            "postgresql+asyncpg://user:password@localhost:5432/dbname"
        ),
        "pool_size": int(os.getenv("POSTGRESQL_POOL_SIZE", "10")),
        "max_overflow": int(os.getenv("POSTGRESQL_MAX_OVERFLOW", "20")),
    },
    DatabaseType.MYSQL: {
        "url": os.getenv(
            "MYSQL_URL",
            "mysql+aiomysql://user:password@localhost:3306/dbname"
        ),
        "pool_size": int(os.getenv("MYSQL_POOL_SIZE", "10")),
        "max_overflow": int(os.getenv("MYSQL_MAX_OVERFLOW", "20")),
    },
    DatabaseType.SQLSERVER: {
        "url": os.getenv(
            "SQLSERVER_URL",
            "mssql+aioodbc://user:password@localhost:1433/dbname?driver=ODBC+Driver+17+for+SQL+Server"
        ),
        "pool_size": int(os.getenv("SQLSERVER_POOL_SIZE", "10")),
        "max_overflow": int(os.getenv("SQLSERVER_MAX_OVERFLOW", "20")),
    },
    DatabaseType.SQLITE: {
        "url": os.getenv(
            "SQLITE_URL",
            "sqlite+aiosqlite:////app/database.db"
        ),
        "pool_size": int(os.getenv("SQLITE_POOL_SIZE", "5")),
        "max_overflow": int(os.getenv("SQLITE_MAX_OVERFLOW", "10")),
    },
}


def get_database_url() -> str:
    """Get the database URL for the current database type."""
    return DATABASE_CONFIG[DATABASE_TYPE]["url"]


def get_database_config() -> Dict[str, Any]:
    """Get the database configuration for the current database type."""
    return DATABASE_CONFIG[DATABASE_TYPE]

