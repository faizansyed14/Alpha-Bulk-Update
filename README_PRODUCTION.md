# Excel Bulk Update Tool - Production Setup

## Quick Start

Follow `EC2_SETUP_GUIDE.md` for complete step-by-step setup instructions.

## Quick Reference

### EC2 Instance Specs
- **Type**: t3.medium (2 vCPU, 4 GB RAM)
- **Storage**: 30 GB EBS
- **Monthly Cost**: ~$39/month

### Deployment Workflow

1. **Make changes locally**
2. **Test locally**: `docker-compose up`
3. **Commit and push**: `git push origin main`
4. **Deploy to production**:
   ```bash
   ssh -i ~/.ssh/excel-bulk-update-key.pem ubuntu@YOUR_EC2_IP "cd /opt/excel-bulk-update && ./deploy.sh"
   ```

### Important Files

- `EC2_SETUP_GUIDE.md` - Complete setup instructions
- `PRODUCTION_DEPLOYMENT.md` - Detailed production guide
- `QUICK_START_PRODUCTION.md` - Quick reference
- `LOCAL_SETUP.md` - Local development setup
- `scripts/deploy.sh` - Deployment script (run on EC2)

### Useful Commands

**On EC2:**
```bash
# Deploy
./deploy.sh

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Manual backup
docker-compose -f docker-compose.prod.yml --profile backup run --rm backup
```

**From Local Machine:**
```bash
# SSH into EC2
ssh -i ~/.ssh/excel-bulk-update-key.pem ubuntu@YOUR_EC2_IP

# Deploy from local
ssh -i ~/.ssh/excel-bulk-update-key.pem ubuntu@YOUR_EC2_IP "cd /opt/excel-bulk-update && ./deploy.sh"
```

## Documentation

- **EC2_SETUP_GUIDE.md** - Step-by-step EC2 setup
- **PRODUCTION_DEPLOYMENT.md** - Complete production guide
- **QUICK_START_PRODUCTION.md** - Quick reference guide
- **LOCAL_SETUP.md** - Local development guide

