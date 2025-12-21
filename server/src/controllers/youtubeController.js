import { google } from 'googleapis';
import { dbRun, dbGet, dbAll } from '../config/db.js';
import { uploadVideo as serviceUploadVideo, getYouTubeClient } from '../services/youtubeService.js';
import path from 'path';

const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
);

export const getAuthUrl = (req, res) => {
    const scopes = [
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.force-ssl',
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly' // Added for Stats
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent' // Force to get refresh token
    });

    res.json({ url });
};

export const handleCallback = async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).send('No authorization code provided');
        }

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Get channel info
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        const channelResponse = await youtube.channels.list({
            part: 'snippet,contentDetails,statistics', // Added statistics
            mine: true
        });

        if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
            return res.status(400).send('No YouTube channel found');
        }

        const channel = channelResponse.data.items[0];
        const stats = channel.statistics; // Get stats

        // Save or update account
        const existing = await dbGet(
            'SELECT id FROM youtube_accounts WHERE channel_id = ?',
            [channel.id]
        );

        const tokenExpiry = tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : new Date(Date.now() + 3600000);

        if (existing) {
            const newRefreshToken = tokens.refresh_token || existing.refresh_token;

            await dbRun(
                `UPDATE youtube_accounts 
         SET access_token = ?, refresh_token = ?, token_expiry = ?, 
             channel_title = ?, channel_thumbnail = ?, is_active = 1,
             subscriber_count = ?, view_count = ?, video_count = ?, last_stats_update = CURRENT_TIMESTAMP
         WHERE channel_id = ?`,
                [
                    tokens.access_token,
                    newRefreshToken,
                    tokenExpiry.toISOString(),
                    channel.snippet.title,
                    channel.snippet.thumbnails.default.url,
                    stats.subscriberCount || 0,
                    stats.viewCount || 0,
                    stats.videoCount || 0,
                    channel.id
                ]
            );
        } else {
            await dbRun(
                `INSERT INTO youtube_accounts 
         (channel_id, channel_title, channel_thumbnail, access_token, refresh_token, token_expiry, subscriber_count, view_count, video_count, last_stats_update)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [
                    channel.id,
                    channel.snippet.title,
                    channel.snippet.thumbnails.default.url,
                    tokens.access_token,
                    tokens.refresh_token || null,
                    tokenExpiry.toISOString(),
                    stats.subscriberCount || 0,
                    stats.viewCount || 0,
                    stats.videoCount || 0
                ]
            );
        }

        res.send(`
      <html>
        <body>
          <h2>YouTube Account Connected Successfully!</h2>
          <p>Channel: ${channel.snippet.title}</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `);
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.status(500).send('Error connecting YouTube account: ' + error.message);
    }
};

export const getAccounts = async (req, res) => {
    try {
        const accounts = await dbAll(
            `SELECT * FROM youtube_accounts ORDER BY created_at DESC`
        );
        res.json(accounts);
    } catch (error) {
        console.error('Get accounts error:', error);
        res.status(500).json({ error: 'Failed to get accounts' });
    }
};

export const deleteAccount = async (req, res) => {
    try {
        const { id } = req.params;
        await dbRun('DELETE FROM youtube_accounts WHERE id = ?', [id]);
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
};

export const setActiveAccount = async (req, res) => {
    try {
        const { id } = req.params;
        await dbRun('UPDATE youtube_accounts SET is_active = 0');
        await dbRun('UPDATE youtube_accounts SET is_active = 1 WHERE id = ?', [id]);
        res.json({ message: 'Active account updated' });
    } catch (error) {
        console.error('Set active account error:', error);
        res.status(500).json({ error: 'Failed to set active account' });
    }
};

// --- SYNC STATS ---
export const syncStatsHandler = async (req, res) => {
    try {
        const accounts = await dbAll('SELECT * FROM youtube_accounts');
        let updatedCount = 0;

        for (const account of accounts) {
            try {
                const oauth2Client = new google.auth.OAuth2(
                    process.env.YOUTUBE_CLIENT_ID,
                    process.env.YOUTUBE_CLIENT_SECRET,
                    process.env.YOUTUBE_REDIRECT_URI
                );

                oauth2Client.setCredentials({
                    access_token: account.access_token,
                    refresh_token: account.refresh_token,
                    expiry_date: account.token_expiry ? new Date(account.token_expiry).getTime() : null
                });

                const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
                const response = await youtube.channels.list({
                    part: 'statistics',
                    mine: true
                });

                if (response.data.items && response.data.items.length > 0) {
                    const stats = response.data.items[0].statistics;
                    await dbRun(
                        `UPDATE youtube_accounts 
                         SET subscriber_count = ?, view_count = ?, video_count = ?, last_stats_update = CURRENT_TIMESTAMP 
                         WHERE id = ?`,
                        [stats.subscriberCount, stats.viewCount, stats.videoCount, account.id]
                    );
                    updatedCount++;
                }

            } catch (e) {
                console.error(`Failed to sync stats for ${account.channel_title}:`, e.message);
                // Continue to next account
            }
        }

        res.json({ message: `Synced stats for ${updatedCount} accounts` });

    } catch (error) {
        console.error('Sync Stats Error:', error);
        res.status(500).json({ error: 'Failed to sync stats' });
    }
};

// --- VIDEO UPLOAD ---
export const uploadVideoHandler = async (req, res) => {
    try {
        const { accountId, title, description, privacy, publishAt } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ error: 'No video file uploaded' });
        if (!accountId) return res.status(400).json({ error: 'Account ID required' });

        const account = await dbGet('SELECT * FROM youtube_accounts WHERE id = ?', [accountId]);
        if (!account) return res.status(404).json({ error: 'Account not found' });

        console.log(`Starting Upload: ${file.originalname} -> ${account.channel_title}`);

        const insert = await dbRun(
            'INSERT INTO uploads (youtube_account_id, file_path, title, description, privacy, publish_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [accountId, file.path, title, description, privacy, publishAt, 'uploading']
        );

        serviceUploadVideo(account, file.path, { title, description, privacy, publishAt })
            .then(async (ytRes) => {
                console.log(`✅ Upload Done: ${ytRes.id}`);
                await dbRun('UPDATE uploads SET status = "completed", youtube_video_id = ? WHERE id = ?', [ytRes.id, insert.id]);
            })
            .catch(async (err) => {
                console.error('❌ Upload Failed:', err.message);
                await dbRun('UPDATE uploads SET status = "failed", error_message = ? WHERE id = ?', [err.message, insert.id]);
            });

        res.json({ message: 'Upload started successfully', uploadId: insert.id });

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// --- YT STRATEGY ANALYZER (SPY) ---
export const analyzeYouTubeStrategy = async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return res.status(400).json({ error: 'URL is required' });

        // Extract Video ID
        let videoId = '';
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname === 'youtu.be') {
                videoId = urlObj.pathname.slice(1);
            } else if (urlObj.searchParams.has('v')) {
                videoId = urlObj.searchParams.get('v');
            } else {
                videoId = url;
            }
        } catch (e) {
            videoId = url; // assume raw ID
        }

        if (!videoId || videoId.length < 5) {
            // Last chance: Try regex
            const match = url.match(/(?:v=|\/|be\/)([a-zA-Z0-9_-]{11})/);
            if (match) videoId = match[1];
            else return res.status(400).json({ error: 'Invalid YouTube URL or ID' });
        }

        const account = await dbGet('SELECT * FROM youtube_accounts WHERE is_active = 1 LIMIT 1') ||
            await dbGet('SELECT * FROM youtube_accounts LIMIT 1');

        if (!account) return res.status(400).json({ error: 'Please connect at least one YouTube account first.' });

        const youtube = await getYouTubeClient(account.id);
        const videoRes = await youtube.videos.list({
            part: 'snippet,contentDetails,statistics',
            id: videoId
        });

        if (!videoRes.data.items?.length) return res.status(404).json({ error: 'Video not found or is private.' });

        const video = videoRes.data.items[0];
        const snippet = video.snippet;
        const hashtags = snippet.description.match(/#[a-zA-Z0-9_]+/g) || [];

        res.json({
            id: videoId,
            title: snippet.title,
            thumbnail: snippet.thumbnails.high?.url || snippet.thumbnails.default?.url,
            tags: snippet.tags || [],
            hashtags: [...new Set(hashtags)],
            publishedAt: snippet.publishedAt,
            language: snippet.defaultAudioLanguage || snippet.defaultLanguage || 'Not specified',
            category: snippet.categoryId,
            channel: {
                title: snippet.channelTitle,
                id: snippet.channelId
            },
            stats: {
                views: video.statistics.viewCount,
                likes: video.statistics.likeCount,
                comments: video.statistics.commentCount
            },
            description: snippet.description
        });
    } catch (error) {
        console.error('Spy Error:', error);
        res.status(500).json({ error: error.message });
    }
};
