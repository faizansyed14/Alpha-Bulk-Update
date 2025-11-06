# Storage Architecture Explanation

## Two S3 Buckets - Why?

### Bucket 1: `excel-bulk-update-files`
**Purpose:** Store Excel files uploaded by users

**What's stored:**
- Excel files (.xlsx, .xls) uploaded through the application
- Temporary files during processing

**Why separate bucket:**
- Different access patterns (frequent uploads/downloads)
- Different lifecycle policies
- Easier to manage and monitor file uploads separately

---

### Bucket 2: `excel-bulk-update-backups`
**Purpose:** Store database backups

**What's stored:**
- Full PostgreSQL database backups (daily automated backups)
- Database dumps in `.sql.gz` format

**Why separate bucket:**
- Different access patterns (daily backups, infrequent restores)
- Can use cheaper storage class (Glacier) for backups
- Easier to manage backup retention policies
- Better security (backups are critical data)

---

## Where Rollback Data is Stored

### Primary Storage: PostgreSQL Database

**Location:** `bulk_update_snapshots` table in PostgreSQL

**What's stored:**
- `records_backup` (JSON): Full backup of records before update
- `changes_data` (JSON): Preview data showing what changed
- `update_details` (JSON): Statistics and metadata
- `snapshot_name`: Description of the update
- `timestamp`: When snapshot was created
- `rolled_back`: Whether this snapshot has been rolled back

**Why in database:**
- ✅ Fast access for rollback functionality
- ✅ Part of application data (needs to be queryable)
- ✅ Integrated with application logic
- ✅ Can be viewed/managed through application UI

**Example:**
```sql
-- Rollback snapshots are stored here
SELECT * FROM bulk_update_snapshots;

-- Each snapshot contains:
-- - records_backup: JSON with old record values
-- - changes_data: JSON with preview of changes
-- - update_details: JSON with statistics
```

---

### Backup Storage: S3 Bucket

**Location:** `excel-bulk-update-backups` S3 bucket

**What's stored:**
- Full database backups (including `bulk_update_snapshots` table)
- Daily automated backups
- 30-day retention (configurable)

**Why in S3:**
- ✅ Disaster recovery (if database is lost)
- ✅ Can restore entire database including snapshots
- ✅ Off-site backup (separate from EC2 instance)
- ✅ Versioned backups (can restore to specific point in time)

**Important:** Rollback snapshots are **included** in database backups, but they're not stored separately in S3. When you backup the database, the `bulk_update_snapshots` table is part of that backup.

---

## Data Flow

### Rollback Snapshot Creation

```
1. User uploads Excel file
   ↓
2. User clicks "Update Database"
   ↓
3. System creates snapshot in PostgreSQL:
   - Stores old record values in bulk_update_snapshots table
   - Stores preview data
   - Stores metadata
   ↓
4. System updates database
   ↓
5. Snapshot remains in database for rollback
```

### Daily Backup Process

```
1. Backup script runs daily (4 AM)
   ↓
2. Creates PostgreSQL database dump
   ↓
3. Compresses dump (.sql.gz)
   ↓
4. Uploads to S3: excel-bulk-update-backups
   ↓
5. Database backup includes:
   - All tables (contacts_data, bulk_update_snapshots, etc.)
   - All rollback snapshots (they're in the database)
```

### Rollback Process

```
1. User clicks "Rollback" on a snapshot
   ↓
2. System reads snapshot from PostgreSQL:
   - Reads from bulk_update_snapshots table
   - Gets records_backup JSON
   - Gets update_details JSON
   ↓
3. System restores records:
   - Restores old values from records_backup
   - Deletes newly inserted records
   ↓
4. Snapshot marked as rolled_back = 1
```

### Disaster Recovery

```
1. Database is lost/corrupted
   ↓
2. Download latest backup from S3:
   - aws s3 cp s3://excel-bulk-update-backups/latest.sql.gz ./
   ↓
3. Restore database:
   - Restore PostgreSQL database from backup
   ↓
4. Database restored includes:
   - All contacts_data
   - All bulk_update_snapshots (rollback data)
   - All other tables
```

---

## Summary

| Data Type | Primary Location | Backup Location | Purpose |
|-----------|-----------------|----------------|---------|
| **Excel Files** | S3: `excel-bulk-update-files` | N/A | User uploads |
| **Rollback Snapshots** | PostgreSQL: `bulk_update_snapshots` table | S3: `excel-bulk-update-backups` (included in DB backup) | Quick rollback |
| **Database Backups** | S3: `excel-bulk-update-backups` | N/A | Disaster recovery |
| **Contacts Data** | PostgreSQL: `contacts_data` table | S3: `excel-bulk-update-backups` (included in DB backup) | Main application data |

---

## Key Points

1. **Rollback snapshots are in the database** - They're stored in PostgreSQL for fast access
2. **Database backups include snapshots** - When you backup the database, snapshots are included
3. **Two buckets for different purposes:**
   - Files bucket: User uploads
   - Backups bucket: Database backups (which include snapshots)
4. **You can use one bucket** - If you want to simplify, you can use one bucket for both, but separating them is better practice

---

## Can You Use One Bucket?

**Yes, but not recommended:**

**Option: Single Bucket**
```bash
# Create one bucket
aws s3 mb s3://excel-bulk-update-storage

# Use folders:
# - s3://excel-bulk-update-storage/files/ (for Excel files)
# - s3://excel-bulk-update-storage/backups/ (for database backups)
```

**Why two buckets is better:**
- ✅ Different lifecycle policies
- ✅ Different access permissions
- ✅ Different storage classes (files: Standard, backups: Glacier)
- ✅ Easier to manage and monitor
- ✅ Better security (separate critical backups)

**Recommendation:** Keep two buckets for better organization and management.

