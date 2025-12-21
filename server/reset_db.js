import { dbRun } from './src/config/db.js';
import { exec } from 'child_process';

const reset = async () => {
    try {
        console.log('--- WANIstream Emergency Reset ---');

        // 1. Clear Database
        console.log('1. Clearing database streams...');
        const result = await dbRun("UPDATE streams SET status='completed', actual_end=datetime('now') WHERE status='active'");
        console.log(`✓ Database cleared. Changed ${result.changes} records.`);

        // 2. Kill FFmpeg
        console.log('2. Killing all FFmpeg processes...');
        exec('pkill -9 ffmpeg', (err) => {
            if (err) {
                console.log('! No running FFmpeg found or already killed.');
            } else {
                console.log('✓ FFmpeg processes terminated.');
            }
            console.log('\n--- RESET SELESAI ---');
            console.log('Silakan restart server dengan: pm2 restart wanistream-api');
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ ERROR RESET:', error);
        process.exit(1);
    }
};

reset();
