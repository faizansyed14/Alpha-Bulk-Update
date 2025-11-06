# Quick Start Production Setup Guide

## Step-by-Step Deployment

### Prerequisites Checklist

- [ ] AWS Account created
- [ ] EC2 instance launched (Ubuntu 22.04 LTS)
- [ ] S3 buckets created (files and backups)
- [ ] IAM user created with S3 permissions
- [ ] SSH access to EC2 instance
- [ ] Domain name (optional)

### Step 1: Initial EC2 Setup (15 minutes)

```bash
# Connect to your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Run setup script
sudo bash scripts/setup-ec2.sh

# Switch to application user
sudo su - appuser
```

### Step 2: Clone and Configure (10 minutes)

```bash
# Navigate to application directory
cd /opt/excel-bulk-update

# Clone repository (replace with your repo URL)
git clone https://github.com/yourusername/excel-bulk-update.git .

# Create environment file
cp .env.example .env
nano .env
```

**Critical Configuration Values:**

```env
# Generate a strong secret key
SECRET_KEY=<generate-strong-random-key>

# Database credentials (use strong passwords)
POSTGRES_USER=excel_update_user
POSTGRES_PASSWORD=<strong-password-here>
POSTGRES_DB=excel_bulk_update
POSTGRESQL_URL=postgresql+asyncpg://excel_update_user:<password>@postgres:5432/excel_bulk_update

# AWS S3 credentials
AWS_ACCESS_KEY_ID=<your-aws-access-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-key>
AWS_REGION=us-east-1
AWS_S3_BUCKET=excel-bulk-update-files
AWS_S3_BACKUP_BUCKET=excel-bulk-update-backups

# CORS (update with your domain or IP)
CORS_ORIGINS=https://yourdomain.com,http://your-ec2-ip
```

### Step 3: Create S3 Buckets (5 minutes)

```bash
# On your local machine (with AWS CLI configured)
aws s3 mb s3://excel-bulk-update-files --region us-east-1
aws s3 mb s3://excel-bulk-update-backups --region us-east-1

# Enable versioning on backup bucket
aws s3api put-bucket-versioning \
    --bucket excel-bulk-update-backups \
    --versioning-configuration Status=Enabled
```

### Step 4: Deploy Application (10 minutes)

```bash
# On EC2 instance
cd /opt/excel-bulk-update

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
sleep 30

# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Verify deployment
curl http://localhost/health
```

### Step 5: Configure GitHub Actions (10 minutes)

1. Go to GitHub Repository → Settings → Secrets and variables → Actions
2. Add these secrets:
   - `AWS_ACCESS_KEY_ID`: Your AWS access key
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
   - `EC2_HOST`: Your EC2 instance IP or domain
   - `EC2_USER`: `appuser` or `ubuntu`
   - `EC2_SSH_PRIVATE_KEY`: Your SSH private key content

3. Create ECR repositories:
```bash
aws ecr create-repository --repository-name excel-bulk-update-backend --region us-east-1
aws ecr create-repository --repository-name excel-bulk-update-frontend --region us-east-1
```

### Step 6: Verify (5 minutes)

```bash
# Check all services are running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Test health endpoint
curl http://your-ec2-ip/health

# Access application
# Open browser: http://your-ec2-ip
```

## Common Operations

### Update Application

```bash
# Automatic (via GitHub Actions)
# Just push to main branch

# Manual
cd /opt/excel-bulk-update
git pull
docker-compose -f docker-compose.prod.yml up -d --build
```

### Create Backup

```bash
# Automatic (daily at 4 AM)
# Check status: sudo systemctl status excel-backup.timer

# Manual
cd /opt/excel-bulk-update
docker-compose -f docker-compose.prod.yml --profile backup run --rm backup
```

### Restore from Backup

```bash
cd /opt/excel-bulk-update
./scripts/restore-backup.sh s3://excel-bulk-update-backups/backup_file.sql.gz
```

### Monitor System

```bash
cd /opt/excel-bulk-update
./scripts/monitor.sh
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f postgres
```

## Cost Optimization

### Recommended Setup (Balanced)

- **Instance**: t3.medium
- **Storage**: 30 GB EBS
- **Monthly Cost**: ~$39

### Budget Setup (Minimal)

- **Instance**: t3.small
- **Storage**: 20 GB EBS
- **Monthly Cost**: ~$18

### Performance Setup (High Traffic)

- **Instance**: t3.large
- **Storage**: 50 GB EBS
- **Monthly Cost**: ~$76

## Data Safety Checklist

### ✅ Safe Operations
- `docker-compose restart` - No data loss
- `docker-compose up -d --build` - No data loss
- `git pull && docker-compose up -d` - No data loss

### ⚠️ Dangerous Operations
- `docker-compose down -v` - Deletes volumes (database lost)
- `docker system prune -af --volumes` - Deletes everything
- EC2 instance termination - All local data lost

### 💾 Always Backup Before
- Major application updates
- Database migrations
- Infrastructure changes
- EC2 instance modifications

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
# Test connection
docker-compose -f docker-compose.prod.yml exec postgres psql -U excel_update_user -d excel_bulk_update

# Check database is running
docker-compose -f docker-compose.prod.yml ps postgres
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -af

# Clean old backups
find ./backups -name "*.sql.gz" -mtime +30 -delete
```

## Next Steps

1. **Set up SSL/HTTPS** (recommended for production)
   - Use Let's Encrypt for free SSL certificate
   - Update nginx configuration

2. **Configure Domain** (optional)
   - Point domain to EC2 instance IP
   - Update CORS_ORIGINS in .env

3. **Set up Monitoring** (optional)
   - Configure CloudWatch alerts
   - Set up uptime monitoring

4. **Regular Maintenance**
   - Monitor disk space
   - Review logs regularly
   - Test backups periodically

## Support

- Review `PRODUCTION_DEPLOYMENT.md` for detailed documentation
- Check `INFRASTRUCTURE_COSTS.md` for cost details
- Run `./scripts/monitor.sh` for system health check

