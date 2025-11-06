#!/bin/bash

# View Recent Activity Script
# Shows recent file uploads, snapshots, and S3 files

set -e

COMPOSE_FILE="docker-compose.prod.yml"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Recent Activity Report${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Recent File Uploads
echo -e "${YELLOW}=== Recent File Uploads ===${NC}"
docker-compose -f $COMPOSE_FILE exec -T postgres psql -U excel_update_user -d excel_bulk_update -c "SELECT id, filename, file_size, rows_processed, timestamp FROM file_uploads ORDER BY timestamp DESC LIMIT 10;" 2>/dev/null || echo "No file uploads found"
echo ""

# Recent Snapshots
echo -e "${YELLOW}=== Recent Snapshots ===${NC}"
docker-compose -f $COMPOSE_FILE exec -T postgres psql -U excel_update_user -d excel_bulk_update -c "SELECT id, snapshot_name, timestamp, rolled_back FROM bulk_update_snapshots ORDER BY timestamp DESC LIMIT 10;" 2>/dev/null || echo "No snapshots found"
echo ""

# Database Statistics
echo -e "${YELLOW}=== Database Statistics ===${NC}"
docker-compose -f $COMPOSE_FILE exec -T postgres psql -U excel_update_user -d excel_bulk_update -c "SELECT COUNT(*) as total_records FROM contacts_data;" 2>/dev/null || echo "Could not retrieve statistics"
echo ""

# Recent S3 Files (if AWS CLI is configured)
if command -v aws &> /dev/null && [ -n "$AWS_S3_BUCKET" ]; then
    echo -e "${YELLOW}=== Recent S3 Files ===${NC}"
    aws s3 ls s3://$AWS_S3_BUCKET/ --recursive --human-readable | tail -10 || echo "Could not list S3 files"
else
    echo -e "${YELLOW}=== Recent S3 Files ===${NC}"
    echo "AWS CLI not configured or bucket not set"
fi
echo ""

echo -e "${BLUE}========================================${NC}"

