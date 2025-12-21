# WANIstream Local Installation Guide 🏠

Since you already have the code in this folder, you just need to initialize a few things to run it locally on your Windows machine.

## Prerequisites
- **Node.js**: Installed (v22 verified)
- **FFmpeg**: Installed (verified)

## Step-by-Step Setup

### 1. Initialize Backend
Open a terminal in the `server` folder and run:
```bash
cd server
npm install
npm run init-db
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the `server` folder.
> [!IMPORTANT]
> If you want to use the **YouTube Spy** or **Auto API** features, you must fill in your `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET` in the `.env` file.

### 3. Initialize Frontend
Open a terminal in the `client` folder and run:
```bash
cd client
npm install
```

### 4. Run the Application
I've provided a simple batch script to start everything at once:
1. Double-click **`start_wanistream_local.bat`** in the root folder.
2. It will open two windows (Backend & Frontend).
3. Your browser will automatically open **`http://localhost:5173`**.

## Default Login
- **Username**: `admin`
- **Password**: `admin123` (or as set in your database)
