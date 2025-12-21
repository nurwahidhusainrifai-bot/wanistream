import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dbRun, dbGet, dbAll } from '../config/db.js';
import { createLiveBroadcast, updateBroadcast, deleteBroadcast, setBroadcastThumbnail } from '../services/youtubeService.js';
import { startStream, endStream, forceCleanup } from '../services/streamingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure directories exist
const thumbnailsDir = path.join(__dirname, '../../uploads/thumbnails');
if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Save thumbnails to thumbnails directory
        if (file.fieldname === 'thumbnail') {
            cb(null, thumbnailsDir);
        } else {
            cb(null, path.join(__dirname, '../../uploads'));
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

export const upload = multer({ storage });

// Create manual stream
export const createManualStream = async (req, res) => {
    try {
        const {
            youtubeAccountId,
            title,
            description,
            privacy,
            categoryId,
            tags,
            scheduledStart,
            scheduledEnd
        } = req.body;

        const videoFile = req.files?.video?.[0];
        const thumbnailFile = req.files?.thumbnail?.[0];

        if (!youtubeAccountId || !title || !videoFile) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get YouTube account
        const account = await dbGet(
            'SELECT * FROM youtube_accounts WHERE id = ?',
            [youtubeAccountId]
        );

        if (!account) {
            return res.status(404).json({ error: 'YouTube account not found' });
        }

        // Create YouTube broadcast
        const broadcast = await createLiveBroadcast(account, {
            title,
            description,
            privacy: privacy || 'public',
            scheduledStartTime: scheduledStart || new Date().toISOString()
        });

        // Insert stream record
        const result = await dbRun(
            `INSERT INTO streams 
       (youtube_account_id, type, status, title, description, video_path, thumbnail_path,
        privacy, category_id, tags, youtube_broadcast_id, youtube_stream_id,
        rtmp_url, stream_key, scheduled_start, scheduled_end)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                youtubeAccountId,
                'manual',
                'scheduled',
                title,
                description || null,
                videoFile.path,
                thumbnailFile?.path || null,
                privacy || 'public',
                categoryId || '20',
                tags || null,
                broadcast.id,
                broadcast.streamId,
                broadcast.rtmpUrl,
                broadcast.streamKey,
                scheduledStart || new Date().toISOString(),
                scheduledEnd || null
            ]
        );

        // Start streaming immediately if no schedule
        if (!scheduledStart || new Date(scheduledStart) <= new Date()) {
            await startStream(result.id, broadcast, videoFile.path);
        }

        res.json({
            id: result.id,
            message: 'Stream created successfully',
            broadcast
        });
    } catch (error) {
        console.error('Create manual stream error:', error);
        res.status(500).json({ error: 'Failed to create stream: ' + error.message });
    }
};

// Get active streams
export const getActiveStreams = async (req, res) => {
    try {
        const streams = await dbAll(
            `SELECT s.*, y.channel_title, y.channel_thumbnail, v.name as video_name
       FROM streams s
       LEFT JOIN youtube_accounts y ON s.youtube_account_id = y.id
       LEFT JOIN videos v ON s.video_path = v.path
       WHERE s.status = 'active'
       ORDER BY s.actual_start DESC`
        );

        // Fallback for video_name if null (extract from path)
        const processedStreams = streams.map(s => ({
            ...s,
            video_name: s.video_name || (s.video_path ? path.basename(s.video_path) : 'Unknown Video')
        }));

        res.json(processedStreams);
    } catch (error) {
        console.error('Get active streams error:', error);
        res.status(500).json({ error: 'Failed to get active streams' });
    }
};

// Get scheduled streams
export const getScheduledStreams = async (req, res) => {
    try {
        const streams = await dbAll(
            `SELECT s.*, y.channel_title, y.channel_thumbnail
       FROM streams s
       LEFT JOIN youtube_accounts y ON s.youtube_account_id = y.id
       WHERE s.status = 'scheduled'
       ORDER BY s.scheduled_start ASC`
        );

        res.json(streams);
    } catch (error) {
        console.error('Get scheduled streams error:', error);
        res.status(500).json({ error: 'Failed to get scheduled streams' });
    }
};

// Get stream history
export const getStreamHistory = async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const offset = (page - 1) * limit;

        let query = `
      SELECT s.*, y.channel_title, y.channel_thumbnail
      FROM streams s
      LEFT JOIN youtube_accounts y ON s.youtube_account_id = y.id
      WHERE s.status IN ('completed', 'failed', 'cancelled')
    `;
        const params = [];

        if (search) {
            query += ` AND s.title LIKE ?`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const streams = await dbAll(query, params);

        res.json(streams);
    } catch (error) {
        console.error('Get stream history error:', error);
        res.status(500).json({ error: 'Failed to get stream history' });
    }
};

// End stream
export const endStreamController = async (req, res) => {
    try {
        const { id } = req.params;
        const streamIdInt = parseInt(id);
        console.log(`[END STREAM] Request to end stream ID: ${id} (Parsed: ${streamIdInt})`);

        const stream = await dbGet('SELECT * FROM streams WHERE id = ?', [id]);

        if (!stream) {
            console.error(`[END STREAM] Stream ${id} not found in database`);
            return res.status(404).json({ error: 'Stream not found' });
        }

        console.log(`[END STREAM] Stream ${id} found - Status: ${stream.status}, Type: ${stream.type}`);

        if (stream.status !== 'active') {
            console.warn(`[END STREAM] Stream ${id} is not active (current status: ${stream.status})`);
            return res.status(400).json({ error: `Stream is not active (current status: ${stream.status})` });
        }

        // For ALL stream types, use the robust endStream service
        console.log(`[END STREAM] Calling endStream service with ID: ${streamIdInt}`);
        try {
            await endStream(streamIdInt);
            console.log(`[END STREAM] ✅ endStream service completed for stream ${id}`);
        } catch (err) {
            // Fallback: If service fails, force mark as completed in DB
            console.warn(`[END STREAM] endStream service failed for ${id}, forcing DB update:`, err.message);
            await dbRun(
                'UPDATE streams SET status = ?, actual_end = ? WHERE id = ?',
                ['completed', new Date().toISOString(), id]
            );
        }

        res.json({ message: 'Stream ended successfully' });
    } catch (error) {
        console.error(`[END STREAM] ❌ Critical error:`, error);
        console.error(`[END STREAM] Stack trace:`, error.stack);
        res.status(500).json({
            error: 'Failed to end stream',
            details: error.message,
            streamId: req.params.id
        });
    }
};

// Edit stream
export const editStream = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, scheduledStart, scheduledEnd } = req.body;

        const stream = await dbGet('SELECT * FROM streams WHERE id = ?', [id]);

        if (!stream) {
            return res.status(404).json({ error: 'Stream not found' });
        }

        // Update database
        await dbRun(
            `UPDATE streams 
       SET title = ?, description = ?, scheduled_start = ?, scheduled_end = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
            [title || stream.title, description || stream.description,
            scheduledStart || stream.scheduled_start, scheduledEnd || stream.scheduled_end, id]
        );

        res.json({ message: 'Stream updated successfully' });
    } catch (error) {
        console.error('Edit stream error:', error);
        res.status(500).json({ error: 'Failed to edit stream' });
    }
};

// Delete stream
export const deleteStream = async (req, res) => {
    try {
        const { id } = req.params;

        const stream = await dbGet('SELECT * FROM streams WHERE id = ?', [id]);

        if (!stream) {
            return res.status(404).json({ error: 'Stream tidak ditemukan' });
        }

        // Kill the process logic if active (using endStream from service)
        // We try catch this because if it's already dead it throws, but we still want to delete
        try {
            await endStream(id);
        } catch (e) {
            console.warn(`[DELETE STREAM] Failed to kill process for ${id} (might be already dead):`, e.message);
        }

        // Delete from database
        await dbRun('DELETE FROM streams WHERE id = ?', [id]);

        res.json({ message: 'Stream berhasil dihapus & process dimatikan' });
    } catch (error) {
        console.error('Delete stream error:', error);
        res.status(500).json({ error: 'Gagal menghapus stream' });
    }
};

// Restream (Livekan Ulang)
export const restreamController = async (req, res) => {
    try {
        const { id } = req.params;
        const { scheduledStart, scheduledEnd } = req.body;

        const originalStream = await dbGet('SELECT * FROM streams WHERE id = ?', [id]);

        if (!originalStream) {
            return res.status(404).json({ error: 'Stream not found' });
        }

        // Handle manual_key streams (no YouTube API)
        if (originalStream.type === 'manual_key') {
            // For manual_key streams, we need to get the stream key and video
            if (!originalStream.stream_key) {
                return res.status(400).json({ error: 'Stream key not found for this stream' });
            }

            // Get video from database
            const video = await dbGet('SELECT * FROM videos WHERE path = ?', [originalStream.video_path]);
            if (!video) {
                return res.status(404).json({ error: 'Video not found for this stream' });
            }

            // Create new stream record for manual key
            const result = await dbRun(
                `INSERT INTO streams 
                 (type, status, title, video_path, thumbnail_path, stream_key, 
                  scheduled_start, scheduled_end, actual_start)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    'manual_key',
                    'active',
                    originalStream.title,
                    originalStream.video_path,
                    originalStream.thumbnail_path,
                    originalStream.stream_key,
                    scheduledStart || new Date().toISOString(),
                    scheduledEnd || null,
                    new Date().toISOString()
                ]
            );

            const streamId = result.id;

            // Start FFmpeg immediately
            const rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${originalStream.stream_key}`;
            const { spawn } = await import('child_process');

            const ffmpegArgs = [
                '-re',
                '-stream_loop', '-1',
                '-i', originalStream.video_path,
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-maxrate', '3000k',
                '-bufsize', '6000k',
                '-pix_fmt', 'yuv420p',
                '-g', '50',
                '-c:a', 'aac',
                '-b:a', '128k',
                '-ar', '44100',
                '-reconnect', '1',
                '-reconnect_streamed', '1',
                '-reconnect_at_eof', '1',
                '-reconnect_delay_max', '5',
                '-f', 'flv',
                rtmpUrl
            ];

            const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

            activeManualStreams.set('current', {
                process: ffmpegProcess,
                videoId: video.id,
                streamId,
                startTime: new Date()
            });

            ffmpegProcess.stderr.on('data', (data) => {
                console.log(`[FFmpeg Restream] ${data}`);
            });

            ffmpegProcess.on('close', async (code) => {
                console.log(`FFmpeg restream exited with code ${code}`);
                activeManualStreams.delete('current');

                const streamDuration = Date.now() - new Date().getTime();
                if (streamDuration > 10000) {
                    await dbRun(
                        'UPDATE streams SET status = ?, actual_end = ? WHERE id = ?',
                        [code === 0 ? 'completed' : 'error', new Date().toISOString(), streamId]
                    );
                }
            });

            ffmpegProcess.on('error', async (error) => {
                console.error('FFmpeg restream error:', error);
                activeManualStreams.delete('current');

                await dbRun(
                    'UPDATE streams SET status = ?, actual_end = ? WHERE id = ?',
                    ['error', new Date().toISOString(), streamId]
                );
            });

            return res.json({
                id: streamId,
                message: 'Stream dimulai ulang!',
                type: 'manual_key'
            });
        }

        // For YouTube API streams, continue with existing logic
        const account = await dbGet(
            'SELECT * FROM youtube_accounts WHERE id = ?',
            [originalStream.youtube_account_id]
        );

        if (!account) {
            return res.status(404).json({ error: 'YouTube account not found' });
        }

        // Create new broadcast
        const broadcast = await createLiveBroadcast(account, {
            title: originalStream.title,
            description: originalStream.description,
            privacy: originalStream.privacy,
            scheduledStartTime: scheduledStart || new Date().toISOString()
        });

        // Create new stream record
        const result = await dbRun(
            `INSERT INTO streams 
       (youtube_account_id, type, status, title, description, video_path, thumbnail_path,
        privacy, category_id, tags, youtube_broadcast_id, youtube_stream_id,
        rtmp_url, stream_key, scheduled_start, scheduled_end)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                originalStream.youtube_account_id,
                'manual',
                'scheduled',
                originalStream.title,
                originalStream.description,
                originalStream.video_path,
                originalStream.thumbnail_path,
                originalStream.privacy,
                originalStream.category_id,
                originalStream.tags,
                broadcast.id,
                broadcast.streamId,
                broadcast.rtmpUrl,
                broadcast.streamKey,
                scheduledStart || new Date().toISOString(),
                scheduledEnd || null
            ]
        );

        // Start streaming if scheduled for now
        if (!scheduledStart || new Date(scheduledStart) <= new Date()) {
            await startStream(result.id, broadcast, originalStream.video_path);
        }

        res.json({
            id: result.id,
            message: 'Stream rescheduled successfully',
            broadcast
        });
    } catch (error) {
        console.error('Restream error:', error);
        res.status(500).json({ error: 'Failed to restream: ' + error.message });
    }
};

// Get stream stats
export const getStreamStats = async (req, res) => {
    try {
        const totalStreams = await dbGet('SELECT COUNT(*) as count FROM streams');
        const activeStreams = await dbGet('SELECT COUNT(*) as count FROM streams WHERE status = "active"');
        const completedStreams = await dbGet('SELECT COUNT(*) as count FROM streams WHERE status = "completed"');

        res.json({
            total: totalStreams.count,
            active: activeStreams.count,
            completed: completedStreams.count
        });
    } catch (error) {
        console.error('Get stream stats error:', error);
        res.status(500).json({ error: 'Failed to get stream stats' });
    }
};

// Removed redundant activeManualStreams map. Using streamingService's centralized Map instead.

// Start manual key stream (using stream key from YT Studio)
export const startManualKeyStream = async (req, res) => {
    try {
        const { streamKey, videoId, title, scheduledStart, scheduledEnd } = req.body;
        console.log(`[START MANUAL] Request to start stream - StreamKey: ${streamKey}, VideoID: ${videoId}`);

        if (!streamKey || !videoId) {
            console.error('[START MANUAL] Missing required fields: streamKey or videoId');
            return res.status(400).json({ error: 'Stream key dan video diperlukan' });
        }

        // Get video from database
        console.log(`[START MANUAL] Fetching video ${videoId} from database...`);
        const video = await dbGet('SELECT * FROM videos WHERE id = ?', [videoId]);
        if (!video) {
            console.error(`[START MANUAL] Video ${videoId} not found in database`);
            return res.status(404).json({ error: 'Video tidak ditemukan' });
        }
        console.log(`[START MANUAL] Video found: ${video.name} (${video.path})`);

        // Check if video file exists
        const fs = await import('fs');
        if (!fs.existsSync(video.path)) {
            console.error(`[START MANUAL] Video file not found at path: ${video.path}`);
            return res.status(404).json({ error: 'File video tidak ditemukan di server' });
        }
        console.log(`[START MANUAL] Video file exists, size: ${fs.statSync(video.path).size} bytes`);

        // Insert stream record into DB
        console.log('[START MANUAL] Creating stream record in database...');
        const result = await dbRun(
            `INSERT INTO streams 
             (type, status, title, video_path, thumbnail_path, stream_key, rtmp_url,
              scheduled_start, scheduled_end, actual_start)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                'manual_key',
                'active',
                title || `Manual Stream ${new Date().toLocaleString()}`,
                video.path,
                video.thumbnail_path,
                streamKey,
                'rtmps://a.rtmp.youtube.com/live2', // RTMPS (Port 443)
                scheduledStart || new Date().toISOString(),
                scheduledEnd || null,
                new Date().toISOString()
            ]
        );

        const streamId = result.id;
        console.log(`[START MANUAL] Stream record created with ID: ${streamId}`);

        // Construct Broadcast Object for Service compatibility
        const broadcast = {
            id: 'manual_' + streamId, // Placeholder ID
            rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
            streamKey: streamKey
        };

        // Start Stream using Robust Service
        console.log(`[START MANUAL] Starting FFmpeg process for stream ${streamId}...`);
        await startStream(streamId, broadcast, video.path);
        console.log(`[START MANUAL] ✅ Stream ${streamId} started successfully!`);

        res.json({
            success: true,
            message: 'Stream dimulari dengan Engine Stabil! Video sedang dikirim ke YouTube...',
            videoName: video.name,
            streamId
        });

    } catch (error) {
        console.error('[START MANUAL] ❌ Error starting manual key stream:', error);
        console.error('[START MANUAL] Stack trace:', error.stack);
        res.status(500).json({
            error: 'Gagal memulai stream',
            details: error.message,
            troubleshooting: 'Check server logs for detailed error information'
        });
    }
};

// Stop manual key stream
export const stopManualKeyStream = async (req, res) => {
    try {
        const { id } = req.body; // Can be streamId or 'current' if frontend still uses legacy

        if (!id || id === 'current') {
            // Find most recent active manual_key stream
            const activeStreamsInfo = await dbAll("SELECT id FROM streams WHERE status = 'active' AND type = 'manual_key' ORDER BY actual_start DESC LIMIT 1");
            if (activeStreamsInfo.length === 0) {
                return res.status(400).json({ error: 'Tidak ada stream manual yang sedang berjalan' });
            }
            await endStream(activeStreamsInfo[0].id);
        } else {
            await endStream(id);
        }

        res.json({
            success: true,
            message: 'Stream dihentikan'
        });

    } catch (error) {
        console.error('Stop manual key stream error:', error);
        res.status(500).json({ error: 'Gagal menghentikan stream: ' + error.message });
    }
};

// Create auto stream (using YouTube API)
export const createAutoStream = async (req, res) => {
    try {
        const { youtubeAccountId, videoId, title, description, privacy, scheduledStart, scheduledEnd, categoryId } = req.body;
        const thumbnailFile = req.file;

        if (!youtubeAccountId || !videoId || !title) {
            return res.status(400).json({ error: 'Account, video, dan judul diperlukan' });
        }

        // Get YouTube account
        const account = await dbGet('SELECT * FROM youtube_accounts WHERE id = ?', [youtubeAccountId]);
        if (!account) {
            return res.status(404).json({ error: 'YouTube account tidak ditemukan' });
        }

        // Get video
        const video = await dbGet('SELECT * FROM videos WHERE id = ?', [videoId]);
        if (!video) {
            return res.status(404).json({ error: 'Video tidak ditemukan' });
        }

        // Create broadcast via YouTube API
        const broadcast = await createLiveBroadcast(account, {
            title,
            description: description || '',
            privacy: privacy || 'public',
            scheduledStartTime: scheduledStart || new Date().toISOString(),
            categoryId: categoryId || '20' // Default to Gaming if not specified
        });

        // Set thumbnail if uploaded
        if (thumbnailFile) {
            try {
                const fs = await import('fs');
                const imageStream = fs.createReadStream(thumbnailFile.path);
                await setBroadcastThumbnail(account, broadcast.id, imageStream, thumbnailFile.mimetype);
            } catch (err) {
                console.error('Error handling thumbnail:', err);
            }
        }

        // Insert stream record
        const result = await dbRun(
            `INSERT INTO streams 
             (youtube_account_id, type, status, title, description, video_path, thumbnail_path,
              privacy, category_id, youtube_broadcast_id, youtube_stream_id, rtmp_url, stream_key, 
              scheduled_start, scheduled_end)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                youtubeAccountId,
                'auto',
                'scheduled',
                title,
                description || null,
                video.path,
                thumbnailFile ? thumbnailFile.filename : video.thumbnail_path, // Use uploaded thumbnail or video thumbnail
                privacy || 'public',
                categoryId || null,
                broadcast.id,
                broadcast.streamId,
                broadcast.rtmpUrl,
                broadcast.streamKey,
                scheduledStart || new Date().toISOString(),
                scheduledEnd || null
            ]
        );

        // Start streaming if scheduled for now or past
        if (!scheduledStart || new Date(scheduledStart) <= new Date()) {
            await startStream(result.id, broadcast, video.path);
        }

        res.json({
            id: result.id,
            message: 'Broadcast berhasil dibuat!',
            broadcast: {
                id: broadcast.id,
                rtmpUrl: broadcast.rtmpUrl
            }
        });

    } catch (error) {
        console.error('Create auto stream error:', error);
        res.status(500).json({ error: 'Gagal membuat broadcast: ' + error.message });
    }
};

// Emergency cleanup controller
export const emergencyCleanupController = async (req, res) => {
    try {
        console.log('[EMERGENCY] Starting robust cleanup...');

        // Use the centralized service function
        await forceCleanup();

        // Fallback pkill for orphaned ffmpeg
        try {
            const { exec } = await import('child_process');
            exec('pkill -9 ffmpeg');
        } catch (e) { }

        res.json({ success: true, message: 'Dashboard RESET BERHASIL. Semua stream dibersihkan!' });
    } catch (error) {
        console.error('[EMERGENCY] Cleanup failed:', error);
        res.status(500).json({ error: 'Cleanup failed', details: error.message });
    }
};
