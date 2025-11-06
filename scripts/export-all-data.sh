#!/bin/bash

# Export All Data Script
# Exports database, downloads S3 files, and downloads latest backup

set -e

EXPORT_DIR="export_$(date +%Y%m%d_%H%M%S)"
COMPOSE_FILE="docker-compose.prod.yml"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting complete data export...${NC}"

# Create export directory
mkdir -p "$EXPORT_DIR"
cd "$EXPORT_DIR"

# 1. Export database to CSV
echo -e "${YELLOW}Exporting database...${NC}"
docker-compose -f "../$COMPOSE_FILE" exec -T postgres psql -U excel_update_user -d excel_bulk_update -c "\copy (SELECT * FROM contacts_data) TO STDOUT CSV HEADER" > database_export.csv
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database exported${NC}"
else
    echo -e "${RED}✗ Database export failed${NC}"
fi

# 2. Download files from S3 (if configured)
if command -v aws &> /dev/null && [ -n "$AWS_S3_BUCKET" ]; then
    echo -e "${YELLOW}Downloading files from S3...${NC}"
    mkdir -p s3_files
    aws s3 sync "s3://$AWS_S3_BUCKET/" ./s3_files/ 2>/dev/null && echo -e "${GREEN}✓ S3 files downloaded${NC}" || echo -e "${RED}✗ S3 download failed${NC}"
else
    echo -e "${YELLOW}Skipping S3 download (not configured)${NC}"
fi

# 3. Download latest backup (if configured)
if command -v aws &> /dev/null && [ -n "$AWS_S3_BACKUP_BUCKET" ]; then
    echo -e "${YELLOW}Downloading latest backup...${NC}"
    LATEST_BACKUP=$(aws s3 ls "s3://$AWS_S3_BACKUP_BUCKET/" | grep "backup_.*\.sql\.gz" | sort -r | head -1 | awk '{print $4}')
    if [ -n "$LATEST_BACKUP" ]; then
        aws s3 cp "s3://$AWS_S3_BACKUP_BUCKET/$LATEST_BACKUP" ./latest_backup.sql.gz 2>/dev/null && echo -e "${GREEN}✓ Latest backup downloaded${NC}" || echo -e "${RED}✗ Backup download failed${NC}"
    else
        echo -e "${YELLOW}No backups found in S3${NC}"
    fi
else
    echo -e "${YELLOW}Skipping backup download (not configured)${NC}"
fi

# 4. Copy local backups (if any)
if [ -d "../backups/database" ]; then
    echo -e "${YELLOW}Copying local backups...${NC}"
    mkdir -p local_backups
    cp -r ../backups/database/* ./local_backups/ 2>/dev/null && echo -e "${GREEN}✓ Local backups copied${NC}" || echo -e "${YELLOW}No local backups found${NC}"
fi

cd ..

echo ""
echo -e "${GREEN}Export completed!${NC}"
echo "Export directory: $EXPORT_DIR"
echo ""
echo "Contents:"
ls -lh "$EXPORT_DIR"

