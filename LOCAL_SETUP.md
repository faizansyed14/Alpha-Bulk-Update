# Local Development Setup Guide

This guide will help you set up and run the Excel Bulk Update Tool locally.

## Prerequisites

1. **Docker Desktop** - Install and run Docker Desktop
2. **Docker Compose** - Usually included with Docker Desktop
3. **Git** - For version control (optional)

## Quick Start

### 1. Start All Services

Run the entire application with a single command:

```bash
docker-compose up
```

This will:
- Start the FastAPI backend on port 8000
- Start the React frontend on port 3000
- Set up the SQLite database (default)
- Configure all networking

### 2. Access the Application

After services start:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### 3. Test the Application

1. Go to http://localhost:3000
2. Upload an Excel file (`.xlsx` or `.xls`)
3. Select update mode (Replace or Append)
4. Preview changes
5. Update database

## Database Configuration

### Default: SQLite (Easiest)

SQLite is the default database for local development. No additional setup required!

The database file is created at: `backend/local_database.db`

### Switch to PostgreSQL (Docker)

1. **Edit `docker-compose.yml`**:
   ```yaml
   # Uncomment the postgres service
   postgres:
     image: postgres:14
     environment:
       - POSTGRES_USER=user
       - POSTGRES_PASSWORD=password
       - POSTGRES_DB=local_db
     ports:
       - "5432:5432"
     volumes:
       - postgres_data:/var/lib/postgresql/data
   ```

2. **Edit `backend/app/config/database.py`**:
   ```python
   DATABASE_TYPE = DatabaseType.POSTGRESQL
   ```

3. **Update connection string** in `.env` or `docker-compose.yml`:
   ```python
   DATABASE_URL = "postgresql+asyncpg://user:password@postgres:5432/local_db"
   ```

4. **Restart services**:
   ```bash
   docker-compose down
   docker-compose up
   ```

### Switch to MySQL (Docker)

1. **Add MySQL service to `docker-compose.yml`**:
   ```yaml
   mysql:
     image: mysql:8
     environment:
       - MYSQL_ROOT_PASSWORD=password
       - MYSQL_DATABASE=local_db
       - MYSQL_USER=user
       - MYSQL_PASSWORD=password
     ports:
       - "3306:3306"
     volumes:
       - mysql_data:/var/lib/mysql
   ```

2. **Edit `backend/app/config/database.py`**:
   ```python
   DATABASE_TYPE = DatabaseType.MYSQL
   ```

3. **Update connection string**:
   ```python
   DATABASE_URL = "mysql+aiomysql://user:password@mysql:3306/local_db"
   ```

4. **Restart services**

## Hot Reload

Both backend and frontend support hot reload:

- **Backend**: Code changes in `backend/app/` reflect immediately
- **Frontend**: Code changes in `frontend/src/` reflect immediately

## Environment Variables

Create `.env` file in `backend/` directory (copy from `.env.example`):

```bash
DATABASE_TYPE=sqlite
DATABASE_URL=sqlite+aiosqlite:///./local_database.db
CORS_ORIGINS=http://localhost:3000,http://localhost:80
```

## Troubleshooting

### Port Already in Use

If ports 8000 or 3000 are already in use:

1. **Change ports in `docker-compose.yml`**:
   ```yaml
   backend:
     ports:
       - "8001:8000"  # Change to 8001
   
   frontend:
     ports:
       - "3001:3000"  # Change to 3001
   ```

### Database Connection Failed

1. Check database service is running:
   ```bash
   docker-compose ps
   ```

2. Check database logs:
   ```bash
   docker-compose logs postgres  # or mysql, backend
   ```

3. Verify database configuration in `backend/app/config/database.py`

### Services Not Starting

1. **Check Docker Desktop is running**

2. **Rebuild images**:
   ```bash
   docker-compose build --no-cache
   docker-compose up
   ```

3. **Check logs**:
   ```bash
   docker-compose logs backend
   docker-compose logs frontend
   ```

### File Uploads Not Working

1. Check file size limits in `backend/app/config.py`
2. Check backend logs for errors
3. Verify CORS settings in `backend/app/main.py`

## Development Workflow

### Backend Development

1. Edit code in `backend/app/`
2. Changes reflect immediately (hot reload)
3. Check logs: `docker-compose logs -f backend`

### Frontend Development

1. Edit code in `frontend/src/`
2. Changes reflect immediately (hot reload)
3. Check logs: `docker-compose logs -f frontend`

### Database Migrations

Run migrations manually:

```bash
docker-compose exec backend alembic upgrade head
```

## Stopping Services

```bash
# Stop services (keep data)
docker-compose stop

# Stop and remove containers (keep data)
docker-compose down

# Stop and remove everything including volumes
docker-compose down -v
```

## Testing Locally

### Test File Upload

1. Create a sample Excel file with columns:
   - Company, Name, Surname, Email, Position, Phone

2. Upload via frontend at http://localhost:3000

3. Test Replace mode:
   - Upload file
   - Preview changes
   - Update database

4. Test Append mode:
   - Upload file again
   - Select Append mode
   - Preview changes
   - Update database

### Test Database Operations

1. **View Database**: Go to "View Database" tab
2. **Search**: Use search filter
3. **Edit**: Select record ID and update
4. **Delete**: Select record ID and delete
5. **Export**: Click "Export as CSV"

## Next Steps

Once local setup is working:

1. Test all features locally
2. Verify all functionality works
3. Test with sample Excel files
4. Test database switching
5. Prepare for production deployment

## Support

For issues or questions:
- Check logs: `docker-compose logs`
- Review documentation in `MIGRATION_SUMMARY.md`
- Check API docs at http://localhost:8000/docs

