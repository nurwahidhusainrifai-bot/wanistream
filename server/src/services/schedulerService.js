import cron from 'node-cron';
import { dbAll, dbGet } from '../config/db.js';
import { startStream } from './streamingService.js';

// Run every minute to check for scheduled streams
const schedulerJob = cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();

        // Get streams scheduled to start now or in the past
        const scheduledStreams = await dbAll(
            `SELECT * FROM streams 
       WHERE status = 'scheduled' 
       AND scheduled_start <= ?
       ORDER BY scheduled_start ASC`,
            [now.toISOString()]
        );

        for (const stream of scheduledStreams) {
            console.log(`Starting scheduled stream: ${stream.title} (ID: ${stream.id})`);

            try {
                // Get YouTube account
                const account = await dbGet(
                    'SELECT * FROM youtube_accounts WHERE id = ?',
                    [stream.youtube_account_id]
                );

                if (!account) {
                    console.error(`YouTube account not found for stream ${stream.id}`);
                    continue;
                }

                // Start the stream
                const broadcast = {
                    id: stream.youtube_broadcast_id,
                    streamId: stream.youtube_stream_id,
                    rtmpUrl: stream.rtmp_url,
                    streamKey: stream.stream_key
                };

                await startStream(stream.id, broadcast, stream.video_path);

                console.log(`Stream ${stream.id} started successfully`);
            } catch (error) {
                console.error(`Failed to start stream ${stream.id}:`, error);
            }
        }
    } catch (error) {
        console.error('Scheduler error:', error);
    }
});

// Run daily at midnight to cleanup old streams (older than 30 days)
const cleanupJob = cron.schedule('0 0 * * *', async () => {
    try {
        console.log('Running daily cleanup job...');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        await dbRun(
            `DELETE FROM streams 
             WHERE status IN ('completed', 'failed', 'interrupted') 
             AND created_at < ?`,
            [thirtyDaysAgo.toISOString()]
        );

        console.log('Daily cleanup completed: Old streams removed.');
    } catch (error) {
        console.error('Cleanup job error:', error);
    }
});

export const startScheduler = () => {
    schedulerJob.start();
    cleanupJob.start();
    console.log('✓ Stream scheduler & cleanup jobs started');
};

export const stopScheduler = () => {
    schedulerJob.stop();
    cleanupJob.stop();
    console.log('Stream scheduler stopped');
};
