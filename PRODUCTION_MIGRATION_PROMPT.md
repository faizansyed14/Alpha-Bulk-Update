# Production Migration Prompt - Excel Bulk Update Tool

## Overview
Migrate the existing Streamlit MVP application to a production-level application using FastAPI, React, PostgreSQL, Docker, and Jenkins CI/CD pipeline. The application must preserve ALL existing functionality while implementing enterprise-grade architecture, security, and deployment practices.

**CRITICAL REQUIREMENT**: The application MUST be fully functional and testable on the local machine FIRST. Everything must work locally with Docker Compose before any production deployment. The user must be able to:
- Run the entire application locally with a single command
- Test all features locally
- Use local databases (PostgreSQL, MySQL, or SQLite)
- Access frontend and backend locally
- Test file uploads locally
- Test all database operations locally

---

## Current Application Functionality (Must Preserve)

### Core Features

#### 1. Excel File Upload & Processing
- **File Format Support**: `.xlsx` and `.xls` files
- **Multiple Sheet Support**: Process single or multiple sheets from one Excel file
- **Auto-detection**: Automatically detect and handle different Excel engines (openpyxl, xlrd)
- **Error Handling**: 
  - Detect encrypted/password-protected files
  - Handle corrupted files
  - Provide clear error messages with troubleshooting steps
- **File Validation**: 
  - Check file size (not empty)
  - Validate file format
  - Handle file read errors gracefully

#### 2. Column Validation & Mapping
- **Required Columns**: Company, Name, Surname, Email, Position, Phone (in exact order)
- **Flexible Column Matching**:
  - Case-insensitive matching
  - Whitespace-insensitive (spaces, underscores, hyphens ignored)
  - Automatic column mapping from Excel to required format
  - Display column mapping when columns differ from expected names
- **Data Extraction**: Extract only required columns, ignore other columns
- **Data Normalization**: Convert all data to strings, handle NaN/empty values

#### 3. Update Modes

**CRITICAL: Unique Identifier Logic**:
- **Composite Unique Identifier**: Records are identified by EITHER Email OR Phone number
- **Matching Rules**:
  - A record is considered a MATCH if EITHER:
    - Email matches (case-insensitive, whitespace-normalized) OR
    - Phone number matches (whitespace-normalized, formatting-normalized)
  - A record is considered NEW if BOTH Email AND Phone are different from all existing records
  - If Email matches but Phone is different, OR if Phone matches but Email is different → Show as DIFFERENT record (highlight this in preview)
- **Normalization**:
  - Email: lowercase, trim whitespace, extract from HTML if present
  - Phone: remove spaces, dashes, parentheses, keep only digits; normalize formats
- **Display Logic**: When previewing, clearly indicate if a record has:
  - Same Email but different Phone → "Email match, Phone different"
  - Same Phone but different Email → "Phone match, Email different"
  - Both match → "Exact match" (update existing)
  - Both different → "New record" (add new)

**Replace Mode (Smart Update)**:
- Match records by Email OR Phone (composite matching)
- If Email matches OR Phone matches → Update existing record
- If BOTH Email AND Phone are new → Add as new record
- If Email matches but Phone differs → Update existing but highlight Phone difference
- If Phone matches but Email differs → Update existing but highlight Email difference
- Keep existing records not present in uploaded file
- Never automatically delete data
- Show detailed change tracking (old value → new value for each changed column)
- Show identity match type (Email match, Phone match, Both match, New)
- Track: updated_count, new_count, kept_count, identity_conflicts_count

**Append Mode (No Duplicates)**:
- Only add records where BOTH Email AND Phone are new (not matching any existing record)
- Skip records if EITHER Email OR Phone matches existing record (duplicate)
- Never update existing records
- Show duplicate count
- Show identity match type for duplicates (Email match, Phone match, Both match)
- Track: new_count, duplicates_count, kept_count, identity_conflicts_count

#### 4. Preview & Selective Update
- **Preview Changes**: Show what will change before updating database
- **Change Details**: Display old vs new values for each changed column
- **Row Selection**: Allow users to select/deselect individual rows for update
- **Visual Indicators**: 
  - Show which rows will be updated
  - Show which rows will be added
  - Show which rows are duplicates (will be skipped)
- **Summary Metrics**: Display counts of updates, new rows, duplicates

#### 5. Database Operations

**View Database**:
- Display all records in a table/grid format
- Show database statistics (total records, columns, filled cells)
- Support pagination for large datasets
- Display data in required column order

**Search & Filter**:
- Search across all columns simultaneously
- Case-insensitive search
- Real-time filtering as user types
- Show filtered record count

**Edit Individual Records**:
- Select a record from dropdown/list
- Display current values in editable form
- Update only the selected record
- Validate changes before saving
- Show success/error messages

**Delete Individual Records**:
- Select a record from dropdown/list
- Display current record data
- Confirm before deletion (warning message)
- Delete only the selected record
- Show success/error messages

**Delete Entire Database**:
- Two-step confirmation process
- Show record count before deletion
- Display warning message
- Require explicit confirmation
- Show success message after deletion

**Export Data**:
- Download database as CSV
- Include timestamp in filename
- UTF-8 encoding
- Include all columns in correct order

#### 6. Session Management
- Track last uploaded file
- Store preview data
- Store processed DataFrame
- Track selected updates (tick/cross selections)
- Track update mode selection
- Handle file re-uploads correctly

#### 7. Identity Normalization (Email & Phone)

**Email Normalization**:
- Extract email from HTML links (if present)
- Handle `<a href="mailto:...">` tags
- Normalize email for comparison (lowercase, strip whitespace)
- Handle empty/null emails

**Phone Normalization**:
- Remove all non-digit characters (spaces, dashes, parentheses, plus signs)
- Normalize to digits-only format for comparison
- Handle international formats (remove country codes if needed, or preserve based on config)
- Handle empty/null phones
- Preserve original format for display, but use normalized for matching

**Composite Unique Identifier**:
- Use normalized Email OR normalized Phone as unique identifier
- A record matches if EITHER field matches (after normalization)
- Both fields must be checked for every comparison
- Display match type clearly in UI (Email match, Phone match, Both match, New)

#### 8. Data Processing
- Handle duplicate identities within same file (keep last occurrence based on Email OR Phone)
- Combine data from multiple sheets
- Remove duplicates after combining sheets (based on Email OR Phone)
- Convert all data to strings for storage
- Handle empty/null values consistently
- Normalize both Email and Phone before duplicate detection

---

## Technical Requirements

### Backend (FastAPI)

#### API Endpoints Required

**File Upload & Processing**:
- `POST /api/upload` - Upload Excel file
  - Accept multipart/form-data
  - Return file validation status
  - Return sheet names if multiple sheets
  - Return column mapping information
  - Return processed data preview

- `POST /api/process-sheets` - Process selected sheets
  - Accept sheet names array
  - Return combined processed data
  - Return validation errors per sheet
  - Return column mappings

**Preview & Validation**:
- `POST /api/preview-changes` - Preview database changes
  - Accept processed data and update mode
  - Return preview of changes (updates, new rows, duplicates)
  - Return detailed change information for each row
  - **Return identity match type** for each record:
    - `match_type`: "email_match", "phone_match", "both_match", "new"
    - `matched_field`: "email" or "phone" or "both" or null
    - `identity_conflict`: boolean (true if Email matches but Phone differs, or vice versa)

**Database Operations**:
- `POST /api/update-database` - Update database with selected records
  - Accept processed data, update mode, and selected items
  - Return update results (counts, change details)
  - Return identity match types for each updated record
  - Return identity_conflicts_count
  - Return success/error messages

- `GET /api/records` - Get all database records
  - Support pagination (page, limit)
  - Support search/filter query parameter
  - Return total count
  - Return records array

- `GET /api/records/{record_id}` - Get single record by ID
  - Return single record data

- `PUT /api/records/{record_id}` - Update single record
  - Accept updated record data
  - Return success/error message

- `DELETE /api/records/{record_id}` - Delete single record
  - Return success/error message

- `DELETE /api/records` - Delete entire database
  - Require confirmation parameter
  - Return success/error message

- `GET /api/stats` - Get database statistics
  - Return row count, column count, etc.

- `GET /api/export` - Export database as CSV
  - Return CSV file download

**File Management**:
- `POST /api/validate-file` - Validate uploaded file format
  - Return validation status and error messages

#### Database Schema

**Table: contacts_data**
- `id` (Primary Key, Auto-increment, UUID or Integer)
- `company` (VARCHAR, NOT NULL)
- `name` (VARCHAR, NOT NULL)
- `surname` (VARCHAR, NOT NULL)
- `email` (VARCHAR, NOT NULL)
- `position` (VARCHAR)
- `phone` (VARCHAR, NOT NULL)
- `email_normalized` (VARCHAR, INDEXED) - Normalized email for matching
- `phone_normalized` (VARCHAR, INDEXED) - Normalized phone for matching
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE)

**Indexes**:
- Index on `email_normalized` for fast email lookups
- Index on `phone_normalized` for fast phone lookups
- Composite index on (`email_normalized`, `phone_normalized`) for composite lookups
- Unique constraint: At least ONE of (email_normalized, phone_normalized) must be unique per record

**Note**: The unique identifier is composite (Email OR Phone). The database schema supports this with separate normalized columns and appropriate indexes.

**Additional Tables for Audit Logging**:
- `update_history` - Track all database updates
  - `id`, `update_type`, `record_id`, `changes_json`, `user_id`, `timestamp`
- `file_uploads` - Track file uploads
  - `id`, `filename`, `file_size`, `sheets_processed`, `rows_processed`, `timestamp`, `user_id`

#### Backend Requirements
- FastAPI framework with async support
- **Database Abstraction Layer**: Support multiple database engines (PostgreSQL, MySQL, SQL Server, SQLite)
  - Single configuration file to switch databases
  - Database-agnostic SQLAlchemy ORM with async support
  - Database-specific connection string handling
  - Database-specific query optimization
  - Dialect-specific features handled gracefully
- Alembic for database migrations (multi-database support)
- Pydantic models for request/response validation
- File upload handling with size limits
- Error handling with proper HTTP status codes
- Logging (structured logging with levels)
- CORS configuration for React frontend
- Environment-based configuration (development, staging, production)
- Database connection pooling (configurable per database type)
- Input validation and sanitization
- Rate limiting for API endpoints
- Authentication/Authorization (JWT tokens)
- API documentation (Swagger/OpenAPI)

#### Database Configuration Requirements
- **Single Configuration File**: `app/config/database.py` or `.env` file
  - All database connection settings in ONE place
  - Easy switching between databases (PostgreSQL, MySQL, SQL Server, SQLite)
  - Database type selection via environment variable or config file
  - Connection string format handling for different databases
  - Database-specific driver configuration

**Example Configuration File** (`app/config/database.py`):
```python
# Only ONE file needs to be changed to switch databases!

from enum import Enum

class DatabaseType(str, Enum):
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    SQLSERVER = "sqlserver"
    SQLITE = "sqlite"

# CHANGE THIS LINE to switch databases
DATABASE_TYPE = DatabaseType.POSTGRESQL  # or MySQL, SQLSERVER, SQLITE

# Database connection settings (all in one place)
DATABASE_CONFIG = {
    DatabaseType.POSTGRESQL: {
        "url": "postgresql+asyncpg://user:password@localhost:5432/dbname",
        "pool_size": 10,
        "max_overflow": 20,
    },
    DatabaseType.MYSQL: {
        "url": "mysql+aiomysql://user:password@localhost:3306/dbname",
        "pool_size": 10,
        "max_overflow": 20,
    },
    DatabaseType.SQLSERVER: {
        "url": "mssql+aioodbc://user:password@localhost:1433/dbname?driver=ODBC+Driver+17+for+SQL+Server",
        "pool_size": 10,
        "max_overflow": 20,
    },
    DatabaseType.SQLITE: {
        "url": "sqlite+aiosqlite:///./database.db",
        "pool_size": 5,
        "max_overflow": 10,
    },
}
```

**Example Environment File** (`.env`):
```bash
# Only change these two lines to switch databases!
DATABASE_TYPE=postgresql
# DATABASE_TYPE=mysql
# DATABASE_TYPE=sqlserver
# DATABASE_TYPE=sqlite

# PostgreSQL connection
POSTGRESQL_URL=postgresql+asyncpg://user:password@localhost:5432/dbname

# MySQL connection
MYSQL_URL=mysql+aiomysql://user:password@localhost:3306/dbname

# SQL Server connection
SQLSERVER_URL=mssql+aioodbc://user:password@localhost:1433/dbname?driver=ODBC+Driver+17+for+SQL+Server

# SQLite connection
SQLITE_URL=sqlite+aiosqlite:///./database.db
```

**Database Abstraction**:
- Use SQLAlchemy with dialect-agnostic queries
- Handle database-specific differences (e.g., boolean types, string comparison)
- Support for different SQL syntaxes where needed
- Migration scripts that work across databases
- Database connection factory pattern - one place initializes the correct database connection

**Supported Databases**:
- PostgreSQL (primary, recommended for production)
- MySQL/MariaDB
- SQL Server
- SQLite (for development/testing)

**Key Requirement**: Changing the database type should ONLY require:
1. Updating `DATABASE_TYPE` in `app/config/database.py` or `.env`
2. Updating the connection string for the new database type
3. No code changes elsewhere in the application

#### Business Logic
- Preserve all existing validation logic
- **Updated Identity Matching Logic**:
  - Match records by Email OR Phone (composite matching)
  - Normalize both Email and Phone before comparison
  - Identify match type: Email match, Phone match, Both match, or New
  - Show identity conflicts clearly (Email matches but Phone differs, or vice versa)
- Preserve all existing update logic (Replace/Append modes) with updated matching
- Preserve email normalization logic + add phone normalization
- Preserve column mapping logic
- **Updated duplicate detection**: Check both Email AND Phone for duplicates
- Preserve change tracking logic
- **Identity Conflict Handling**:
  - When Email matches but Phone differs → Update record, highlight Phone change
  - When Phone matches but Email differs → Update record, highlight Email change
  - Show clear warnings in preview about identity conflicts

### Frontend (React)

#### UI Components Required

**Main Layout**:
- Header with application title
- Navigation tabs (Upload & Auto Update, View Database)
- Sidebar with database info and actions
- Main content area

**Upload Tab**:
- File upload component (drag & drop)
- Update mode selector (radio buttons: Replace/Append)
- Mode explanation text
- File validation status display
- Sheet selector (if multiple sheets)
- Column mapping display
- Data preview table
- Preview changes section:
  - Summary metrics (Updates, New Rows, Duplicates, Identity Conflicts)
  - List of records to update (with change details)
  - **Identity Match Type Indicators**:
    - "Email match" badge (when Email matches but Phone differs)
    - "Phone match" badge (when Phone matches but Email differs)
    - "Exact match" badge (when both Email and Phone match)
    - "New record" badge (when both Email and Phone are new)
  - Highlight identity conflicts with warning colors/icons
  - Show which field matched (Email or Phone) for each record
  - List of new records to add
  - List of duplicate records (append mode) with match type
  - Tick/cross buttons for each row
  - Update button
- Loading states and spinners
- Success/error messages

**View Database Tab**:
- Database statistics display (metrics cards)
- Search/filter input
- Refresh button
- Data table with pagination
- Edit/Delete section:
  - Record selector (dropdown)
  - Edit form with all fields
  - Save button
  - Delete button with confirmation
- Export CSV button
- Loading states

**Sidebar**:
- Database info section:
  - Database status
  - Total records metric
- Required columns list
- Database actions section:
  - Delete entire database button
  - Confirmation dialog

#### Frontend Requirements
- React 18+ with TypeScript
- Modern UI library (Material-UI, Ant Design, or Tailwind CSS with shadcn/ui)
- State management (Redux Toolkit or Zustand)
- API client (Axios with interceptors)
- Form handling (React Hook Form)
- File upload handling
- Responsive design (mobile-friendly)
- Error handling and user feedback (toasts/notifications)
- Loading states and skeletons
- Table component with sorting, filtering, pagination
- Confirmation dialogs
- CSV export functionality
- Real-time updates (optional: WebSocket for live stats)

#### State Management
- File upload state
- Preview data state
- Selected updates state
- Database records state
- Update mode state
- UI state (loading, errors, messages)

### Database (PostgreSQL)

#### Requirements
- PostgreSQL 14+ (or MySQL 8+ as alternative)
- Proper indexing:
  - Unique index on email (normalized)
  - Index on created_at for sorting
  - Index on updated_at for sorting
- Connection pooling
- Backup strategy
- Migration support (Alembic)

### Docker Configuration

#### Dockerfiles Required

**Backend Dockerfile**:
- Multi-stage build
- Python 3.11+ base image
- Install dependencies from requirements.txt
- Copy application code
- Expose port 8000
- Health check endpoint
- Non-root user for security

**Frontend Dockerfile**:
- Multi-stage build
- Node 18+ base image
- Build React application
- Serve with nginx
- Production-optimized build

**nginx Configuration**:
- Reverse proxy for FastAPI backend
- Serve static React files
- CORS headers
- File upload size limits
- SSL/TLS configuration (production)

#### Docker Compose

**Local Development** (`docker-compose.yml`):
- Backend service (with hot-reload, volume mounts)
- Frontend service (with hot-reload, volume mounts)
- PostgreSQL service (or MySQL, or SQLite for simplest setup)
- Redis service (for caching/sessions, optional)
- Volume mounts for development (code changes reflect immediately)
- Environment variables for local development
- Network configuration (all services communicate locally)
- Health checks (verify all services are running locally)
- **CRITICAL**: Everything must run locally with `docker-compose up`

**Production** (`docker-compose.prod.yml`):
- Backend service (production build)
- Frontend service (production build, nginx)
- PostgreSQL service (production configuration)
- Redis service (optional)
- Nginx service (reverse proxy)
- Production environment variables
- Network configuration
- Health checks

**Local Testing Requirements**:
- Application must start with single command: `docker-compose up`
- All services must be accessible locally
- Backend API must work at `http://localhost:8000`
- Frontend must work at `http://localhost:3000` or `http://localhost`
- Database must be accessible locally
- All features must work locally
- File uploads must work locally
- Database operations must work locally

### CI/CD Pipeline (Jenkins)

#### Pipeline Stages

**1. Build Stage**:
- Checkout code from repository
- Build Docker images
- Tag images with build number
- Push to container registry (Docker Hub, AWS ECR, etc.)

**2. Test Stage**:
- Run backend unit tests
- Run frontend unit tests
- Run integration tests
- Run E2E tests (optional)
- Generate test coverage reports

**3. Security Scan Stage**:
- Scan Docker images for vulnerabilities
- Scan code for security issues
- Check dependencies for vulnerabilities

**4. Deploy to Staging**:
- Deploy to staging environment
- Run database migrations
- Health check verification
- Smoke tests

**5. Deploy to Production**:
- Manual approval step
- Deploy to production environment
- Run database migrations
- Health check verification
- Rollback capability

#### Jenkins Requirements
- Jenkinsfile (declarative pipeline)
- Docker agent configuration
- Environment variables management
- Secrets management (credentials)
- Notifications (email, Slack, etc.)
- Artifact archiving
- Build history retention

### Production Requirements

#### Security
- Environment variables for sensitive data
- Secrets management (Vault, AWS Secrets Manager, etc.)
- API authentication (JWT)
- Input validation and sanitization
- SQL injection prevention (ORM)
- XSS prevention
- CSRF protection
- Rate limiting
- File upload size limits
- File type validation
- HTTPS/TLS encryption
- Security headers

#### Monitoring & Logging
- Application logging (structured JSON logs)
- Error tracking (Sentry, Rollbar, etc.)
- Performance monitoring (APM)
- Database query monitoring
- File upload monitoring
- User activity logging
- Health check endpoints
- Metrics collection (Prometheus, etc.)

#### Scalability
- Horizontal scaling support
- Load balancing
- Database connection pooling
- Caching strategy (Redis)
- CDN for static assets
- Database replication (read replicas)

#### Backup & Recovery
- Automated database backups
- File storage backups
- Backup retention policy
- Disaster recovery plan
- Database migration rollback capability

---

## Project Structure

```
excel-bulk-update/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI application
│   │   ├── config.py               # Configuration management
│   │   ├── database.py             # Database connection (abstracted for multi-DB support)
│   │   ├── db/                     # Database abstraction layer
│   │   │   ├── __init__.py
│   │   │   ├── base.py             # Base database connection
│   │   │   ├── postgresql.py       # PostgreSQL-specific
│   │   │   ├── mysql.py            # MySQL-specific
│   │   │   ├── sqlserver.py        # SQL Server-specific
│   │   │   └── sqlite.py           # SQLite-specific
│   │   ├── models/                 # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   ├── contact.py
│   │   │   └── audit.py
│   │   ├── schemas/                # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── contact.py
│   │   │   └── upload.py
│   │   ├── api/                    # API routes
│   │   │   ├── __init__.py
│   │   │   ├── routes/
│   │   │   │   ├── upload.py
│   │   │   │   ├── records.py
│   │   │   │   └── export.py
│   │   ├── services/               # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── excel_processor.py
│   │   │   ├── column_validator.py
│   │   │   ├── database_updater.py
│   │   │   ├── identity_matcher.py  # Composite matching (Email OR Phone)
│   │   │   ├── email_normalizer.py
│   │   │   └── phone_normalizer.py
│   │   ├── utils/                  # Utility functions
│   │   │   ├── __init__.py
│   │   │   └── helpers.py
│   │   └── middleware/            # Custom middleware
│   │       ├── __init__.py
│   │       ├── auth.py
│   │       └── logging.py
│   ├── alembic/                    # Database migrations
│   │   ├── versions/
│   │   └── env.py
│   ├── tests/                      # Tests
│   │   ├── unit/
│   │   ├── integration/
│   │   └── fixtures/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   └── alembic.ini
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Upload/
│   │   │   │   ├── FileUploader.tsx
│   │   │   │   ├── SheetSelector.tsx
│   │   │   │   ├── PreviewChanges.tsx
│   │   │   │   └── UpdateModeSelector.tsx
│   │   │   ├── Database/
│   │   │   │   ├── RecordsTable.tsx
│   │   │   │   ├── SearchFilter.tsx
│   │   │   │   ├── EditRecord.tsx
│   │   │   │   └── DeleteRecord.tsx
│   │   │   ├── Common/
│   │   │   │   ├── Layout.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── StatsCards.tsx
│   │   │   │   └── ConfirmationDialog.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── types.ts
│   │   ├── store/                  # State management
│   │   │   ├── slices/
│   │   │   └── store.ts
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts (or webpack.config.js)
│
├── docker-compose.yml              # Local development (PRIMARY)
├── docker-compose.prod.yml         # Production deployment
├── docker-compose.dev.yml          # Alternative local setup
├── nginx/
│   └── nginx.conf
├── jenkins/
│   └── Jenkinsfile
├── .github/                         # GitHub Actions (alternative)
│   └── workflows/
│       └── ci-cd.yml
├── .env.example                    # Local development environment variables
├── .env.local.example              # Local-specific settings
├── README.md                        # Must include local setup instructions
├── LOCAL_SETUP.md                  # Detailed local setup guide
├── CHANGELOG.md
└── LICENSE
```

---

## Local Development Setup (CRITICAL - MUST WORK FIRST)

### Requirements for Local Development

**The application MUST be fully functional locally before any production deployment.**

### Local Setup Instructions

#### 1. Prerequisites
- Docker Desktop installed and running
- Docker Compose installed
- Git (for cloning/version control)
- Code editor (VS Code recommended)

#### 2. Local Database Options

**Option A: SQLite (Easiest - Recommended for Initial Testing)**
- No setup required
- File-based database
- Works immediately
- Perfect for local testing

**Option B: PostgreSQL (Docker)**
- Runs in Docker container
- More production-like
- Better for testing database-specific features

**Option C: MySQL (Docker)**
- Runs in Docker container
- Alternative to PostgreSQL

**Default: Start with SQLite, can switch to PostgreSQL/MySQL later**

#### 3. Local Setup Steps

1. **Clone/Download the project**
2. **Copy environment file**:
   ```bash
   cp .env.example .env.local
   ```
3. **Configure local database** (in `.env.local` or `app/config/database.py`):
   ```python
   # For SQLite (easiest)
   DATABASE_TYPE = "sqlite"
   DATABASE_URL = "sqlite+aiosqlite:///./local_database.db"
   
   # OR for PostgreSQL (Docker)
   DATABASE_TYPE = "postgresql"
   DATABASE_URL = "postgresql+asyncpg://user:password@localhost:5432/local_db"
   ```
4. **Start all services locally**:
   ```bash
   docker-compose up
   ```
   This single command should:
   - Start backend service (FastAPI)
   - Start frontend service (React)
   - Start database service (PostgreSQL/MySQL if using, or SQLite file)
   - Set up all networking
   - Make everything accessible locally

#### 4. Local Application Access

After running `docker-compose up`, the application should be accessible at:

- **Frontend**: `http://localhost:3000` or `http://localhost`
- **Backend API**: `http://localhost:8000`
- **API Documentation**: `http://localhost:8000/docs` (FastAPI Swagger UI)
- **Database**: 
  - SQLite: `./local_database.db` (file)
  - PostgreSQL: `localhost:5432`
  - MySQL: `localhost:3306`

#### 5. Local Testing Checklist

The application must pass all these locally:

- [ ] `docker-compose up` starts all services successfully
- [ ] Backend API is accessible at `http://localhost:8000`
- [ ] Frontend is accessible at `http://localhost:3000`
- [ ] Database connection works (SQLite, PostgreSQL, or MySQL)
- [ ] Can upload Excel files via frontend
- [ ] File processing works (column validation, mapping)
- [ ] Preview changes works (shows matches, updates, new rows)
- [ ] Update database works (Replace mode)
- [ ] Update database works (Append mode)
- [ ] View database works (shows all records)
- [ ] Search/filter works
- [ ] Edit record works
- [ ] Delete record works
- [ ] Delete entire database works
- [ ] Export CSV works
- [ ] Identity matching works (Email OR Phone)
- [ ] Identity match types display correctly
- [ ] All features work end-to-end locally

#### 6. Local Development Features

**Hot Reload**:
- Backend: Code changes reflect immediately (volume mounts)
- Frontend: Code changes reflect immediately (volume mounts)
- Database: Persistent data (volume mounts)

**Local Database Switching**:
- Change `DATABASE_TYPE` in `.env.local` or `app/config/database.py`
- Restart services: `docker-compose restart`
- No code changes needed

**Local Testing with Sample Data**:
- Create sample Excel files for testing
- Test all update modes locally
- Test all database operations locally
- Verify all features work locally

#### 7. Local Docker Compose Configuration

**`docker-compose.yml` (Local Development)**:
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_TYPE=sqlite  # or postgresql, mysql
      - DATABASE_URL=sqlite+aiosqlite:///./local_database.db
    depends_on:
      - db  # Only if using PostgreSQL/MySQL
    command: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - REACT_APP_API_URL=http://localhost:8000
    command: npm start

  db:  # Optional - only if using PostgreSQL/MySQL
    image: postgres:14
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=local_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### 8. Local Troubleshooting

**Common Issues**:
- Port already in use: Change ports in `docker-compose.yml`
- Database connection failed: Check `.env.local` configuration
- Hot reload not working: Check volume mounts in `docker-compose.yml`
- Services not starting: Check Docker Desktop is running
- File uploads not working: Check file size limits and permissions

**Solutions**:
- Stop all services: `docker-compose down`
- Remove volumes: `docker-compose down -v`
- Rebuild images: `docker-compose build --no-cache`
- Check logs: `docker-compose logs [service_name]`

#### 9. Local Development Documentation

**Must Include**:
- Step-by-step local setup guide (`LOCAL_SETUP.md`)
- How to run locally with Docker
- How to run locally without Docker (optional)
- How to switch databases locally
- How to test locally
- Troubleshooting common issues
- Sample Excel files for testing

---

## Implementation Steps

### Phase 0: Local Development Setup (CRITICAL - MUST WORK FIRST)
**Priority**: Everything must work locally before production deployment!

1. **Local Development Environment**:
   - Set up local development with Docker Compose
   - Create `docker-compose.dev.yml` for local development
   - Support hot-reload for both backend and frontend
   - Local database setup (PostgreSQL, MySQL, or SQLite)
   - Environment variables for local development
   - Local testing setup

2. **Local Database Setup**:
   - Support SQLite for quick local testing (no setup required)
   - Support PostgreSQL via Docker for local development
   - Support MySQL via Docker for local development
   - Easy database switching in local config
   - Local database initialization scripts
   - Sample data seeding for testing

3. **Local Application Testing**:
   - Application must run completely locally
   - All features must work locally
   - File uploads must work locally
   - Database operations must work locally
   - All UI components must work locally
   - Test with sample Excel files locally

4. **Local Docker Setup**:
   - `docker-compose up` should start everything locally
   - Backend accessible at `http://localhost:8000`
   - Frontend accessible at `http://localhost:3000` (or 80)
   - Database accessible locally
   - All services must communicate locally
   - Health checks must work locally

5. **Local Development Documentation**:
   - Step-by-step local setup instructions
   - How to run locally with Docker
   - How to run locally without Docker (for development)
   - How to switch databases locally
   - How to test locally
   - Troubleshooting local setup

### Phase 1: Backend Setup (Local First)
1. Initialize FastAPI project structure
2. Set up local development environment
3. Set up database models (SQLAlchemy)
4. Create database migrations (Alembic)
5. **Test locally with SQLite first** (easiest setup)
6. Implement core business logic (preserve existing logic)
7. Create API endpoints
8. **Test all endpoints locally** (use FastAPI docs at /docs)
9. Add error handling and logging
10. Write unit tests (run locally)
11. Write integration tests (run locally)

### Phase 2: Frontend Setup (Local First)
1. Initialize React + TypeScript project
2. Set up local development server
3. Set up state management
4. Create API client (connect to local backend)
5. Build UI components
6. **Test all UI locally** (connect to local backend)
7. Implement file upload functionality
8. Implement preview functionality
9. Implement database view functionality
10. Add error handling and user feedback
11. Write component tests (run locally)

### Phase 3: Docker & Local Deployment (CRITICAL)
1. Create Dockerfiles (multi-stage for production, simple for dev)
2. Create `docker-compose.yml` for local development
3. Create `docker-compose.prod.yml` for production
4. Set up nginx configuration
5. **Test local Docker setup FIRST**:
   - `docker-compose up` should work locally
   - All services should start locally
   - Application should be accessible locally
   - Database should work locally
   - File uploads should work locally
   - All features should work locally
6. Test database switching locally
7. Configure local environment variables
8. Create `.env.example` for local setup
9. Document local Docker setup
10. Only after local works: Configure production environment variables
11. Set up container registry

### Phase 4: CI/CD Pipeline
1. Create Jenkinsfile
2. Configure Jenkins pipeline
3. **Test pipeline locally first** (using Jenkins or local runner)
4. Set up test stages
5. Set up build stages
6. Set up deployment stages
7. Configure notifications
8. Test full pipeline

### Phase 5: Production Hardening
1. Add monitoring and logging
2. Set up error tracking
3. Configure backups
4. Set up health checks
5. Performance optimization
6. Security audit
7. Load testing

---

## Testing Requirements

### Backend Tests
- Unit tests for all business logic functions
- Unit tests for API endpoints
- Integration tests for database operations
- Integration tests for file processing
- Error handling tests
- Edge case tests (empty files, invalid data, etc.)

### Frontend Tests
- Component unit tests
- Integration tests for user flows
- E2E tests for critical paths
- Visual regression tests (optional)

### Test Coverage
- Minimum 80% code coverage
- All critical paths must be tested
- All error paths must be tested

---

## Documentation Requirements

### API Documentation
- OpenAPI/Swagger documentation (auto-generated from FastAPI)
- API endpoint descriptions
- Request/response examples
- Error code documentation

### User Documentation
- User guide
- Feature descriptions
- Troubleshooting guide
- FAQ

### Developer Documentation
- **Local Setup Instructions** (CRITICAL - must be detailed)
  - Step-by-step local setup guide
  - How to run locally with Docker
  - How to run locally without Docker (optional)
  - How to switch databases locally
  - How to test locally
  - Troubleshooting local setup
- Architecture overview
- Database schema documentation
- Deployment guide
- Contributing guidelines

---

## Performance Requirements

- File upload: Support files up to 50MB
- Database queries: < 200ms for standard queries
- API response time: < 500ms for standard endpoints
- Frontend load time: < 3 seconds initial load
- Support concurrent users: 100+ simultaneous users
- Database: Support 1M+ records efficiently

---

## Migration Checklist

### Local Development (MUST COMPLETE FIRST)
- [ ] Local Docker setup works (`docker-compose up` starts all services)
- [ ] Backend API accessible locally at `http://localhost:8000`
- [ ] Frontend accessible locally at `http://localhost:3000`
- [ ] Database connection works locally (SQLite, PostgreSQL, or MySQL)
- [ ] All services communicate locally
- [ ] Hot reload works for backend and frontend
- [ ] Local database switching works (change config file only)
- [ ] All features work locally (tested end-to-end)
- [ ] File uploads work locally
- [ ] Database operations work locally
- [ ] Local setup documentation complete

### Functionality
- [ ] All existing functionality preserved
- [ ] All business logic migrated correctly
- [ ] Database schema matches requirements
- [ ] API endpoints fully functional
- [ ] Frontend UI matches original functionality
- [ ] File upload works with all supported formats
- [ ] Update modes (Replace/Append) work correctly
- [ ] Preview functionality works correctly
- [ ] Selective update works correctly
- [ ] Database operations (view, edit, delete) work correctly
- [ ] Search and filter work correctly
- [ ] Export functionality works correctly
- [ ] Identity matching works (Email OR Phone)
- [ ] Identity match types display correctly
- [ ] Error handling works correctly

### Infrastructure
- [ ] Authentication/authorization implemented
- [ ] Docker containers build and run correctly
- [ ] Local Docker setup fully functional
- [ ] Production Docker setup configured
- [ ] CI/CD pipeline works end-to-end
- [ ] Production deployment successful

### Production Readiness
- [ ] Monitoring and logging configured
- [ ] Backups configured
- [ ] Security measures implemented
- [ ] Documentation complete
- [ ] Tests passing with good coverage

---

## Notes

1. **Composite Unique Identifier (Email OR Phone)**: The application uses EITHER Email OR Phone (both normalized) as the unique identifier for records. A record matches if EITHER field matches. This composite matching logic must be implemented correctly in the new implementation. Identity conflicts (Email matches but Phone differs, or vice versa) must be clearly displayed to users.

2. **Column Flexibility**: The application handles various column name formats (case-insensitive, whitespace variations). This flexibility must be preserved.

3. **Database Abstraction**: The application must support multiple database engines (PostgreSQL, MySQL, SQL Server, SQLite). Only ONE configuration file (`app/config/database.py` or `.env`) should need to be changed to switch databases. The database connection logic must be abstracted so that changing the database type doesn't require code changes elsewhere.

4. **Data Integrity**: Never automatically delete data. Only update/add operations. Manual deletion is separate.

5. **User Experience**: Maintain the same user experience - drag & drop, preview before update, selective updates, clear feedback. Additionally, clearly show identity match types (Email match, Phone match, Both match, New) and highlight identity conflicts.

6. **Error Handling**: Provide clear, actionable error messages (especially for encrypted files, missing columns, etc.).

7. **Phone Normalization**: Phone numbers must be normalized to digits-only for comparison (remove spaces, dashes, parentheses, etc.) while preserving original format for display.

8. **Scalability**: Design for future growth - the application may need to handle larger datasets and more users.

9. **Security**: Implement proper authentication, authorization, input validation, and security headers from the start.

10. **Monitoring**: Set up comprehensive logging and monitoring to track usage, errors, and performance.

11. **Database Configuration**: The database connection must be configured in a single file (`app/config/database.py` or `.env`). Changing the database type (PostgreSQL → MySQL, etc.) should only require updating this one file, not changing code throughout the application.

---

## Success Criteria

The migration is successful when:
1. All original functionality works identically
2. Application is production-ready (security, performance, reliability)
3. CI/CD pipeline is fully functional
4. Application is deployed and running in production
5. Documentation is complete
6. Monitoring and backups are configured
7. Team can maintain and extend the application

---

**End of Migration Prompt**

