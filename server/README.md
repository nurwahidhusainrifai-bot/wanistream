# WANISTREAM Server

Backend API server for WANISTREAM YouTube Streaming Panel.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your YouTube OAuth credentials
   ```

3. **Initialize database:**
   ```bash
   npm run init-db
   ```

4. **Create admin account:**
   ```bash
   npm run create-admin
   ```

5. **Start server:**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `GET /api/auth/me` - Get current user

### YouTube
- `GET /api/youtube/auth-url` - Get OAuth URL
- `GET /api/youtube/callback` - OAuth callback
- `GET /api/youtube/accounts` - List accounts
- `DELETE /api/youtube/accounts/:id` - Remove account
- `PUT /api/youtube/accounts/:id/active` - Set active account

### Streams
- `POST /api/streams/manual` - Create manual stream
- `GET /api/streams/active` - Get active streams
- `GET /api/streams/scheduled` - Get scheduled streams
- `GET /api/streams/history` - Get stream history
- `GET /api/streams/stats` - Get stream statistics
- `PUT /api/streams/:id/end` - End stream
- `PUT /api/streams/:id/edit` - Edit stream
- `POST /api/streams/:id/restream` - Restream (Livekan Ulang)

### System
- `GET /api/system/stats` - Get system stats (CPU, RAM, Internet)

## Environment Variables

See `.env.example` for required configuration.

## Requirements

- Node.js v18+
- FFmpeg installed on system
- YouTube Data API v3 credentials
