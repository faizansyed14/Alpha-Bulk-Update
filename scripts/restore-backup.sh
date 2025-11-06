#!/bin/bash

# Database Restore Script
# Usage: ./restore-backup.sh <backup_file.sql.gz>

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo "Example: $0 backup_excel_bulk_update_20240101_120000.sql.gz"
    exit 1
fi

BACKUP_FILE=$1
COMPOSE_FILE="docker-compose.prod.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Check if backup file is from S3 or local
if [[ "$BACKUP_FILE" == s3://* ]]; then
    echo -e "${YELLOW}Downloading backup from S3...${NC}"
    aws s3 cp "$BACKUP_FILE" ./restore_backup.sql.gz || {
        echo -e "${RED}Failed to download backup from S3${NC}"
        exit 1
    }
    BACKUP_FILE="./restore_backup.sql.gz"
fi

# Confirm restore
echo -e "${YELLOW}WARNING: This will restore the database from backup.${NC}"
echo -e "${YELLOW}This will REPLACE all current data in the database!${NC}"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Extract backup if compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo -e "${YELLOW}Extracting backup file...${NC}"
    gunzip -c "$BACKUP_FILE" > restore_backup.sql
    BACKUP_FILE="./restore_backup.sql"
fi

# Drop and recreate database (or just restore)
echo -e "${YELLOW}Restoring database...${NC}"

# Get database name from environment
source .env 2>/dev/null || true
DB_NAME="${POSTGRES_DB:-excel_bulk_update}"
DB_USER="${POSTGRES_USER:-excel_update_user}"

# Restore database
docker-compose -f $COMPOSE_FILE exec -T postgres psql -U "$DB_USER" -d postgres <<EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
EOF

docker-compose -f $COMPOSE_FILE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Database restored successfully!${NC}"
    
    # Clean up temporary files
    if [ -f "./restore_backup.sql" ]; then
        rm -f ./restore_backup.sql
    fi
    if [ -f "./restore_backup.sql.gz" ]; then
        rm -f ./restore_backup.sql.gz
    fi
else
    echo -e "${RED}Database restore failed!${NC}"
    exit 1
fi

