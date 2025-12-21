#!/bin/bash

echo "======================================"
echo "🚀 Deploying WANIstream Fixes"
echo "======================================"
echo ""

VPS_IP="46.224.60.192"
VPS_USER="root"
SERVER_DIR="~/wanistream/server"
CLIENT_DIR="~/wanistream/client"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Uploading backend files...${NC}"
ssh ${VPS_USER}@${VPS_IP} "mkdir -p ${SERVER_DIR}/backup"
ssh ${VPS_USER}@${VPS_IP} "cp ${SERVER_DIR}/src/controllers/streamController.js ${SERVER_DIR}/backup/streamController.js.bak"
ssh ${VPS_USER}@${VPS_IP} "cp ${SERVER_DIR}/src/services/streamingService.js ${SERVER_DIR}/backup/streamingService.js.bak"

scp src/controllers/streamController.js ${VPS_USER}@${VPS_IP}:${SERVER_DIR}/src/controllers/
scp src/services/streamingService.js ${VPS_USER}@${VPS_IP}:${SERVER_DIR}/src/services/
scp diagnose_streams.js ${VPS_USER}@${VPS_IP}:${SERVER_DIR}/
scp cleanup-stuck-streams.js ${VPS_USER}@${VPS_IP}:${SERVER_DIR}/

echo -e "${GREEN}✓ Backend files uploaded${NC}"
echo ""

echo -e "${YELLOW}Step 2: Uploading frontend files...${NC}"
scp ../client/src/pages/Dashboard.jsx ${VPS_USER}@${VPS_IP}:${CLIENT_DIR}/src/pages/

echo -e "${GREEN}✓ Frontend files uploaded${NC}"
echo ""

echo -e "${YELLOW}Step 3: Building frontend...${NC}"
ssh ${VPS_USER}@${VPS_IP} "cd ${CLIENT_DIR} && npm run build"

echo -e "${GREEN}✓ Frontend built${NC}"
echo ""

echo -e "${YELLOW}Step 4: Restarting server...${NC}"
ssh ${VPS_USER}@${VPS_IP} "pm2 restart wanistream"

echo -e "${GREEN}✓ Server restarted${NC}"
echo ""

echo "======================================"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "======================================"
echo ""
echo "Next steps:"
echo "  1. Clear stuck streams:"
echo "     ssh ${VPS_USER}@${VPS_IP} 'cd ${SERVER_DIR} && node cleanup-stuck-streams.js'"
echo ""
echo "  2. Run diagnostics:"
echo "     ssh ${VPS_USER}@${VPS_IP} 'cd ${SERVER_DIR} && node diagnose_streams.js'"
echo ""
echo "  3. Check logs:"
echo "     ssh ${VPS_USER}@${VPS_IP} 'pm2 logs wanistream --lines 50'"
echo ""
echo "  4. Test on dashboard:"
echo "     https://46.224.60.192.nip.io"
echo ""
