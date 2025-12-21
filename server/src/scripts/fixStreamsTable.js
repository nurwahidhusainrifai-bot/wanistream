import { dbRun, dbAll } from '../config/db.js';

const fixStreamsTable = async () => {
    try {
        console.log('Fixing streams table schema...');

        // Get existing data
        const existingStreams = await dbAll('SELECT * FROM streams');
        console.log(`Found ${existingStreams.length} existing streams`);

        // Drop old table
        await dbRun('DROP TABLE IF EXISTS streams');
        console.log('Dropped old streams table');

        // Create new table with nullable youtube_account_id
        await dbRun(`
            CREATE TABLE streams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                youtube_account_id INTEGER,
                type TEXT NOT NULL,
                status TEXT NOT NULL,
                title TEXT,
                description TEXT,
                video_path TEXT,
                thumbnail_path TEXT,
                privacy TEXT,
                category_id TEXT,
                tags TEXT,
                youtube_broadcast_id TEXT,
                youtube_stream_id TEXT,
                rtmp_url TEXT,
                stream_key TEXT,
                scheduled_start TEXT,
                scheduled_end TEXT,
                actual_start TEXT,
                actual_end TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (youtube_account_id) REFERENCES youtube_accounts(id)
            )
        `);
        console.log('Created new streams table with nullable youtube_account_id');

        // Restore data
        for (const stream of existingStreams) {
            await dbRun(`
                INSERT INTO streams (id, youtube_account_id, type, status, title, description, video_path, 
                thumbnail_path, privacy, category_id, tags, youtube_broadcast_id, youtube_stream_id, 
                rtmp_url, stream_key, scheduled_start, scheduled_end, actual_start, actual_end, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                stream.id, stream.youtube_account_id, stream.type, stream.status, stream.title,
                stream.description, stream.video_path, stream.thumbnail_path, stream.privacy,
                stream.category_id, stream.tags, stream.youtube_broadcast_id, stream.youtube_stream_id,
                stream.rtmp_url, stream.stream_key, stream.scheduled_start, stream.scheduled_end,
                stream.actual_start, stream.actual_end, stream.created_at, stream.updated_at
            ]);
        }
        console.log(`Restored ${existingStreams.length} streams`);

        console.log('✅ Streams table fixed! youtube_account_id is now nullable.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error fixing streams table:', error);
        process.exit(1);
    }
};

fixStreamsTable();
