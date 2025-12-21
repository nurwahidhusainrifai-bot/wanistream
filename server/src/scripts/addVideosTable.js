import db, { dbRun } from '../config/db.js';

const addVideosTable = async () => {
    try {
        console.log('Adding videos table...');

        // Videos table (video library)
        await dbRun(`
      CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        original_name TEXT NOT NULL,
        filename TEXT NOT NULL,
        path TEXT NOT NULL,
        size_bytes INTEGER,
        size_mb REAL,
        mime_type TEXT,
        duration_seconds INTEGER,
        thumbnail_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✓ Videos table created');

        db.close();
        console.log('\n✅ Migration complete!');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

addVideosTable();
