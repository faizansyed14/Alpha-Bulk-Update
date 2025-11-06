#!/bin/bash

# Production Deployment Script
# This script should be run on the EC2 instance

set -e

echo "Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/opt/excel-bulk-update"
COMPOSE_FILE="docker-compose.prod.yml"

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root${NC}"
   exit 1
fi

cd $PROJECT_DIR

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please copy .env.example to .env and configure it"
    exit 1
fi

# Pull latest changes
echo -e "${YELLOW}Pulling latest changes from git...${NC}"
git pull origin main || {
    echo -e "${RED}Failed to pull from git${NC}"
    exit 1
}

# Restart services
echo -e "${YELLOW}Restarting services...${NC}"
docker-compose -f $COMPOSE_FILE up -d --build --remove-orphans || {
    echo -e "${RED}Failed to start services${NC}"
    exit 1
}

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
docker-compose -f $COMPOSE_FILE exec -T backend alembic upgrade head || {
    echo -e "${YELLOW}Warning: Migration failed or already applied${NC}"
}

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 5

# Health check
echo -e "${YELLOW}Performing health check...${NC}"
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}Health check passed!${NC}"
else
    echo -e "${RED}Health check failed!${NC}"
    echo "Checking service logs..."
    docker-compose -f $COMPOSE_FILE logs --tail=50
    exit 1
fi

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo "Application is available at: http://$(hostname -I | awk '{print $1}')"

