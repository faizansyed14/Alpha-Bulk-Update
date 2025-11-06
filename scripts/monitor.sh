#!/bin/bash

# System Monitoring Script
# Run this script to check system health and resource usage

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Excel Bulk Update - System Monitor  ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check Docker services
echo -e "${YELLOW}Checking Docker services...${NC}"
if command -v docker-compose &> /dev/null; then
    docker-compose ps 2>/dev/null || echo -e "${RED}Docker compose not available or services not running${NC}"
else
    echo -e "${RED}Docker compose not installed${NC}"
fi
echo ""

# Check disk space
echo -e "${YELLOW}Disk Space Usage:${NC}"
df -h | grep -E '^/dev|Filesystem'
echo ""

# Check memory usage
echo -e "${YELLOW}Memory Usage:${NC}"
free -h
echo ""

# Check CPU load
echo -e "${YELLOW}CPU Load:${NC}"
uptime
echo ""

# Check Docker disk usage
if command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker Disk Usage:${NC}"
    docker system df
    echo ""
fi

# Check application health
echo -e "${YELLOW}Application Health Check:${NC}"
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Application is healthy${NC}"
else
    echo -e "${RED}✗ Application health check failed${NC}"
fi
echo ""

# Check database connection
echo -e "${YELLOW}Database Connection:${NC}"
if command -v docker-compose &> /dev/null; then
    if docker-compose exec -T postgres pg_isready -U excel_update_user > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Database is accessible${NC}"
    else
        echo -e "${RED}✗ Database connection failed${NC}"
    fi
else
    echo -e "${YELLOW}Could not check database (docker-compose not available)${NC}"
fi
echo ""

# Check recent logs for errors
echo -e "${YELLOW}Recent Errors (last 50 lines):${NC}"
if command -v docker-compose &> /dev/null; then
    docker-compose logs --tail=50 | grep -i error | tail -10 || echo "No errors found in recent logs"
else
    echo "Could not check logs (docker-compose not available)"
fi
echo ""

# Check backup status
echo -e "${YELLOW}Backup Status:${NC}"
BACKUP_DIR="./backups/database"
if [ -d "$BACKUP_DIR" ]; then
    BACKUP_COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f | wc -l)
    echo "Local backups found: $BACKUP_COUNT"
    if [ $BACKUP_COUNT -gt 0 ]; then
        echo "Latest backup: $(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo 'N/A')"
    fi
else
    echo "Backup directory not found"
fi
echo ""

# Check S3 connectivity (if configured)
if [ -n "$AWS_S3_BACKUP_BUCKET" ]; then
    echo -e "${YELLOW}S3 Connectivity:${NC}"
    if aws s3 ls "s3://$AWS_S3_BACKUP_BUCKET" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ S3 bucket is accessible${NC}"
        S3_BACKUP_COUNT=$(aws s3 ls "s3://$AWS_S3_BACKUP_BUCKET" | grep "backup_.*\.sql\.gz" | wc -l)
        echo "S3 backups: $S3_BACKUP_COUNT"
    else
        echo -e "${RED}✗ S3 bucket not accessible${NC}"
    fi
    echo ""
fi

echo -e "${BLUE}========================================${NC}"
echo "Monitor check completed at $(date)"
echo -e "${BLUE}========================================${NC}"

