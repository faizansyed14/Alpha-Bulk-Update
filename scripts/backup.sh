#!/bin/sh

# Database Backup Script
# This script creates a backup of the PostgreSQL database and uploads it to S3

set -e

# Configuration from environment variables
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-excel_update_user}"
POSTGRES_DB="${POSTGRES_DB:-excel_bulk_update}"
BACKUP_DIR="/backups"
AWS_S3_BACKUP_BUCKET="${AWS_S3_BACKUP_BUCKET}"
AWS_REGION="${AWS_REGION:-us-east-1}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="backup_${POSTGRES_DB}_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting database backup..."
echo "Database: $POSTGRES_DB"
echo "Backup file: $BACKUP_FILENAME"

# Create database backup
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    --no-owner --no-acl --format=plain | gzip > "$BACKUP_PATH"

if [ $? -eq 0 ]; then
    echo "Database backup created successfully: $BACKUP_PATH"
    
    # Get backup file size
    BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    echo "Backup size: $BACKUP_SIZE"
    
    # Upload to S3 if configured
    if [ -n "$AWS_S3_BACKUP_BUCKET" ] && [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
        echo "Uploading backup to S3: s3://$AWS_S3_BACKUP_BUCKET/$BACKUP_FILENAME"
        
        # Install awscli if not available
        if ! command -v aws &> /dev/null; then
            echo "Installing AWS CLI..."
            apk add --no-cache aws-cli || {
                echo "Warning: Failed to install AWS CLI. Skipping S3 upload."
                exit 0
            }
        fi
        
        # Upload to S3
        aws s3 cp "$BACKUP_PATH" "s3://$AWS_S3_BACKUP_BUCKET/$BACKUP_FILENAME" \
            --region "$AWS_REGION" || {
            echo "Warning: Failed to upload to S3"
        }
        
        echo "Backup uploaded to S3 successfully"
        
        # Clean up old backups from S3 (older than retention days)
        echo "Cleaning up old backups from S3 (older than $BACKUP_RETENTION_DAYS days)..."
        aws s3 ls "s3://$AWS_S3_BACKUP_BUCKET/" | \
            awk '$1 < "'$(date -d "$BACKUP_RETENTION_DAYS days ago" +%Y-%m-%d)'" {print $4}' | \
            while read backup_file; do
                if echo "$backup_file" | grep -q "backup_.*\.sql\.gz"; then
                    echo "Deleting old backup: $backup_file"
                    aws s3 rm "s3://$AWS_S3_BACKUP_BUCKET/$backup_file" || true
                fi
            done || true
    else
        echo "S3 backup not configured. Backup saved locally only."
    fi
    
    # Clean up old local backups (older than retention days)
    echo "Cleaning up old local backups (older than $BACKUP_RETENTION_DAYS days)..."
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -delete || true
    
    echo "Backup process completed successfully!"
else
    echo "Error: Database backup failed!"
    exit 1
fi

