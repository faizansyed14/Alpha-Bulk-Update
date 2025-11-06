# Storage Architecture - Complete Guide

## Database Location

**Default Configuration: SQLite**
- **File Location**: `/app/database.db` (inside Docker container)
- **Local Path**: Stored in Docker volume (persists between restarts)
- **Database Type**: SQLite (can be changed to PostgreSQL, MySQL, or SQL Server)

## Database Tables

The application uses **4 main tables**:

### 1. `contacts_data` - Main Contact Records
**Purpose**: Stores all your contact information

**Fields**:
- `id` (Primary Key, Auto-increment)
- `company` (String)
- `name` (String)
- `surname` (String)
- `email` (String)
- `position` (String, nullable)
- `phone` (String)
- `email_normalized` (String, indexed) - For matching
- `phone_normalized` (String, indexed) - For matching
- `created_at` (DateTime) - When record was created
- `updated_at` (DateTime) - When record was last updated

**What's stored here**:
- All your contact records
- Current/live data
- This is what you see in the database view

---

### 2. `bulk_update_snapshots` - Rollback Snapshots
**Purpose**: Stores backup snapshots before bulk updates for rollback functionality

**Fields**:
- `id` (Primary Key)
- `snapshot_name` (String) - e.g., "Bulk Update - 2025-11-05 05:18:32"
- `records_backup` (JSON) - **Full backup of records before update**
- `update_details` (JSON) - Statistics and metadata
- `changes_data` (JSON) - **Preview data showing what changed**
- `timestamp` (DateTime) - When snapshot was created
- `user_id` (String, nullable)
- `rolled_back` (Integer) - 0 = not rolled back, 1 = rolled back

**What's stored here**:

#### `records_backup` (JSON):
```json
[
  {
    "id": 1,
    "company": "ABC Corp",
    "name": "John",
    "surname": "Doe",
    "email": "john@example.com",
    "position": "Manager",
    "phone": "123-456-7890",
    "email_normalized": "john@example.com",
    "phone_normalized": "1234567890"
  },
  {
    "id": 2,
    ...
  }
]
```
- **Full copy** of all records that will be updated
- Used to restore records during rollback
- Contains ALL fields of the record

#### `update_details` (JSON):
```json
{
  "estimated_updated_count": 10,
  "estimated_inserted_count": 5,
  "total_backed_up_records": 10,
  "inserted_record_ids": [101, 102, 103, 104, 105]
}
```
- Statistics about the update
- IDs of newly inserted records (for deletion during rollback)

#### `changes_data` (JSON):
```json
{
  "updates": [
    {
      "id": 1,
      "old_record": {...},
      "new_record": {...},
      "match_type": "email_match",
      "identity_conflict": false,
      "changes": {
        "Name": {"old": "John", "new": "John Updated"},
        "Phone": {"old": "123-456-7890", "new": "987-654-3210"}
      }
    }
  ],
  "new_records": [
    {
      "record": {
        "Company": "New Corp",
        "Name": "Jane",
        ...
      },
      "match_type": "new"
    }
  ],
  "summary": {
    "updated_count": 10,
    "new_count": 5,
    "duplicates_count": 2,
    "identity_conflicts_count": 1
  }
}
```
- **Complete preview data** showing what changed
- Used to display changes in the rollback UI
- Shows old vs new values for each field
- Includes match types and conflicts

---

### 3. `update_history` - Audit Log
**Purpose**: Tracks individual record updates (optional logging)

**Fields**:
- `id` (Primary Key)
- `update_type` (String) - 'update', 'insert', 'delete'
- `record_id` (Integer) - Which record was changed
- `changes_json` (JSON) - What changed
- `user_id` (String, nullable)
- `timestamp` (DateTime)

**Note**: This table exists but is not actively used in the current implementation.

---

### 4. `file_uploads` - File Upload Tracking
**Purpose**: Tracks uploaded Excel files

**Fields**:
- `id` (Primary Key)
- `filename` (String)
- `file_size` (Integer)
- `sheets_processed` (Text) - JSON array of sheet names
- `rows_processed` (Integer)
- `timestamp` (DateTime)
- `user_id` (String, nullable)

---

## How Rollback Works - Storage Flow

### Step 1: Before Bulk Update
```
1. User uploads Excel file
2. System previews changes
3. User clicks "Update Database"
4. **BEFORE making changes**, system creates a snapshot:
   - Fetches all records that will be updated
   - Stores complete backup in `records_backup` (JSON)
   - Stores preview data in `changes_data` (JSON)
   - Stores metadata in `update_details` (JSON)
   - Creates entry in `bulk_update_snapshots` table
```

### Step 2: During Bulk Update
```
1. System updates records in `contacts_data` table
2. System inserts new records in `contacts_data` table
3. After flush, system tracks IDs of newly inserted records
4. Updates snapshot with `inserted_record_ids` in `update_details`
5. Commits all changes
```

### Step 3: Storage After Update
```
contacts_data table:
  - Updated records (with new values)
  - New records (with auto-generated IDs)

bulk_update_snapshots table:
  - New snapshot entry with:
    * records_backup: Old values (for restoration)
    * changes_data: Preview of what changed (for display)
    * update_details: Statistics + inserted_record_ids (for deletion)
```

### Step 4: During Rollback
```
1. User clicks "Rollback" on a snapshot
2. System reads snapshot from `bulk_update_snapshots` table
3. Gets `inserted_record_ids` from `update_details`
4. Deletes newly inserted records from `contacts_data`
5. Gets `records_backup` from snapshot
6. Restores all fields in `contacts_data` to old values
7. Marks snapshot as `rolled_back = 1`
8. Commits changes
```

---

## Data Storage Format

### JSON Storage in Snapshots

**Why JSON?**
- Flexible structure
- Can store nested data
- Easy to query and display
- Works across all database types

**Example Snapshot Structure**:
```json
{
  "id": 1,
  "snapshot_name": "Bulk Update - 2025-11-05 05:18:32",
  "records_backup": [
    {
      "id": 1,
      "company": "ABC",
      "name": "John",
      "email": "john@example.com",
      "phone": "123-456-7890",
      ...
    }
  ],
  "update_details": {
    "estimated_updated_count": 10,
    "estimated_inserted_count": 5,
    "inserted_record_ids": [101, 102, 103]
  },
  "changes_data": {
    "updates": [
      {
        "id": 1,
        "old_record": {...},
        "new_record": {...},
        "changes": {
          "Name": {"old": "John", "new": "John Updated"}
        }
      }
    ],
    "new_records": [...],
    "summary": {...}
  },
  "timestamp": "2025-11-05T05:18:32",
  "rolled_back": 0
}
```

---

## Storage Locations Summary

| Data Type | Storage Location | Format | Purpose |
|-----------|----------------|--------|---------|
| **Current Contacts** | `contacts_data` table | SQL Rows | Live contact data |
| **Snapshot Backups** | `bulk_update_snapshots.records_backup` | JSON Array | Old values for restoration |
| **Change Preview** | `bulk_update_snapshots.changes_data` | JSON Object | Display what changed (old→new) |
| **Inserted Record IDs** | `bulk_update_snapshots.update_details.inserted_record_ids` | JSON Array | Track which records to delete on rollback |
| **Statistics** | `bulk_update_snapshots.update_details` | JSON Object | Counts and metadata |
| **Database File** | `/app/database.db` (SQLite) | Binary File | All tables in one file |

---

## Key Points

1. **All data is in one database file** (`database.db` for SQLite)
2. **Snapshots are stored as JSON** in the `bulk_update_snapshots` table
3. **Changes are stored twice**:
   - `records_backup`: Full record backup (for restoration)
   - `changes_data`: Preview data (for display in UI)
4. **Rollback uses both**:
   - `records_backup` to restore old values
   - `inserted_record_ids` to delete new records
5. **Nothing is deleted** - snapshots remain even after rollback (marked as `rolled_back = 1`)

