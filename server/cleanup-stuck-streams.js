import { dbRun, dbAll } from './src/config/db.js';

// Script untuk cleanup stream yang stuck
// Jalankan dengan: node cleanup-stuck-streams.js

async function cleanupStuckStreams() {
    try {
        console.log('========================================');
        console.log('🧹 CLEANUP STUCK STREAMS');
        console.log('========================================\n');

        console.log('🔍 Checking for stuck streams...\n');

        // Get all active streams
        const activeStreams = await dbAll(
            'SELECT id, title, type, actual_start, created_at FROM streams WHERE status = "active"'
        );

        if (activeStreams.length === 0) {
            console.log('✓ No stuck streams found.');
            console.log('Database is clean!\n');
            process.exit(0);
        }

        console.log(`⚠️  Found ${activeStreams.length} stuck stream(s):\n`);
        activeStreams.forEach((s, idx) => {
            const startTime = s.actual_start ? new Date(s.actual_start).toLocaleString('id-ID') : 'Not started';
            console.log(`  ${idx + 1}. ID ${s.id}: ${s.title}`);
            console.log(`     Type: ${s.type} | Started: ${startTime}`);
        });

        console.log('\n🔧 Forcing cleanup...');

        // Force cleanup all stuck streams
        const now = new Date().toISOString();

        // Calculate duration for each stream
        for (const stream of activeStreams) {
            let durationSeconds = 0;
            if (stream.actual_start) {
                const start = new Date(stream.actual_start);
                const end = new Date();
                durationSeconds = Math.floor((end - start) / 1000);
            }

            await dbRun(
                `UPDATE streams 
                 SET status = 'completed', 
                     actual_end = ?,
                     duration_seconds = ?,
                     updated_at = ?
                 WHERE id = ?`,
                [now, durationSeconds, now, stream.id]
            );
        }

        console.log(`\n✅ Successfully cleaned up ${activeStreams.length} stuck stream(s)`);
        console.log('All streams have been marked as completed.\n');
        console.log('========================================');
        console.log('Next steps:');
        console.log('  1. Restart server: pm2 restart wanistream');
        console.log('  2. Check dashboard to verify 0 active streams');
        console.log('========================================\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error during cleanup:', error);
        process.exit(1);
    }
}

cleanupStuckStreams();
