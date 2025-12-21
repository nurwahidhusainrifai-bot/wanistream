import db, { dbRun } from '../config/db.js';

const initDatabase = async () => {
  try {
    console.log('Initializing database...');

    // Users table (admin authentication)
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Users table created');

    // YouTube accounts table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS youtube_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id TEXT UNIQUE NOT NULL,
        channel_title TEXT NOT NULL,
        channel_thumbnail TEXT,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        token_expiry DATETIME,
        is_active INTEGER DEFAULT 1,
        subscriber_count INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        video_count INTEGER DEFAULT 0,
        last_stats_update DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Migration for existing tables: Add columns if not exist
    try {
      await dbRun('ALTER TABLE youtube_accounts ADD COLUMN subscriber_count INTEGER DEFAULT 0');
      await dbRun('ALTER TABLE youtube_accounts ADD COLUMN view_count INTEGER DEFAULT 0');
      await dbRun('ALTER TABLE youtube_accounts ADD COLUMN video_count INTEGER DEFAULT 0');
      await dbRun('ALTER TABLE youtube_accounts ADD COLUMN last_stats_update DATETIME');
      console.log('✓ Stats columns added/verified');
    } catch (e) {
      // Ignore error if columns already exist
    }

    console.log('✓ YouTube accounts table created/updated');

    // Streams table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS streams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        youtube_account_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('manual', 'auto')),
        status TEXT NOT NULL CHECK(status IN ('scheduled', 'active', 'completed', 'failed', 'cancelled')),
        title TEXT NOT NULL,
        description TEXT,
        video_path TEXT,
        thumbnail_path TEXT,
        privacy TEXT DEFAULT 'public' CHECK(privacy IN ('public', 'unlisted', 'private')),
        category_id TEXT DEFAULT '20',
        tags TEXT,
        youtube_broadcast_id TEXT,
        youtube_stream_id TEXT,
        rtmp_url TEXT,
        stream_key TEXT,
        scheduled_start DATETIME,
        scheduled_end DATETIME,
        actual_start DATETIME,
        actual_end DATETIME,
        viewer_count INTEGER DEFAULT 0,
        peak_viewers INTEGER DEFAULT 0,
        total_views INTEGER DEFAULT 0,
        duration_seconds INTEGER DEFAULT 0,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (youtube_account_id) REFERENCES youtube_accounts(id)
      )
    `);
    console.log('✓ Streams table created');

    // Uploads table (VOD)
    await dbRun(`
      CREATE TABLE IF NOT EXISTS uploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        youtube_account_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        title TEXT,
        description TEXT,
        privacy TEXT DEFAULT 'private',
        publish_at DATETIME,
        youtube_video_id TEXT,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (youtube_account_id) REFERENCES youtube_accounts(id)
      )
    `);
    console.log('✓ Uploads table created');

    // Create indexes for faster queries
    await dbRun('CREATE INDEX IF NOT EXISTS idx_streams_status ON streams(status)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_streams_scheduled_start ON streams(scheduled_start)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_streams_created_at ON streams(created_at)');
    console.log('✓ Indexes created');

    console.log('\n✅ Database initialization complete!');
    db.close();
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

initDatabase();
