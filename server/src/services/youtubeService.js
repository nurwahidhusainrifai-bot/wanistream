import { google } from 'googleapis';
import { dbGet, dbRun } from '../config/db.js';
import fs from 'fs';

export const getYouTubeClient = async (accountId) => {
    const account = await dbGet(
        'SELECT * FROM youtube_accounts WHERE id = ?',
        [accountId]
    );

    if (!account) {
        throw new Error('YouTube account not found');
    }

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

    // Handle token refresh
    oauth2Client.on('tokens', async (tokens) => {
        if (tokens.refresh_token) {
            await dbRun(
                'UPDATE youtube_accounts SET access_token = ?, refresh_token = ? WHERE id = ?',
                [tokens.access_token, tokens.refresh_token, accountId]
            );
        } else {
            await dbRun(
                'UPDATE youtube_accounts SET access_token = ? WHERE id = ?',
                [tokens.access_token, accountId]
            );
        }
    });

    return google.youtube({ version: 'v3', auth: oauth2Client });
};

export const createLiveBroadcast = async (account, broadcastData) => {
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

        // Create LiveBroadcast
        const broadcastResponse = await youtube.liveBroadcasts.insert({
            part: 'snippet,contentDetails,status',
            requestBody: {
                snippet: {
                    title: broadcastData.title,
                    description: broadcastData.description || '',
                    scheduledStartTime: broadcastData.scheduledStartTime,
                    categoryId: broadcastData.categoryId || '20' // Default to Gaming
                },
                contentDetails: {
                    enableAutoStart: true,
                    enableAutoStop: true,
                    enableDvr: true,
                    enableContentEncryption: false,
                    enableEmbed: true,
                    recordFromStart: true
                },
                status: {
                    privacyStatus: broadcastData.privacy || 'public',
                    selfDeclaredMadeForKids: false
                }
            }
        });

        const broadcast = broadcastResponse.data;

        // Create LiveStream
        const streamResponse = await youtube.liveStreams.insert({
            part: 'snippet,cdn,contentDetails,status',
            requestBody: {
                snippet: {
                    title: `Stream for: ${broadcastData.title}`
                },
                cdn: {
                    frameRate: '30fps',
                    ingestionType: 'rtmp',
                    resolution: '1080p'
                },
                contentDetails: {
                    isReusable: false
                }
            }
        });

        const stream = streamResponse.data;

        // Bind broadcast to stream
        await youtube.liveBroadcasts.bind({
            part: 'id,contentDetails',
            id: broadcast.id,
            streamId: stream.id
        });

        return {
            id: broadcast.id,
            streamId: stream.id,
            rtmpUrl: stream.cdn.ingestionInfo.ingestionAddress,
            streamKey: stream.cdn.ingestionInfo.streamName,
            watchUrl: `https://www.youtube.com/watch?v=${broadcast.id}`
        };
    } catch (error) {
        console.error('Create broadcast error:', error);
        throw new Error(`Failed to create YouTube broadcast: ${error.message}`);
    }
};

export const updateBroadcast = async (account, broadcastId, updates) => {
    try {
        const youtube = await getYouTubeClient(account.id);

        await youtube.liveBroadcasts.update({
            part: 'snippet,status',
            requestBody: {
                id: broadcastId,
                snippet: updates.snippet,
                status: updates.status
            }
        });
    } catch (error) {
        console.error('Update broadcast error:', error);
        throw error;
    }
};

export const deleteBroadcast = async (account, broadcastId) => {
    try {
        const youtube = await getYouTubeClient(account.id);

        await youtube.liveBroadcasts.delete({
            id: broadcastId
        });
    } catch (error) {
        console.error('Delete broadcast error:', error);
        throw error;
    }
};

export const transitionBroadcast = async (account, broadcastId, status) => {
    try {
        const youtube = await getYouTubeClient(account.id);

        await youtube.liveBroadcasts.transition({
            broadcastStatus: status, // 'testing', 'live', 'complete'
            id: broadcastId,
            part: 'status'
        });
    } catch (error) {
        console.error('Transition broadcast error:', error);
        throw error;
    }
};

export const setBroadcastThumbnail = async (account, broadcastId, imageStream, mimeType) => {
    try {
        const youtube = await getYouTubeClient(account.id);

        await youtube.thumbnails.set({
            videoId: broadcastId,
            media: {
                mimeType: mimeType,
                body: imageStream
            }
        });
    } catch (error) {
        console.error('Set thumbnail error:', error);
        // Don't throw error here, just log it so stream creation doesn't fail
        // if thumbnail upload fails
    }
};

// --- VOD UPLOAD ---
export const uploadVideo = async (account, filePath, metadata) => {
    try {
        const youtube = await getYouTubeClient(account.id);

        const res = await youtube.videos.insert({
            part: 'snippet,status',
            requestBody: {
                snippet: {
                    title: metadata.title,
                    description: metadata.description || 'Uploaded via WANIstream Manager',
                    categoryId: metadata.categoryId || '22'
                },
                status: {
                    privacyStatus: metadata.privacy || 'private',
                    publishAt: metadata.publishAt || undefined, // Youtube Studio Schedule
                    selfDeclaredMadeForKids: false
                }
            },
            media: {
                body: fs.createReadStream(filePath)
            }
        });

        return res.data;
    } catch (error) {
        console.error('Upload Video Error:', error);
        throw error;
    }
};
