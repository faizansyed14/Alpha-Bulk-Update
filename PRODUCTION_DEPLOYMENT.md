# Production Deployment Guide

## Overview

This guide covers deploying the Excel Bulk Update Tool to AWS EC2 with production-level CI/CD, monitoring, and backup strategies.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS EC2 Instance                         │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Nginx     │  │   Frontend   │  │   Backend    │      │
│  │  (Port 80)   │  │   (React)    │  │  (FastAPI)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐                                           │
│  │  PostgreSQL  │                                           │
│  │  (Database)  │                                           │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
                    ┌─────────┴─────────┐
                    │                   │
            ┌───────▼───────┐  ┌────────▼────────┐
            │   AWS S3     │  │  GitHub Actions │
            │  (Storage &  │  │    (CI/CD)      │
            │   Backups)   │  │                 │
            └──────────────┘  └─────────────────┘
```

## Prerequisites

1. **AWS Account** with:
   - EC2 instance (Ubuntu 22.04 LTS recommended)
   - S3 buckets (one for files, one for backups)
   - IAM user with appropriate permissions
   - ECR (Elastic Container Registry) for Docker images

2. **GitHub Repository** with:
   - Main branch for production
   - GitHub Actions enabled
   - Secrets configured

3. **Domain Name** (optional but recommended for production)

## Step 1: AWS Setup

### 1.1 Create S3 Buckets

```bash
# Create bucket for file uploads
aws s3 mb s3://excel-bulk-update-files --region us-east-1

# Create bucket for database backups
aws s3 mb s3://excel-bulk-update-backups --region us-east-1

# Enable versioning on backup bucket
aws s3api put-bucket-versioning \
    --bucket excel-bulk-update-backups \
    --versioning-configuration Status=Enabled
```

### 1.2 Create IAM User for Application

1. Create IAM user with programmatic access
2. Attach policy for S3 access:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::excel-bulk-update-files/*",
                "arn:aws:s3:::excel-bulk-update-files",
                "arn:aws:s3:::excel-bulk-update-backups/*",
                "arn:aws:s3:::excel-bulk-update-backups"
            ]
        }
    ]
}
```

3. Save Access Key ID and Secret Access Key

### 1.3 Set Up EC2 Instance

1. Launch EC2 instance:
   - AMI: Ubuntu 22.04 LTS
   - Instance Type: t3.medium or larger (minimum 2GB RAM)
   - Storage: 20GB+ SSD
   - Security Group: Allow SSH (22), HTTP (80), HTTPS (443)

2. Connect to instance:
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

3. Run setup script:
```bash
sudo bash scripts/setup-ec2.sh
```

## Step 2: Application Configuration

### 2.1 Clone Repository

```bash
cd /opt/excel-bulk-update
sudo -u appuser git clone https://github.com/yourusername/excel-bulk-update.git .
```

### 2.2 Configure Environment Variables

```bash
cd /opt/excel-bulk-update
cp .env.example .env
nano .env
```

Configure these critical values:

```env
# Security
SECRET_KEY=generate-a-strong-random-key-here-min-32-chars

# Database
POSTGRES_USER=excel_update_user
POSTGRES_PASSWORD=strong-database-password-here
POSTGRES_DB=excel_bulk_update
POSTGRESQL_URL=postgresql+asyncpg://excel_update_user:password@postgres:5432/excel_bulk_update

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=excel-bulk-update-files
AWS_S3_BACKUP_BUCKET=excel-bulk-update-backups

# CORS (update with your domain)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 2.3 Generate Secret Key

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2.4 Set Proper Permissions

```bash
chown -R appuser:appuser /opt/excel-bulk-update
chmod 600 .env
```

## Step 3: Initial Deployment

### 3.1 Start Services

```bash
cd /opt/excel-bulk-update
sudo -u appuser docker-compose -f docker-compose.prod.yml up -d
```

### 3.2 Run Database Migrations

```bash
sudo -u appuser docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### 3.3 Verify Deployment

```bash
# Check services are running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Health check
curl http://localhost/health
```

## Step 4: CI/CD Setup (GitHub Actions)

### 4.1 Configure GitHub Secrets

Go to GitHub Repository → Settings → Secrets and variables → Actions

Add these secrets:

- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `EC2_HOST`: Your EC2 instance IP or domain
- `EC2_USER`: SSH user (usually `ubuntu` or `appuser`)
- `EC2_SSH_PRIVATE_KEY`: Your SSH private key for EC2

### 4.2 Create ECR Repositories

```bash
aws ecr create-repository --repository-name excel-bulk-update-backend --region us-east-1
aws ecr create-repository --repository-name excel-bulk-update-frontend --region us-east-1
```

### 4.3 Update GitHub Actions Workflow

The workflow file (`.github/workflows/deploy.yml`) is already configured. Just ensure:
- AWS region matches your setup
- ECR repository names match
- EC2 connection details are correct

## Step 5: SSL/HTTPS Setup (Recommended)

### 5.1 Using Let's Encrypt (Free)

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/excel-bulk-update/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/excel-bulk-update/nginx/ssl/key.pem
sudo chown appuser:appuser /opt/excel-bulk-update/nginx/ssl/*.pem
```

### 5.2 Update Nginx Configuration

Uncomment the HTTPS server block in `nginx/nginx.prod.conf` and update domain names.

### 5.3 Set Up Auto-Renewal

```bash
# Add to crontab
sudo crontab -e
# Add this line:
0 3 * * * certbot renew --quiet --deploy-hook "docker exec excel-bulk-update-nginx nginx -s reload"
```

## Step 6: Backup Strategy

### 6.1 Automated Database Backups

Backups run daily at 4:00 AM via systemd timer:

```bash
# Check backup timer status
sudo systemctl status excel-backup.timer

# Manually trigger backup
sudo systemctl start excel-backup.service

# View backup logs
sudo journalctl -u excel-backup.service
```

Backups are stored:
- Locally: `/opt/excel-bulk-update/backups/database/`
- S3: `s3://excel-bulk-update-backups/`

### 6.2 Manual Backup

```bash
cd /opt/excel-bulk-update
sudo -u appuser docker-compose -f docker-compose.prod.yml --profile backup run --rm backup
```

### 6.3 Restore from Backup

```bash
# Download backup from S3
aws s3 cp s3://excel-bulk-update-backups/backup_file.sql.gz ./backups/

# Extract
gunzip backups/backup_file.sql.gz

# Restore
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U excel_update_user -d excel_bulk_update < backups/backup_file.sql
```

## Step 7: Monitoring and Maintenance

### 7.1 View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f postgres

# Application logs
tail -f /opt/excel-bulk-update/logs/*.log
```

### 7.2 Health Monitoring

Health check endpoint: `http://your-domain/health`

### 7.3 Update Application

Automatic updates via GitHub Actions when code is pushed to `main` branch.

Manual update:
```bash
cd /opt/excel-bulk-update
sudo -u appuser bash scripts/deploy.sh
```

### 7.4 Maintenance Tasks

**Clean up old Docker images:**
```bash
docker system prune -af --volumes
```

**Check disk space:**
```bash
df -h
docker system df
```

**Restart services:**
```bash
cd /opt/excel-bulk-update
sudo -u appuser docker-compose -f docker-compose.prod.yml restart
```

## Step 8: Security Hardening

### 8.1 Firewall Configuration

Already configured in setup script, but verify:
```bash
sudo ufw status
```

### 8.2 Fail2Ban

Already configured, but check:
```bash
sudo fail2ban-client status
```

### 8.3 Regular Security Updates

Automatic security updates are enabled. Check status:
```bash
sudo unattended-upgrades --dry-run --debug
```

### 8.4 Database Security

- Use strong passwords
- Limit database access to application only
- Regular backups
- Consider using AWS RDS for managed database (optional)

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check configuration
docker-compose -f docker-compose.prod.yml config

# Verify .env file
cat .env
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

### Disk Space Issues

```bash
# Clean Docker
docker system prune -af --volumes

# Clean old backups
find /opt/excel-bulk-update/backups -name "*.sql.gz" -mtime +30 -delete
```

## Production Checklist

- [ ] EC2 instance created and configured
- [ ] S3 buckets created and configured
- [ ] IAM user created with proper permissions
- [ ] Environment variables configured (.env file)
- [ ] Database migrations run
- [ ] Services running and healthy
- [ ] SSL certificate installed (if using HTTPS)
- [ ] GitHub Actions configured
- [ ] Backups running automatically
- [ ] Monitoring set up
- [ ] Security hardening applied
- [ ] Domain configured (if using)
- [ ] Firewall rules configured
- [ ] Log rotation configured

## Support

For issues or questions:
1. Check logs: `docker-compose -f docker-compose.prod.yml logs`
2. Check health endpoint: `curl http://your-domain/health`
3. Review this documentation
4. Check GitHub issues

