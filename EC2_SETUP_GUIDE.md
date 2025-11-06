# Complete EC2 Setup Guide - Step by Step

## Overview

This guide will walk you through setting up your EC2 instance (t3.medium, 30GB EBS) and deploying your application using SSH and manual deployment.

---

## Prerequisites

- AWS Account
- AWS CLI installed (optional, for S3 setup)
- SSH client (built into most systems)
- Git installed locally

---

## Step 1: Create EC2 Instance (10 minutes)

**Note:** For now, we'll store everything on EC2/EBS. S3 can be added later for file storage and backups.

---

## Step 2: Create EC2 Instance (10 minutes)

### 3.1 Launch EC2 Instance

1. **Go to EC2 Console:** https://console.aws.amazon.com/ec2/
2. **Click "Launch Instance"**
3. **Configure instance:**
   - **Name:** `excel-bulk-update-production`
   - **AMI:** Ubuntu Server 22.04 LTS (Free tier eligible)
   - **Instance type:** `t3.medium` (2 vCPU, 4 GB RAM)
   - **Key pair:** Create new key pair
     - Name: `excel-bulk-update-key`
     - Key pair type: RSA
     - Private key file format: `.pem`
     - Click "Create key pair"
     - **IMPORTANT:** Download the `.pem` file and save it securely

4. **Network settings:**
   - Allow SSH traffic from: "My IP" (or "Anywhere" for testing, but change later)
   - Click "Edit" to add more rules:
     - Type: HTTP, Source: Anywhere (0.0.0.0/0)
     - Type: HTTPS, Source: Anywhere (0.0.0.0/0)

5. **Configure storage:**
   - Volume size: `30` GB
   - Volume type: `gp3` (General Purpose SSD)
   - Click "Advanced" → Enable "Delete on termination" = **NO** (to keep data if instance is terminated)

6. **Review and launch:**
   - Review settings
   - Click "Launch instance"

7. **Wait for instance to be running:**
   - Status checks should show "2/2 checks passed"
   - Note the **Public IPv4 address** (you'll need this)

---

## Step 4: Connect to EC2 Instance (5 minutes)

### 4.1 Set Up SSH Key

**On Windows:**
```powershell
# Move key to .ssh folder
mkdir $HOME\.ssh
copy excel-bulk-update-key.pem $HOME\.ssh\
cd $HOME\.ssh

# Set permissions (Windows may not need this, but try)
icacls excel-bulk-update-key.pem /inheritance:r
icacls excel-bulk-update-key.pem /grant:r "%username%:R"
```

**On Mac/Linux:**
```bash
# Move key to .ssh folder
mv excel-bulk-update-key.pem ~/.ssh/
chmod 400 ~/.ssh/excel-bulk-update-key.pem
```

### 4.2 Connect via SSH

**Replace `YOUR_EC2_IP` with your instance's public IP:**

**On Windows (PowerShell):**
```powershell
ssh -i $HOME\.ssh\excel-bulk-update-key.pem ubuntu@YOUR_EC2_IP
```

**On Mac/Linux:**
```bash
ssh -i ~/.ssh/excel-bulk-update-key.pem ubuntu@YOUR_EC2_IP
```

**First time connection:**
- Type "yes" when asked to continue connecting

---

## Step 5: Initial Server Setup (15 minutes)

### 5.1 Update System

```bash
# Update package list
sudo apt-get update

# Upgrade system
sudo apt-get upgrade -y
```

### 5.2 Install Required Software

```bash
# Install Docker (awscli is optional - only needed if you add S3 later)
sudo apt-get install -y docker.io docker-compose git curl

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group (to run docker without sudo)
sudo usermod -aG docker $USER

# Log out and log back in for group changes to take effect
exit
```

**Reconnect via SSH:**
```bash
ssh -i ~/.ssh/excel-bulk-update-key.pem ubuntu@YOUR_EC2_IP
```

### 5.3 Verify Docker Installation

```bash
# Check Docker version
docker --version
docker-compose --version

# Test Docker (should work without sudo now)
docker run hello-world
```

### 5.4 Configure Firewall

```bash
# Enable firewall
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

### 5.5 Create Application Directory

```bash
# Create directory
sudo mkdir -p /opt/excel-bulk-update
sudo chown $USER:$USER /opt/excel-bulk-update
cd /opt/excel-bulk-update
```

---

## Step 6: Clone Your Repository (5 minutes)

### 6.1 Clone Code

```bash
# Clone your repository (replace with your repo URL)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git .

# Or if using SSH:
# git clone git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git .
```

**If repository is private:**
- Set up SSH keys on EC2, or
- Use HTTPS with personal access token

### 6.2 Verify Files

```bash
# Check files are cloned
ls -la

# Should see: backend/, frontend/, docker-compose.prod.yml, etc.
```

---

## Step 7: Configure Environment Variables (10 minutes)

### 7.1 Create .env File

```bash
# Copy example file
cp .env.example .env

# Edit .env file
nano .env
```

### 7.2 Configure .env File

**Edit the following values:**

```env
# Application Configuration
APP_NAME=Excel Bulk Update Tool
APP_VERSION=1.0.0
DEBUG=False

# API Configuration
API_V1_PREFIX=/api
CORS_ORIGINS=http://YOUR_EC2_IP,http://YOUR_DOMAIN

# Security - GENERATE A STRONG SECRET KEY
SECRET_KEY=your-super-secret-key-min-32-characters-change-this

# Database Configuration
DATABASE_TYPE=postgresql

# PostgreSQL Configuration
POSTGRES_USER=excel_update_user
POSTGRES_PASSWORD=your-strong-database-password-here
POSTGRES_DB=excel_bulk_update
POSTGRESQL_URL=postgresql+asyncpg://excel_update_user:your-strong-database-password-here@postgres:5432/excel_bulk_update
POSTGRESQL_POOL_SIZE=10
POSTGRESQL_MAX_OVERFLOW=20

# AWS S3 Configuration (OPTIONAL - Leave empty for now, add later)
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=us-east-1
# AWS_S3_BUCKET=
# AWS_S3_BACKUP_BUCKET=

# File Upload Configuration
MAX_UPLOAD_SIZE=52428800
ALLOWED_EXTENSIONS=.xlsx,.xls
UPLOAD_DIR=./uploads

# Backup Configuration
BACKUP_RETENTION_DAYS=30

# Logging
LOG_LEVEL=INFO

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
```

**Important:**
- Replace `YOUR_EC2_IP` with your actual EC2 IP
- Replace `YOUR_DOMAIN` with your domain (if you have one)
- Generate a strong `SECRET_KEY` (see below)
- Use strong `POSTGRES_PASSWORD`
- **S3 fields are optional** - Leave them empty for now (everything will be stored on EBS)

### 7.3 Generate Secret Key

```bash
# Generate a secure random key
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copy the output and use it as `SECRET_KEY` in `.env`

### 7.4 Save and Exit

```bash
# In nano: Press Ctrl+X, then Y, then Enter
```

---

## Step 8: Create Required Directories (2 minutes)

```bash
# Create directories for logs, backups, uploads
mkdir -p logs backups/database backend/uploads nginx/ssl

# Set permissions
chmod 755 logs backups backend/uploads
```

---

## Step 9: Start Application (10 minutes)

### 9.1 Start Services

```bash
# Make sure you're in the project directory
cd /opt/excel-bulk-update

# Start all services
docker-compose -f docker-compose.prod.yml up -d
```

**This will:**
- Pull Docker images
- Start PostgreSQL database
- Start backend service
- Start frontend service
- Start Nginx reverse proxy

### 9.2 Wait for Services to Start

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Watch logs
docker-compose -f docker-compose.prod.yml logs -f
```

**Wait until you see:**
- All services showing "Up" status
- No errors in logs
- Database connection successful

**Press Ctrl+C to exit logs view**

### 9.3 Run Database Migrations

```bash
# Run migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

---

## Step 10: Verify Deployment (5 minutes)

### 10.1 Check Health Endpoint

```bash
# From EC2
curl http://localhost/health

# Should return: {"status":"healthy"}
```

### 10.2 Check Services

```bash
# Check all containers are running
docker-compose -f docker-compose.prod.yml ps

# Should show:
# - excel-bulk-update-backend (Up)
# - excel-bulk-update-frontend (Up)
# - excel-bulk-update-nginx (Up)
# - excel-bulk-update-postgres (Up, healthy)
```

### 10.3 Access Application

**Open in browser:**
```
http://YOUR_EC2_IP
```

**You should see:**
- Your application frontend
- Login page or main interface

---

## Step 11: Set Up Automated Backups (5 minutes)

### 11.1 Create Backup Script

```bash
# The backup script already exists, just make it executable
chmod +x scripts/backup.sh
```

### 11.2 Set Up Daily Backup (Optional)

```bash
# Create systemd service for backups
sudo nano /etc/systemd/system/excel-backup.service
```

**Add this content:**
```ini
[Unit]
Description=Excel Bulk Update Database Backup
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
User=ubuntu
WorkingDirectory=/opt/excel-bulk-update
ExecStart=/usr/bin/docker-compose -f /opt/excel-bulk-update/docker-compose.prod.yml --profile backup run --rm backup
```

**Create timer:**
```bash
sudo nano /etc/systemd/system/excel-backup.timer
```

**Add this content:**
```ini
[Unit]
Description=Run Excel Bulk Update Backup Daily
Requires=excel-backup.service

[Timer]
OnCalendar=daily
OnCalendar=04:00
Persistent=true

[Install]
WantedBy=timers.target
```

**Enable timer:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable excel-backup.timer
sudo systemctl start excel-backup.timer

# Check status
sudo systemctl status excel-backup.timer
```

---

## Step 12: Create Deployment Script (5 minutes)

### 12.1 Create Simple Deploy Script

```bash
# Create deployment script
nano /opt/excel-bulk-update/deploy.sh
```

**Add this content:**
```bash
#!/bin/bash
set -e

cd /opt/excel-bulk-update

echo "Pulling latest code..."
git pull origin main

echo "Restarting services..."
docker-compose -f docker-compose.prod.yml up -d --build

echo "Running migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend alembic upgrade head || true

echo "Checking health..."
sleep 5
curl -f http://localhost/health || echo "Warning: Health check failed"

echo "Deployment complete!"
```

**Make it executable:**
```bash
chmod +x /opt/excel-bulk-update/deploy.sh
```

---

## Step 13: Test Deployment Script

```bash
# Test the deployment script
cd /opt/excel-bulk-update
./deploy.sh
```

---

## ✅ Setup Complete!

Your application is now running on EC2!

**Everything is stored on EBS:**
- ✅ Database: PostgreSQL (Docker volume on EBS)
- ✅ Files: Local uploads directory on EBS
- ✅ Backups: Local backups directory on EBS
- ✅ Logs: Local logs directory on EBS

---

## Adding S3 Storage Later (Optional)

When you're ready to add S3 for file storage and backups:

### Step 1: Create S3 Buckets

```bash
# Create files bucket
aws s3 mb s3://excel-bulk-update-files --region us-east-1

# Create backups bucket
aws s3 mb s3://excel-bulk-update-backups --region us-east-1
```

### Step 2: Create IAM User

1. Go to IAM Console → Create user
2. Attach S3 access policy
3. Create access keys
4. Save Access Key ID and Secret Access Key

### Step 3: Update .env File

```bash
# Edit .env file
nano /opt/excel-bulk-update/.env
```

**Add S3 configuration:**
```env
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=excel-bulk-update-files
AWS_S3_BACKUP_BUCKET=excel-bulk-update-backups
```

### Step 4: Restart Services

```bash
cd /opt/excel-bulk-update
docker-compose -f docker-compose.prod.yml restart backend
```

**That's it!** S3 will now be used for:
- File uploads (Excel files)
- Database backups (automated daily backups)

---

## Daily Workflow: Making Changes and Deploying

### From Your Local Machine (Cursor):

1. **Make changes locally**
2. **Test locally:**
   ```bash
   docker-compose up
   ```

3. **Commit and push:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

4. **Deploy to production:**
   ```bash
   # SSH into EC2
   ssh -i ~/.ssh/excel-bulk-update-key.pem ubuntu@YOUR_EC2_IP
   
   # Run deployment script
   cd /opt/excel-bulk-update
   ./deploy.sh
   ```

**Or one-liner from local:**
```bash
ssh -i ~/.ssh/excel-bulk-update-key.pem ubuntu@YOUR_EC2_IP "cd /opt/excel-bulk-update && ./deploy.sh"
```

---

## Useful Commands

### Check Status
```bash
docker-compose -f docker-compose.prod.yml ps
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Restart Services
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Stop Services
```bash
docker-compose -f docker-compose.prod.yml down
```

### Start Services
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Backup
```bash
docker-compose -f docker-compose.prod.yml --profile backup run --rm backup
```

### Restore from Backup
```bash
# Restore from local backup
./scripts/restore-backup.sh ./backups/database/backup_file.sql.gz

# Or restore from S3 (if S3 is configured)
# ./scripts/restore-backup.sh s3://excel-bulk-update-backups/backup_file.sql.gz
```

---

## Troubleshooting

### Services Won't Start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check configuration
docker-compose -f docker-compose.prod.yml config
```

### Database Connection Issues
```bash
# Test database connection
docker-compose -f docker-compose.prod.yml exec postgres psql -U excel_update_user -d excel_bulk_update -c "SELECT 1;"
```

### Port Already in Use
```bash
# Find process using port
sudo lsof -i :80
sudo lsof -i :443

# Kill process if needed
sudo kill -9 <PID>
```

### Out of Disk Space
```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -af
```

---

## Security Notes

1. **Change SSH port** (optional but recommended):
   ```bash
   sudo nano /etc/ssh/sshd_config
   # Change Port 22 to Port 2222 (or another port)
   sudo systemctl restart sshd
   ```

2. **Restrict SSH access** to your IP only:
   - Edit Security Group in AWS Console
   - Change SSH rule to "My IP" only

3. **Set up SSL/HTTPS** (recommended for production):
   - Use Let's Encrypt for free SSL certificate
   - Update nginx configuration

4. **Regular updates:**
   ```bash
   sudo apt-get update && sudo apt-get upgrade -y
   ```

---

## Next Steps

1. ✅ Application is running
2. ⬜ Set up domain name (optional)
3. ⬜ Configure SSL/HTTPS (recommended)
4. ⬜ Set up monitoring (optional)
5. ⬜ Test backup/restore process

---

## Quick Reference

**EC2 Instance:**
- Type: t3.medium
- Storage: 30 GB
- Cost: ~$39/month

**Application URL:**
```
http://YOUR_EC2_IP
```

**SSH Command:**
```bash
ssh -i ~/.ssh/excel-bulk-update-key.pem ubuntu@YOUR_EC2_IP
```

**Deploy Command:**
```bash
ssh -i ~/.ssh/excel-bulk-update-key.pem ubuntu@YOUR_EC2_IP "cd /opt/excel-bulk-update && ./deploy.sh"
```

---

**Setup Complete! Your application is now running on EC2.**

