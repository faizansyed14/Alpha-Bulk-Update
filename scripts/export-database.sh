#!/bin/bash

# Database Export Script
# Exports PostgreSQL database to CSV file

set -e

COMPOSE_FILE="docker-compose.prod.yml"
OUTPUT_FILE="export_database_$(date +%Y%m%d_%H%M%S).csv"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Exporting database to CSV...${NC}"

# Export contacts_data table
docker-compose -f $COMPOSE_FILE exec -T postgres psql -U excel_update_user -d excel_bulk_update -c "\copy (SELECT * FROM contacts_data) TO STDOUT CSV HEADER" > "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
    FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo -e "${GREEN}Database exported successfully!${NC}"
    echo "File: $OUTPUT_FILE"
    echo "Size: $FILE_SIZE"
else
    echo "Error: Database export failed!"
    exit 1
fi

