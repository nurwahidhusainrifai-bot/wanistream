#!/bin/bash

# Deploy cleanup scripts to VPS
echo "========================================="
echo "🚀 Deploying Stream Cleanup Scripts"
echo "========================================="

VPS_IP="46.224.60.192"
VPS_USER="root"
SERVER_DIR="~/wanistream/server"

echo ""
echo "📤 Uploading diagnostic script..."
scp diagnose_streams.js ${VPS_USER}@${VPS_IP}:${SERVER_DIR}/

echo ""
echo "📤 Uploading enhanced cleanup script..."
scp cleanup-stuck-streams.js ${VPS_USER}@${VPS_IP}:${SERVER_DIR}/

echo ""
echo "✅ Scripts deployed successfully!"
echo ""
echo "Next steps:"
echo "  1. Run diagnostic: ssh ${VPS_USER}@${VPS_IP} 'cd ${SERVER_DIR} && node diagnose_streams.js'"
echo "  2. Cleanup stuck streams: ssh ${VPS_USER}@${VPS_IP} 'cd ${SERVER_DIR} && node cleanup-stuck-streams.js'"
echo ""
