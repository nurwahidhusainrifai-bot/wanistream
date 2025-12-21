# WANIstream Emergency Cleanup Guide

If your dashboard shows "Active Streams" that aren't actually running, or you see 0 Mbps upload speed, follow these steps.

## 1. Zero Out the Dashboard (Force Reset)
Run this command in your VPS terminal (SSH) to stop all processes and clear the database:

```bash
pkill -9 ffmpeg; sqlite3 ~/wanistream/server/database/wanistream.db "UPDATE streams SET status='completed', actual_end=datetime('now') WHERE status='active';" && pm2 restart wanistream-api
```

## 2. Deploy Network Fix (IPv4 Force)
If you see "Cannot assign requested address" in logs, upload the updated `streamingService.js`:

```powershell
# Run in your Windows PowerShell
scp "C:\Users\husen\.gemini\antigravity\scratch\wanistream\server\src\services\streamingService.js" root@46.224.60.192:~/wanistream/server/src/services/
```

## 3. Verify System
After resetting, your dashboard should show **0 Active Streams**. 
- Create a new stream.
- Check logs if it fails: `tail -f ~/wanistream/server/logs/stream-*.log`
