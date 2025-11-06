#!/bin/bash

# EC2 Initial Setup Script
# Run this script once on a fresh EC2 instance to set up the environment

set -e

echo "Setting up EC2 instance for Excel Bulk Update Tool..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo "Please run as root (use sudo)"
   exit 1
fi

# Update system
echo -e "${YELLOW}Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

# Install required packages
echo -e "${YELLOW}Installing required packages...${NC}"
apt-get install -y \
    git \
    docker.io \
    docker-compose \
    curl \
    awscli \
    unattended-upgrades \
    fail2ban \
    ufw

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Create application user
echo -e "${YELLOW}Creating application user...${NC}"
if ! id "appuser" &>/dev/null; then
    useradd -m -s /bin/bash appuser
    usermod -aG docker appuser
fi

# Create application directory
APP_DIR="/opt/excel-bulk-update"
echo -e "${YELLOW}Creating application directory: $APP_DIR${NC}"
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/backups
mkdir -p $APP_DIR/nginx/ssl
chown -R appuser:appuser $APP_DIR

# Configure firewall
echo -e "${YELLOW}Configuring firewall...${NC}"
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw default deny incoming
ufw default allow outgoing

# Configure fail2ban
echo -e "${YELLOW}Configuring fail2ban...${NC}"
systemctl enable fail2ban
systemctl start fail2ban

# Configure automatic security updates
echo -e "${YELLOW}Configuring automatic security updates...${NC}"
cat > /etc/apt/apt.conf.d/50unattended-upgrades <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
};
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF

# Set up log rotation
echo -e "${YELLOW}Setting up log rotation...${NC}"
cat > /etc/logrotate.d/excel-bulk-update <<EOF
$APP_DIR/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 appuser appuser
}
EOF

# Create systemd service for backups (optional - runs daily)
echo -e "${YELLOW}Setting up backup service...${NC}"
cat > /etc/systemd/system/excel-backup.service <<EOF
[Unit]
Description=Excel Bulk Update Database Backup
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
User=appuser
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/docker-compose -f $APP_DIR/docker-compose.prod.yml --profile backup run --rm backup
EOF

cat > /etc/systemd/system/excel-backup.timer <<EOF
[Unit]
Description=Run Excel Bulk Update Backup Daily
Requires=excel-backup.service

[Timer]
OnCalendar=daily
OnCalendar=04:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable excel-backup.timer

# Create health check script
echo -e "${YELLOW}Creating health check script...${NC}"
cat > /usr/local/bin/health-check.sh <<'EOF'
#!/bin/bash
curl -f http://localhost/health > /dev/null 2>&1
exit $?
EOF
chmod +x /usr/local/bin/health-check.sh

# Set up cron for health monitoring (optional)
echo -e "${YELLOW}Setting up health monitoring...${NC}"
cat > /etc/cron.d/excel-health-check <<EOF
*/5 * * * * root /usr/local/bin/health-check.sh || echo "Health check failed at \$(date)" >> /var/log/excel-health.log
EOF

echo -e "${GREEN}EC2 setup completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Clone your repository to $APP_DIR"
echo "2. Copy .env.example to .env and configure it"
echo "3. Run: cd $APP_DIR && docker-compose -f docker-compose.prod.yml up -d"
echo "4. Set up SSL certificates in $APP_DIR/nginx/ssl/"
echo ""
echo "To enable backups, run: sudo systemctl start excel-backup.timer"

