# Migration Summary - Quick Reference

## Application Overview
Excel Bulk Update Tool - Migrate from Streamlit MVP to Production FastAPI + React Application

## Technology Stack Migration

| Component | Current (MVP) | Target (Production) |
|-----------|--------------|---------------------|
| Backend | Streamlit (Python) | FastAPI (Python) |
| Frontend | Streamlit UI | React + TypeScript |
| Database | SQLite | PostgreSQL |
| Deployment | Local script | Docker + Docker Compose |
| CI/CD | None | Jenkins Pipeline |
| Authentication | None | JWT Authentication |
| Monitoring | None | Structured Logging + APM |

## Core Functionality to Preserve

### 1. Excel Processing
- ✅ Support .xlsx and .xls files
- ✅ Multiple sheet processing
- ✅ Auto-detection of Excel engines
- ✅ Encrypted file detection
- ✅ Error handling with clear messages

### 2. Column Validation
- ✅ Required columns: Company, Name, Surname, Email, Position, Phone
- ✅ Flexible matching (case-insensitive, whitespace-tolerant)
- ✅ Automatic column mapping
- ✅ Display mapping when columns differ

### 3. Unique Identifier (CRITICAL)
- ✅ **Composite Unique Identifier**: Email OR Phone (both normalized)
- ✅ Match records if EITHER Email OR Phone matches
- ✅ New record if BOTH Email AND Phone are different
- ✅ Show identity match type: Email match, Phone match, Both match, New
- ✅ Highlight identity conflicts (Email matches but Phone differs, or vice versa)

### 4. Update Modes
- ✅ **Replace Mode**: Update existing (by Email OR Phone), add new, keep old
- ✅ **Append Mode**: Add only new (where BOTH Email AND Phone are new), skip duplicates
- ✅ Preview changes before update with identity match types
- ✅ Selective row updates (tick/cross)

### 5. Database Operations
- ✅ View all records
- ✅ Search/filter across all columns
- ✅ Edit individual records
- ✅ Delete individual records
- ✅ Delete entire database (with confirmation)
- ✅ Export as CSV

### 6. Identity Normalization (Email & Phone)
- ✅ **Email Normalization**: Extract from HTML links, case-insensitive, whitespace normalization
- ✅ **Phone Normalization**: Remove spaces/dashes/parentheses, digits-only for comparison
- ✅ **Composite Matching**: Use Email OR Phone as unique identifier
- ✅ Display match type clearly in UI

## Key API Endpoints Needed

```
POST   /api/upload              - Upload Excel file
POST   /api/process-sheets      - Process selected sheets
POST   /api/preview-changes     - Preview database changes
POST   /api/update-database     - Update database
GET    /api/records             - Get all records (with pagination, search)
GET    /api/records/{id}        - Get single record
PUT    /api/records/{id}        - Update single record
DELETE /api/records/{id}        - Delete single record
DELETE /api/records             - Delete entire database
GET    /api/stats               - Get database statistics
GET    /api/export              - Export as CSV
```

## Database Schema

```sql
CREATE TABLE contacts_data (
    id SERIAL PRIMARY KEY,
    company VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    surname VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    position VARCHAR,
    phone VARCHAR NOT NULL,
    email_normalized VARCHAR,  -- Normalized for matching
    phone_normalized VARCHAR,  -- Normalized for matching
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast composite matching
CREATE INDEX idx_email_normalized ON contacts_data (email_normalized);
CREATE INDEX idx_phone_normalized ON contacts_data (phone_normalized);
CREATE INDEX idx_composite_identity ON contacts_data (email_normalized, phone_normalized);
```

## Database Configuration (Multi-Database Support)

**Single Configuration File**: `app/config/database.py` or `.env`

**To Switch Databases**: Only change 2 lines!
```python
# In app/config/database.py
DATABASE_TYPE = DatabaseType.POSTGRESQL  # Change to MySQL, SQLSERVER, or SQLITE
DATABASE_URL = "postgresql+asyncpg://..."  # Update connection string
```

**Supported Databases**:
- PostgreSQL (primary)
- MySQL/MariaDB
- SQL Server
- SQLite

**No code changes needed** - all database logic is abstracted!

## Docker Services

- `backend` - FastAPI application
- `frontend` - React application (nginx)
- `postgres` - PostgreSQL database
- `redis` - Caching (optional)
- `nginx` - Reverse proxy (optional)

## Jenkins Pipeline Stages

1. **Build** - Build Docker images
2. **Test** - Run unit, integration, E2E tests
3. **Security Scan** - Vulnerability scanning
4. **Deploy Staging** - Deploy to staging environment
5. **Deploy Production** - Deploy to production (with approval)

## Critical Business Logic to Preserve

1. **Composite Identity Matching (Email OR Phone)**:
   - Normalize Email: lowercase, trim whitespace, extract from HTML
   - Normalize Phone: digits-only (remove spaces, dashes, parentheses)
   - Match if EITHER Email OR Phone matches (after normalization)
   - Identify match type: Email match, Phone match, Both match, New

2. **Replace Mode Logic**:
   - Match by normalized Email OR Phone
   - Update existing if Email OR Phone matches
   - Add new if BOTH Email AND Phone are new
   - Keep existing if not in file
   - Never auto-delete
   - Show identity conflicts clearly

3. **Append Mode Logic**:
   - Check if Email OR Phone exists
   - Add only if BOTH Email AND Phone are new
   - Skip if EITHER Email OR Phone matches (duplicate)
   - Never update existing
   - Show match type for duplicates

4. **Change Tracking**:
   - Compare old vs new for each column
   - Show only changed columns
   - Track update/add/keep/identity_conflicts counts
   - Display identity match type for each record

## Security Requirements

- ✅ JWT authentication
- ✅ Input validation
- ✅ SQL injection prevention (ORM)
- ✅ XSS prevention
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ File upload size limits
- ✅ HTTPS/TLS
- ✅ Security headers

## Performance Targets

- File upload: Up to 50MB
- API response: < 500ms
- Database queries: < 200ms
- Frontend load: < 3 seconds
- Concurrent users: 100+

## Local Development Setup (CRITICAL - MUST WORK FIRST)

**Priority**: Everything must work locally before production deployment!

### Local Setup
- Run entire application with single command: `docker-compose up`
- Backend accessible at: `http://localhost:8000`
- Frontend accessible at: `http://localhost:3000`
- Database: SQLite (easiest) or PostgreSQL/MySQL (Docker)
- Hot reload for backend and frontend
- All features must work locally first

### Local Database Options
1. **SQLite** (Recommended for initial testing)
   - No setup required
   - File-based database
   - Works immediately

2. **PostgreSQL** (Docker)
   - Runs in Docker container
   - More production-like

3. **MySQL** (Docker)
   - Alternative to PostgreSQL

### Local Testing Checklist
- [ ] `docker-compose up` starts all services
- [ ] Backend API accessible locally
- [ ] Frontend accessible locally
- [ ] Database connection works
- [ ] File upload works locally
- [ ] All database operations work locally
- [ ] All features work end-to-end locally

## Migration Phases

0. **Phase 0**: Local development setup (CRITICAL - MUST WORK FIRST)
1. **Phase 1**: Backend setup & API development (test locally)
2. **Phase 2**: Frontend development (test locally)
3. **Phase 3**: Docker & deployment setup (test locally first)
4. **Phase 4**: CI/CD pipeline
5. **Phase 5**: Production hardening

## Testing Requirements

- 80%+ code coverage
- Unit tests for all business logic
- Integration tests for API endpoints
- E2E tests for critical paths
- Error handling tests

## Documentation Required

- API documentation (OpenAPI/Swagger)
- User guide
- Developer setup guide
- Deployment guide
- Architecture documentation

---

**Use the detailed `PRODUCTION_MIGRATION_PROMPT.md` for complete specifications.**

