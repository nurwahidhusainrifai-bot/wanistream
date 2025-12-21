import { spawn } from 'child_process';
import { dbRun, dbGet, dbAll } from '../config/db.js';
import { transitionBroadcast } from './youtubeService.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import ResourceManager from './resourceManager.js';

// Initialize Resource Manager for VPS optimization
const resourceManager = new ResourceManager();

// Store active FFmpeg processes with metadata
const activeStreams = new Map();

// Retry configuration
const MAX_RETRIES = 10;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds
const retryCounters = new Map(); // Track retry attempts per stream
const forceReEncodeMap = new Map(); // Track which streams MUST be re-encoded (fallback)

// Helper: Get Detailed Video Metadata
const getVideoMetadata = (videoPath) => {
    return new Promise((resolve) => {
        const ffprobe = spawn('ffprobe', [
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=codec_name,width,height,bit_rate',
            '-of', 'json',
            videoPath
        ]);

        let output = '';
        ffprobe.stdout.on('data', (data) => { output += data.toString(); });

        ffprobe.on('close', (code) => {
            try {
                if (code === 0) {
                    const data = JSON.parse(output);
                    const stream = data.streams[0];
                    resolve({
                        codec: stream.codec_name,
                        width: stream.width,
                        height: stream.height,
                        bitrate: stream.bit_rate ? Math.round(parseInt(stream.bit_rate) / 1000) : null
                    });
                } else {
                    resolve(null);
                }
            } catch (e) {
                resolve(null);
            }
        });

        ffprobe.on('error', () => resolve(null));
    });
};

export const startStream = async (streamId, broadcast, videoPath) => {
    try {
        const streamIdInt = parseInt(streamId);
        console.log(`[STREAM ${streamIdInt}] Starting stream...`);

        // 1. GET METADATA FIRST
        const metadata = await getVideoMetadata(videoPath);
        console.log(`[STREAM ${streamIdInt}] Source: ${metadata?.codec || 'unknown'} | ${metadata?.width}x${metadata?.height} | ${metadata?.bitrate}kbps`);

        // 2. CHECK RESOURCES
        const activeCount = activeStreams.size;
        const resourceCheck = await resourceManager.canAcceptNewStream(activeCount);

        if (!resourceCheck.canAccept) {
            console.error(`[STREAM ${streamIdInt}] ❌ Cannot start: ${resourceCheck.reason}`);
            throw new Error(`${resourceCheck.reason}. ${resourceCheck.suggestion}`);
        }

        // Update stream status to active
        await dbRun(
            `UPDATE streams SET status = 'active', actual_start = CURRENT_TIMESTAMP WHERE id = ?`,
            [streamIdInt]
        );

        const rtmpUrl = `${broadcast.rtmpUrl}/${broadcast.streamKey}`;

        // 3. SMART QUALITY LOGIC (Follow Source)
        const forceReEncode = forceReEncodeMap.get(streamIdInt) || false;

        // Decide if we can COPY
        const canCopy = !forceReEncode && metadata && metadata.codec === 'h264';

        // Decide Bitrate (Match source but cap at 3000k for high density density)
        let targetBitrate = '3000k';
        if (metadata && metadata.bitrate) {
            // Match source + 10% buffer for stability, but cap at 3000k
            const matchedBitrate = Math.min(Math.round(metadata.bitrate * 1.1), 3000);
            targetBitrate = `${matchedBitrate}k`;
        } else {
            // Default based on resource manager recommendations (capped at 3000k)
            const profile = resourceManager.qualityProfiles[resourceCheck.recommendedQuality];
            targetBitrate = Math.min(parseInt(profile.bitrate), 3000) + 'k';
        }

        console.log(`[STREAM ${streamIdInt}] Smart Mode: ${canCopy ? 'COPY 🚀' : 'FOLLOW SOURCE 🎯'} | Target: ${targetBitrate}`);

        let ffmpegArgs = [];

        if (canCopy) {
            // === LIGHTWEIGHT MODE (Video Copy) ===
            ffmpegArgs = [
                '-4', '-re', '-stream_loop', '-1', '-i', videoPath,
                '-c:v', 'copy',
                '-c:a', 'aac', '-b:a', '128k',
                '-f', 'flv',
                '-flvflags', 'no_duration_filesize',
                rtmpUrl
            ];
        } else {
            // === STABILITY MODE (Follow Source Bitrate) ===
            const preset = resourceCheck.currentLoad.cpu > 70 ? 'ultrafast' : 'veryfast';

            ffmpegArgs = [
                '-4', '-re', '-stream_loop', '-1', '-i', videoPath,
                '-c:v', 'libx264',
                '-b:v', targetBitrate,
                '-maxrate', targetBitrate,
                '-bufsize', (parseInt(targetBitrate) * 2) + 'k',
                '-preset', preset,
                '-tune', 'zerolatency',
                '-pix_fmt', 'yuv420p',
                '-g', '60', '-keyint_min', '60', '-sc_threshold', '0',
                '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
                '-err_detect', 'ignore_err', '-fflags', '+genpts+discardcorrupt',
                '-avoid_negative_ts', 'make_zero',
                '-f', 'flv',
                '-flvflags', 'no_duration_filesize',
                rtmpUrl
            ];
        }

        // Create log file
        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        const logPath = path.join(logDir, `stream-${streamId}.log`);
        const out = fs.openSync(logPath, 'a');

        console.log(`[STREAM ${streamId}] FFmpeg command: ffmpeg ${ffmpegArgs.join(' ')}`);

        // Spawn FFmpeg with proper isolation
        const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
            detached: true,
            stdio: ['ignore', out, out],
            shell: false,
            windowsHide: true
        });

        // Allow parent to exit independently
        ffmpegProcess.unref();

        const processInfo = {
            process: ffmpegProcess,
            pid: ffmpegProcess.pid,
            startTime: Date.now(),
            broadcast,
            videoPath,
            restartCount: 0,
            logPath,
            usedCopyCodec: canCopy // Track which mode we used
        };

        activeStreams.set(streamIdInt, processInfo);
        retryCounters.set(streamIdInt, 0);

        console.log(`[STREAM ${streamIdInt}] ✅ Started - PID: ${ffmpegProcess.pid}`);

        // Handle process exit
        ffmpegProcess.on('exit', (code, signal) => {
            handleStreamExit(streamId, code, signal);
        });

        ffmpegProcess.on('error', (error) => {
            console.error(`[STREAM ${streamId}] Process error:`, error);
            handleStreamError(streamId, broadcast, videoPath, error);
        });

        // Transition YouTube broadcast to live after a delay
        setTimeout(async () => {
            try {
                const stream = await dbGet('SELECT * FROM streams WHERE id = ?', [streamIdInt]);
                // Only transition if stream is still active and has a YouTube broadcast ID
                if (stream && stream.status === 'active' && stream.youtube_broadcast_id && stream.youtube_account_id) {
                    console.log(`[STREAM ${streamIdInt}] Attempting transition to live on YouTube...`);
                    const account = await dbGet('SELECT * FROM youtube_accounts WHERE id = ?', [stream.youtube_account_id]);
                    if (account) {
                        await transitionBroadcast(account, stream.youtube_broadcast_id, 'live');
                        console.log(`[STREAM ${streamIdInt}] ✅ Successfully transitioned to live on YouTube`);
                    } else {
                        console.warn(`[STREAM ${streamIdInt}] Skipping transition: YouTube account ${stream.youtube_account_id} not found`);
                    }
                } else {
                    console.log(`[STREAM ${streamIdInt}] Skipping transition: Stream not active, missing broadcast ID, or manual key stream`);
                }
            } catch (error) {
                console.error(`[STREAM ${streamIdInt}] Error transitioning to live:`, error.message);
            }
        }, 15000); // Wait 15 seconds for stream to stabilize

        return true;
    } catch (error) {
        console.error(`[STREAM ${streamId}] Start error:`, error);
        throw error;
    }
};

// Helper: Handle Stream Exit
const handleStreamExit = (streamId, code, signal) => {
    const streamIdInt = parseInt(streamId);
    if (isNaN(streamIdInt)) {
        console.error(`[STREAM] Error: Invalid stream ID on exit: ${streamId}`);
        return;
    }
    const streamInfo = activeStreams.get(streamIdInt);
    if (!streamInfo) return; // Already cleaned up

    const uptime = Math.floor((Date.now() - streamInfo.startTime) / 1000);
    console.log(`[STREAM ${streamId}] Exited - Code: ${code}, Signal: ${signal}, Uptime: ${uptime}s`);

    // Normal shutdown (SIGTERM/SIGKILL from manual stop)
    if (signal === 'SIGTERM' || signal === 'SIGKILL') {
        console.log(`[STREAM ${streamIdInt}] Normal shutdown`);
        activeStreams.delete(streamIdInt);
        retryCounters.delete(streamIdInt);
        return;
    }

    // Abnormal exit - trigger error handler
    if (code !== 0 && code !== null) {
        console.warn(`[STREAM ${streamId}] Abnormal exit - triggering auto-restart`);

        // SMART FALLBACK: If we used COPY codec and it crashed quickly (< 60s), force re-encode next time
        if (streamInfo.usedCopyCodec && uptime < 60) {
            console.warn(`[STREAM ${streamId}] ⚠️ Copy codec instability detected (Crashed in ${uptime}s). Switching to RE-ENCODE mode for stability.`);
            forceReEncodeMap.set(streamId, true);
            // Reset retry counter closer to zero to give re-encode a fair chance
            const currentRetries = retryCounters.get(streamId) || 0;
            retryCounters.set(streamId, Math.max(0, currentRetries - 2));
        }

        handleStreamError(streamId, streamInfo.broadcast, streamInfo.videoPath, new Error(`Exit code ${code}`));
    } else {
        // Normal end (shouldn't happen with -stream_loop -1, but just in case)
        console.log(`[STREAM ${streamId}] Stream ended naturally, restarting...`);
        setTimeout(() => restartStream(streamId, streamInfo.broadcast, streamInfo.videoPath), 1000);
    }
};

// Helper: Handle Stream Crash/Error with Smart Retry
const handleStreamError = (streamId, broadcast, videoPath, err) => {
    // Ignore error if stream was manually stopped (removed from map)
    const streamInfo = activeStreams.get(streamId);
    if (!streamInfo || err.message.includes('SIGTERM')) {
        return;
    }

    console.error(`[STREAM ${streamId}] Crashed:`, err.message);
    activeStreams.delete(streamId);

    // Get current retry count
    const retryCount = retryCounters.get(streamId) || 0;

    if (retryCount >= MAX_RETRIES) {
        console.error(`[STREAM ${streamId}] FAILED after ${MAX_RETRIES} retries. Marking as failed.`);
        retryCounters.delete(streamId);
        // Mark stream as failed in database
        dbRun('UPDATE streams SET status = "failed" WHERE id = ?', [streamId])
            .catch(e => console.error('Failed to update stream status:', e));
        return;
    }

    // Exponential backoff: 2s, 4s, 8s, 16s, 32s, 60s (max)
    const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, retryCount), 60000);
    console.log(`[STREAM ${streamId}] Retry ${retryCount + 1}/${MAX_RETRIES} in ${delay}ms...`);

    // Increment retry counter
    retryCounters.set(streamId, retryCount + 1);

    // Retry restart with backoff
    setTimeout(() => restartStream(streamId, broadcast, videoPath), delay);
};

// Helper: Restart Logic
const restartStream = (streamId, broadcast, videoPath) => {
    console.log(`[STREAM ${streamId}] Attempting restart...`);
    startStream(streamId, broadcast, videoPath)
        .then(() => {
            console.log(`[STREAM ${streamId}] Restarted successfully!`);
        })
        .catch(e => {
            console.error(`[STREAM ${streamId}] Restart failed:`, e.message);
            // Trigger error handler which has smart retry logic
            handleStreamError(streamId, broadcast, videoPath, e);
        });
};

export const endStream = async (streamId) => {
    try {
        const streamIdInt = parseInt(streamId);
        console.log(`[STREAM ${streamIdInt}] Ending stream...`);

        const streamInfo = activeStreams.get(streamIdInt);

        // CRITICAL: Remove from maps using correct Integer key type
        if (streamInfo) {
            activeStreams.delete(streamIdInt);
            retryCounters.delete(streamIdInt); // Clear retry counter
            console.log(`[STREAM ${streamIdInt}] Removed from active streams map`);

            // Graceful shutdown
            try {
                process.kill(streamInfo.pid, 'SIGTERM');
                console.log(`[STREAM ${streamId}] Sent SIGTERM to PID ${streamInfo.pid}`);
            } catch (e) {
                console.warn(`[STREAM ${streamId}] Error sending SIGTERM:`, e.message);
            }

            // Force kill after 2 seconds if not terminated
            setTimeout(() => {
                try {
                    process.kill(streamInfo.pid, 0); // Check if still alive
                    console.warn(`[STREAM ${streamId}] Force killing FFmpeg process`);
                    process.kill(streamInfo.pid, 'SIGKILL');
                } catch (e) {
                    // Process already dead, ignore
                }
            }, 2000);
        } else {
            console.warn(`[STREAM ${streamId}] No active FFmpeg process found (orphaned record)`);
        }

        // Get stream data
        const stream = await dbGet('SELECT * FROM streams WHERE id = ?', [streamIdInt]);

        if (!stream) {
            console.error(`[STREAM ${streamId}] Stream not found in database!`);
            throw new Error('Stream not found in database');
        }

        // Try to complete YouTube broadcast if applicable
        if (stream.youtube_broadcast_id) {
            try {
                console.log(`[STREAM ${streamId}] Transitioning YouTube broadcast to complete...`);
                const account = await dbGet('SELECT * FROM youtube_accounts WHERE id = ?', [stream.youtube_account_id]);
                if (account) {
                    await transitionBroadcast(account, stream.youtube_broadcast_id, 'complete');
                    console.log(`[STREAM ${streamId}] YouTube broadcast completed`);
                } else {
                    console.warn(`[STREAM ${streamId}] YouTube account not found, skipping broadcast transition`);
                }
            } catch (error) {
                console.error(`[STREAM ${streamId}] Error completing YouTube broadcast:`, error.message);
                // Continue to DB update even if YouTube transition fails
            }
        }

        // CRITICAL: Always update database regardless of YouTube broadcast status
        console.log(`[STREAM ${streamId}] Updating database...`);

        const startTime = stream.actual_start ? new Date(stream.actual_start) : new Date();
        const endTime = new Date();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);

        await dbRun(
            `UPDATE streams 
             SET status = 'completed', 
                 actual_end = CURRENT_TIMESTAMP, 
                 duration_seconds = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [durationSeconds, streamId]
        );

        console.log(`[STREAM ${streamId}] ✅ Database updated successfully (duration: ${durationSeconds}s)`);
        return true;
    } catch (error) {
        console.error(`[STREAM ${streamId}] ❌ End error:`, error);
        console.error(`[STREAM ${streamId}] Stack trace:`, error.stack);
        throw error;
    }
};

export const getActiveStreamProcess = (streamId) => {
    return activeStreams.get(streamId);
};

export const getAllActiveStreams = () => {
    return Array.from(activeStreams.keys());
};

export const stopAllStreams = async () => {
    console.log('Stopping all active streams...');
    const promises = [];

    for (const [id, streamInfo] of activeStreams) {
        if (streamInfo && streamInfo.pid) {
            console.log(`Killing stream ${id} (PID: ${streamInfo.pid})`);
            try {
                process.kill(streamInfo.pid, 'SIGTERM');
            } catch (e) {
                console.error(`Error killing stream ${id}:`, e);
            }
        }
        promises.push(dbRun('UPDATE streams SET status = "interrupted" WHERE id = ?', [id]));
    }

    activeStreams.clear();
    retryCounters.clear();
    await Promise.all(promises);
    console.log('All streams stopped.');
};

// Emergency function to clear EVERYTHING
export const forceCleanup = async () => {
    // 1. Kill all known pids
    for (const [id, info] of activeStreams) {
        try {
            if (info && info.pid) {
                process.kill(info.pid, 'SIGKILL');
            }
        } catch (e) { }
    }

    // 2. Clear maps
    activeStreams.clear();
    retryCounters.clear();

    // 3. Update all active streams to completed in DB
    await dbRun("UPDATE streams SET status = 'completed', actual_end = CURRENT_TIMESTAMP WHERE status = 'active'");

    return true;
};

// Health Check System - Monitor streams every 30 seconds
let healthCheckInterval = null;

export const startHealthMonitoring = () => {
    if (healthCheckInterval) {
        return; // Already running
    }

    console.log('✓ Health monitoring system started (30s interval)');

    healthCheckInterval = setInterval(async () => {
        try {
            // Only look for streams that are active and haven't failed recently
            const dbStreams = await dbAll("SELECT * FROM streams WHERE status = 'active'");

            for (const stream of dbStreams) {
                const streamIdInt = parseInt(stream.id);
                const isRunning = activeStreams.has(streamIdInt);

                if (!isRunning) {
                    // Check if we already tried to restart this recently
                    const lastRestart = retryCounters.get(streamIdInt) || 0;
                    if (lastRestart > 5) {
                        console.error(`⚠️ [Health Check] Stream ${streamIdInt} failed too many times. Marking as failed.`);
                        await dbRun("UPDATE streams SET status = 'failed' WHERE id = ?", [streamIdInt]);
                        continue;
                    }

                    console.warn(`⚠️ [Health Check] Stream ${streamIdInt} (${stream.title}) is marked active but FFmpeg is dead in memory!`);

                    // Only auto-restart if it was started recently or is 'auto' type
                    // For manual_key, we are more conservative
                    console.log(`[Health Check] Auto-restarting stream ${streamIdInt}...`);

                    // Reconstruct broadcast object
                    const broadcast = {
                        id: stream.youtube_broadcast_id,
                        streamKey: stream.stream_key,
                        rtmpUrl: (stream.rtmp_url && stream.stream_key)
                            ? stream.rtmp_url.replace('/' + stream.stream_key, '')
                            : 'rtmps://a.rtmp.youtube.com/live2'
                    };

                    retryCounters.set(streamIdInt, lastRestart + 1);

                    // Restart the dead stream
                    startStream(streamIdInt, broadcast, stream.video_path)
                        .catch(e => console.error(`[Health Check] Failed to restart stream ${streamIdInt}:`, e));
                }
            }
        } catch (error) {
            console.error('[Health Check] Error during monitoring:', error.message);
        }
    }, 60000); // Check every 60 seconds (less aggressive)
};

export const stopHealthMonitoring = () => {
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
        console.log('Health monitoring stopped');
    }
};

// Resume all active streams on server startup (IMPROVED)
export const resumeActiveStreams = async () => {
    try {
        console.log('\n========================================');
        console.log('🔄 CHECKING FOR ACTIVE STREAMS TO RESUME');
        console.log('========================================');

        // Database integrity check
        const activeStreamsDb = await dbAll("SELECT * FROM streams WHERE status = 'active'");

        if (activeStreamsDb.length === 0) {
            console.log('✓ No active streams found to resume.');
            console.log('========================================\n');
            return;
        }

        console.log(`📹 Found ${activeStreamsDb.length} active stream(s). Resuming...\n`);

        let successCount = 0;
        let failCount = 0;

        for (const stream of activeStreamsDb) {
            // Add delay between starts to prevent CPU spike
            await new Promise(resolve => setTimeout(resolve, 2000));

            try {
                // Validate required fields
                if (!stream.video_path || !stream.stream_key || !stream.rtmp_url) {
                    console.error(`❌ Stream ${stream.id} missing required fields, skipping...`);
                    failCount++;
                    continue;
                }

                // Check if video file exists
                const fs = await import('fs');
                if (!fs.existsSync(stream.video_path)) {
                    console.error(`❌ Stream ${stream.id}: Video file not found at ${stream.video_path}`);
                    // Mark as failed
                    await dbRun('UPDATE streams SET status = "failed" WHERE id = ?', [stream.id]);
                    failCount++;
                    continue;
                }

                // Re-construct broadcast object
                const broadcast = {
                    id: stream.youtube_broadcast_id,
                    streamKey: stream.stream_key,
                    rtmpUrl: (stream.rtmp_url && stream.stream_key)
                        ? stream.rtmp_url.replace('/' + stream.stream_key, '')
                        : 'rtmps://a.rtmp.youtube.com/live2'
                };

                console.log(`▶️  Resuming: ${stream.title} (ID: ${stream.id})`);

                // Start stream
                await startStream(stream.id, broadcast, stream.video_path);
                successCount++;
                console.log(`✅ Stream ${stream.id} resumed successfully\n`);

            } catch (err) {
                console.error(`❌ Failed to resume stream ${stream.id}:`, err.message);
                failCount++;
            }
        }

        console.log('========================================');
        console.log(`✅ Successfully resumed: ${successCount}/${activeStreamsDb.length}`);
        if (failCount > 0) {
            console.log(`❌ Failed to resume: ${failCount}/${activeStreamsDb.length}`);
        }
        console.log('========================================\n');

        // Start health monitoring after resume
        startHealthMonitoring();

    } catch (error) {
        console.error('❌ Error resuming active streams:', error);
    }
};
