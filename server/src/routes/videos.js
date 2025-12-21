import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { authMiddleware } from '../middleware/auth.js';
import { dbRun, dbGet, dbAll } from '../config/db.js';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure directories exist
const videosDir = path.join(__dirname, '../../uploads/videos');
const thumbnailsDir = path.join(__dirname, '../../uploads/thumbnails');
if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
if (!fs.existsSync(thumbnailsDir)) fs.mkdirSync(thumbnailsDir, { recursive: true });

// Configure multer for video upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, videosDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only video files allowed.'));
        }
    }
});

// Generate thumbnail from video using FFmpeg
const generateThumbnail = async (videoPath, filename) => {
    const thumbnailName = filename.replace(/\.[^.]+$/, '.jpg');
    const thumbnailPath = path.join(thumbnailsDir, thumbnailName);

    try {
        // Extract frame at 1 second mark
        await execPromise(`ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" -y "${thumbnailPath}"`);
        return thumbnailPath;
    } catch (error) {
        console.error('Thumbnail generation failed:', error.message);
        return null;
    }
};

// Get video duration using FFmpeg
const getVideoDuration = async (videoPath) => {
    try {
        const { stdout } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`);
        return Math.floor(parseFloat(stdout.trim()));
    } catch (error) {
        console.error('Duration detection failed:', error.message);
        return 0;
    }
};

// Get all videos
router.get('/', authMiddleware, async (req, res) => {
    try {
        const videos = await dbAll(`SELECT * FROM videos ORDER BY created_at DESC`);
        res.json(videos);
    } catch (error) {
        console.error('Get videos error:', error);
        res.status(500).json({ error: 'Failed to get videos' });
    }
});

// Serve video thumbnail
router.get('/thumbnail/:filename', (req, res) => {
    const thumbnailPath = path.join(thumbnailsDir, req.params.filename);
    if (fs.existsSync(thumbnailPath)) {
        res.sendFile(thumbnailPath);
    } else {
        res.status(404).send('Thumbnail not found');
    }
});

// Serve video file for preview (no auth for video player compatibility)
router.get('/stream/:filename', (req, res) => {
    const videoPath = path.join(videosDir, req.params.filename);
    if (!fs.existsSync(videoPath)) {
        return res.status(404).send('Video not found');
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
    }
});

// Upload video
router.post('/upload', authMiddleware, upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file uploaded' });
        }

        const { originalname, filename, path: filePath, size, mimetype } = req.file;
        const displayName = req.body.name || originalname;
        const sizeMB = (size / (1024 * 1024)).toFixed(2);

        // Generate thumbnail
        const thumbnailPath = await generateThumbnail(filePath, filename);
        const thumbnailFilename = thumbnailPath ? path.basename(thumbnailPath) : null;

        // Get duration
        const duration = await getVideoDuration(filePath);

        const result = await dbRun(
            `INSERT INTO videos (name, original_name, filename, path, size_bytes, size_mb, mime_type, thumbnail_path, duration_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [displayName, originalname, filename, filePath, size, sizeMB, mimetype, thumbnailFilename, duration]
        );

        const video = await dbGet('SELECT * FROM videos WHERE id = ?', [result.id]);

        res.json({
            message: 'Video uploaded successfully',
            video
        });
    } catch (error) {
        console.error('Upload video error:', error);
        res.status(500).json({ error: 'Failed to upload video' });
    }
});

// Update video name
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        await dbRun(
            'UPDATE videos SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name, id]
        );

        res.json({ message: 'Video updated successfully' });
    } catch (error) {
        console.error('Update video error:', error);
        res.status(500).json({ error: 'Failed to update video' });
    }
});

// Delete video
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const video = await dbGet('SELECT * FROM videos WHERE id = ?', [id]);
        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        // Delete video file
        if (video.path && fs.existsSync(video.path)) {
            fs.unlinkSync(video.path);
        }

        // Delete thumbnail
        if (video.thumbnail_path) {
            const thumbnailPath = path.join(thumbnailsDir, video.thumbnail_path);
            if (fs.existsSync(thumbnailPath)) {
                fs.unlinkSync(thumbnailPath);
            }
        }

        await dbRun('DELETE FROM videos WHERE id = ?', [id]);

        res.json({ message: 'Video deleted successfully' });
    } catch (error) {
        console.error('Delete video error:', error);
        res.status(500).json({ error: 'Failed to delete video' });
    }
});

export default router;
