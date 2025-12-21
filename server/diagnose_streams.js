import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execPromise = promisify(exec);

// Database connection
const dbPath = path.join(__dirname, 'database', 'wanistream.db');
const db = new sqlite3.Database(dbPath);
const dbAll = promisify(db.all.bind(db));

console.log('========================================');
console.log('🔍 WANISTREAM DIAGNOSTIC TOOL');
console.log('========================================\n');

async function diagnose() {
    try {
        // 1. Check database active streams
        console.log('📊 DATABASE STATUS:');
        console.log('-------------------');

        const activeStreams = await dbAll("SELECT * FROM streams WHERE status = 'active' ORDER BY id");
        console.log(`Active streams in DB: ${activeStreams.length}`);

        if (activeStreams.length > 0) {
            console.log('\nActive Stream Details:');
            activeStreams.forEach(stream => {
                console.log(`  - ID: ${stream.id} | Title: ${stream.title}`);
                console.log(`    Type: ${stream.type} | Started: ${stream.actual_start || 'N/A'}`);
                console.log(`    Video: ${stream.video_name || stream.video_path}`);
            });
        }

        // 2. Check running FFmpeg processes
        console.log('\n🎬 RUNNING FFMPEG PROCESSES:');
        console.log('----------------------------');

        try {
            const { stdout } = await execPromise('ps aux | grep "[f]fmpeg.*rtmp"');
            const processes = stdout.trim().split('\n').filter(line => line.trim());
            console.log(`Running FFmpeg processes: ${processes.length}`);

            if (processes.length > 0) {
                console.log('\nFFmpeg Process Details:');
                processes.forEach((proc, idx) => {
                    const parts = proc.split(/\s+/);
                    const pid = parts[1];
                    console.log(`  ${idx + 1}. PID: ${pid}`);
                    console.log(`     Command: ${proc.substring(0, 120)}...`);
                });
            }
        } catch (error) {
            console.log('No FFmpeg processes found (or ps command failed)');
        }

        // 3. Identify orphaned records
        console.log('\n⚠️  ORPHANED STREAMS (DB active but no FFmpeg):');
        console.log('------------------------------------------------');

        let ffmpegCount = 0;
        try {
            const { stdout } = await execPromise('ps aux | grep -c "[f]fmpeg.*rtmp"');
            ffmpegCount = parseInt(stdout.trim()) || 0;
        } catch (e) {
            ffmpegCount = 0;
        }

        const orphanedCount = activeStreams.length - ffmpegCount;
        if (orphanedCount > 0) {
            console.log(`⚠️  Found ${orphanedCount} orphaned stream(s)`);
            console.log('   These streams are marked active in DB but have no running FFmpeg process.');
            console.log('   They are blocking the dashboard and preventing new streams.');
        } else if (activeStreams.length === 0) {
            console.log('✓ No orphaned streams (database is clean)');
        } else {
            console.log('✓ All active streams have running FFmpeg processes');
        }

        // 4. Check scheduled streams
        console.log('\n📅 SCHEDULED STREAMS:');
        console.log('---------------------');
        const scheduledStreams = await dbAll("SELECT * FROM streams WHERE status = 'scheduled'");
        console.log(`Scheduled streams: ${scheduledStreams.length}`);

        // 5. Recent completed/failed streams
        console.log('\n📜 RECENT HISTORY (Last 5):');
        console.log('---------------------------');
        const recentStreams = await dbAll(
            "SELECT id, title, status, actual_start, actual_end FROM streams WHERE status IN ('completed', 'failed') ORDER BY id DESC LIMIT 5"
        );

        if (recentStreams.length > 0) {
            recentStreams.forEach(stream => {
                console.log(`  - ID: ${stream.id} | ${stream.status.toUpperCase()} | ${stream.title}`);
            });
        } else {
            console.log('  No recent history found');
        }

        // 6. Summary and recommendations
        console.log('\n========================================');
        console.log('📋 SUMMARY & RECOMMENDATIONS');
        console.log('========================================');

        if (orphanedCount > 0) {
            console.log('❌ ISSUE DETECTED: Orphaned streams found!');
            console.log('\n💡 RECOMMENDED ACTIONS:');
            console.log('   1. Run cleanup script:');
            console.log('      node cleanup-stuck-streams.js');
            console.log('   2. Restart the server:');
            console.log('      pm2 restart wanistream');
            console.log('   3. Verify dashboard shows 0 active streams');
        } else if (activeStreams.length > 0) {
            console.log('✓ All active streams are healthy (have running FFmpeg)');
        } else {
            console.log('✓ System is healthy - no active streams');
        }

        console.log('\n========================================\n');

    } catch (error) {
        console.error('❌ Diagnostic Error:', error.message);
        console.error(error);
    } finally {
        db.close();
    }
}

diagnose();
