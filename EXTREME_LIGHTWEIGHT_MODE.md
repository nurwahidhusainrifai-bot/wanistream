# ⚡ EXTREME LIGHTWEIGHT STREAMING MODE

## 🎯 Goal: Maximize Concurrent Streams with Minimal CPU

**Target**: Dari 10-15 streams → **20-30+ streams** dengan 6 CPU cores!

---

## 🔧 Strategy: 3 Levels of Optimization

### Level 1: Lightweight Encode (Default - Currently Used)
- **CPU per stream**: ~20-30%
- **Max streams (6 cores)**: 10-15
- **Quality**: Good (2000-2500k)

### Level 2: Ultra Lightweight (Recommended)
- **CPU per stream**: ~10-15% ✅
- **Max streams (6 cores)**: 20-25 ✅
- **Quality**: Acceptable (1500k, lower preset)

### Level 3: Copy Codec (Extreme - No Re-encoding)
- **CPU per stream**: ~2-5% 🚀
- **Max streams (6 cores)**: 40-50+ 🚀
- **Quality**: Depends on source video
- **Limitation**: Video MUST be already YouTube-compatible

---

## ✅ SOLUTION: Hybrid Approach

Combine all 3 levels:
1. **Copy codec** untuk video yang sudah compatible
2. **Ultra lightweight** untuk video yang perlu encode
3. **Thread limiting** per stream

---

## 🚀 IMPLEMENTATION

### File: `server/src/services/streamingService.js`

Update FFmpeg args dengan **ultra lightweight config**:

```javascript
// Around line 50-80, replace FFmpeg args with:

// Check if video needs re-encoding
const needsReEncode = await this.checkIfNeedsReEncode(videoPath);

let ffmpegArgs;

if (!needsReEncode) {
    // LEVEL 3: COPY CODEC (Extreme lightweight!)
    console.log(`[STREAM ${streamId}] Using COPY CODEC mode (ultra lightweight)`);
    ffmpegArgs = [
        '-re',
        '-stream_loop', '-1',
        '-i', videoPath,
        
        // COPY - NO RE-ENCODING! (2-5% CPU)
        '-c:v', 'copy',
        '-c:a', 'copy',
        
        // Network resilience
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_at_eof', '1',
        '-reconnect_delay_max', '30',
        '-timeout', '30000000',
        '-rw_timeout', '30000000',
        '-err_detect', 'ignore_err',
        '-fflags', '+genpts+discardcorrupt',
        '-avoid_negative_ts', 'make_zero',
        
        '-f', 'flv',
        rtmpUrl
    ];
} else {
    // LEVEL 2: ULTRA LIGHTWEIGHT ENCODE (10-15% CPU)
    console.log(`[STREAM ${streamId}] Using ULTRA LIGHTWEIGHT encode mode`);
    
    // Get quality from ResourceManager (already dynamic)
    const qualityArgs = resourceManager.getQualityArgs(resourceCheck.recommendedQuality);
    
    ffmpegArgs = [
        '-re',
        '-stream_loop', '-1',
        '-i', videoPath,
        
        // ULTRA LIGHTWEIGHT VIDEO ENCODING
        '-c:v', 'libx264',
        '-preset', 'ultrafast',         // Fastest preset
        '-tune', 'zerolatency',
        '-threads', '1',                 // LIMIT TO 1 THREAD! ⚡
        ...qualityArgs,                  // Dynamic bitrate
        '-pix_fmt', 'yuv420p',
        '-g', '120',                     // Larger GOP = less CPU
        '-keyint_min', '120',
        '-sc_threshold', '0',
        '-profile:v', 'baseline',        // Simplest H.264 profile
        '-level', '3.0',
        '-crf', '28',                    // Higher CRF = faster encode
        
        // LIGHTWEIGHT AUDIO
        '-c:a', 'aac',
        '-b:a', '96k',                   // Lower audio bitrate
        '-ar', '44100',
        '-ac', '2',
        
        // Network resilience
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_at_eof', '1',
        '-reconnect_delay_max', '30',
        '-timeout', '30000000',
        '-rw_timeout', '30000000',
        '-err_detect', 'ignore_err',
        '-fflags', '+genpts+discardcorrupt',
        '-avoid_negative_ts', 'make_zero',
        
        '-f', 'flv',
        rtmpUrl
    ];
}
```

### Add Helper Function to Check Video Compatibility:

```javascript
// Add this function before startStream()

async checkIfNeedsReEncode(videoPath) {
    return new Promise((resolve) => {
        const { spawn } = require('child_process');
        
        // Use ffprobe to check video format
        const ffprobe = spawn('ffprobe', [
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=codec_name,width,height,r_frame_rate',
            '-of', 'json',
            videoPath
        ]);
        
        let output = '';
        ffprobe.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        ffprobe.on('close', (code) => {
            if (code !== 0) {
                resolve(true); // Assume needs re-encode if probe fails
                return;
            }
            
            try {
                const info = JSON.parse(output);
                const stream = info.streams[0];
                
                // Check if already H.264 (no re-encode needed)
                const isH264 = stream.codec_name === 'h264';
                
                // Check if resolution is reasonable (<=1080p)
                const width = parseInt(stream.width);
                const height = parseInt(stream.height);
                const isGoodRes = width <= 1920 && height <= 1080;
                
                // Check framerate (<=30fps ideal)
                const fps = eval(stream.r_frame_rate); // e.g., "30/1" = 30
                const isGoodFps = fps <= 30;
                
                // Can use copy codec if: H.264 + good res + good fps
                const canUseCopy = isH264 && isGoodRes && isGoodFps;
                
                console.log(`[VIDEO-CHECK] ${videoPath}: H264=${isH264}, Res=${width}x${height}, FPS=${fps.toFixed(1)}, CanCopy=${canUseCopy}`);
                
                resolve(!canUseCopy); // Return true if needs re-encode
                
            } catch (e) {
                console.error('[VIDEO-CHECK] Parse error:', e);
                resolve(true); // Assume needs re-encode on error
            }
        });
    });
}
```

---

## 📊 CPU Usage Comparison

| Mode | Preset | Threads | Bitrate | CPU/Stream | Max Streams (6 cores) |
|------|--------|---------|---------|------------|----------------------|
| **Copy Codec** | - | - | Source | 2-5% | **40-50** 🚀 |
| **Ultra Light** | ultrafast | 1 | 1500k | 10-15% | **20-25** ✅ |
| **Default** | ultrafast | 2 | 2500k | 20-30% | 10-15 |
| **High Quality** | fast | 2 | 3000k | 35-45% | 6-8 |

---

## 🎬 Video Preparation for Copy Codec

Untuk maximize copy codec usage, prepare video dengan:

```bash
# Convert video to YouTube-compatible format (ONCE)
ffmpeg -i input.mp4 \
  -c:v libx264 \
  -preset slow \
  -crf 20 \
  -profile:v high \
  -level 4.0 \
  -pix_fmt yuv420p \
  -r 30 \
  -s 1920x1080 \
  -c:a aac \
  -b:a 128k \
  -ar 44100 \
  output_yt_ready.mp4

# Now upload output_yt_ready.mp4
# Streaming will use COPY CODEC (2-5% CPU only!)
```

**Script Otomatis:**
```bash
#!/bin/bash
# optimize_for_streaming.sh

INPUT="$1"
OUTPUT="${INPUT%.*}_optimized.mp4"

echo "Optimizing $INPUT for lightweight streaming..."

ffmpeg -i "$INPUT" \
  -c:v libx264 \
  -preset slow \
  -crf 20 \
  -profile:v high \
  -level 4.0 \
  -pix_fmt yuv420p \
  -r 30 \
  -maxrate 3000k \
  -bufsize 6000k \
  -c:a aac \
  -b:a 128k \
  -ar 44100 \
  "$OUTPUT"

echo "Done! Upload $OUTPUT to server"
echo "This will use COPY CODEC mode (2-5% CPU)"
```

Usage:
```bash
chmod +x optimize_for_streaming.sh
./optimize_for_streaming.sh myvideo.mp4
# Upload myvideo_optimized.mp4
```

---

## ⚙️ Additional Ultra Lightweight Tweaks

### 1. ResourceManager - Lower Quality Profiles

Edit `server/src/services/resourceManager.js`:

```javascript
this.qualityProfiles = {
    high: { bitrate: '2500k', preset: 'ultrafast', bufsize: '5000k' },
    medium: { bitrate: '1800k', preset: 'ultrafast', bufsize: '3600k' },
    low: { bitrate: '1200k', preset: 'ultrafast', bufsize: '2400k' },  // Lower!
    potato: { bitrate: '800k', preset: 'ultrafast', bufsize: '1600k' }  // Even lower!
};
```

### 2. Increase Max Concurrent Streams

```javascript
// In ResourceManager constructor
// Change from:
this.maxConcurrentStreams = this.calculateMaxStreams();

// To (force higher limit):
this.maxConcurrentStreams = 25;  // Or even 30!
```

### 3. Disable Progress Logging (Save CPU)

In `streamingService.js`, comment out progress logs:

```javascript
// Remove or comment these lines in startStream():
// ffmpegProcess.stdout.on('data', ...);
// ffmpegProcess.stderr.on('data', ...);
```

### 4. Use Hardware Acceleration (If Available)

Check if VPS has GPU:
```bash
nvidia-smi  # For NVIDIA
vainfo      # For Intel/AMD
```

If yes, update FFmpeg args:
```javascript
// For NVIDIA
'-c:v', 'h264_nvenc',  // Instead of libx264
'-preset', 'p1',       // Fastest preset
'-gpu', '0',

// For Intel
'-c:v', 'h264_qsv',
'-preset', 'veryfast',
```

---

## 📈 Expected Results

### Before (Default):
- 6 CPU cores
- 10-15 concurrent streams max
- CPU per stream: 20-30%
- Total CPU: ~80-90%

### After (Ultra Lightweight):
- 6 CPU cores
- **25-30 concurrent streams** ✅
- CPU per stream: 10-15%
- Total CPU: ~75-85%

### After (Copy Codec for compatible videos):
- 6 CPU cores
- **40-50+ concurrent streams** 🚀
- CPU per stream: 2-5%
- Total CPU: ~50-70%

---

## 🧪 Testing

### Test CPU Usage:
```bash
# Start 1 stream, check CPU
htop

# Look at FFmpeg process CPU %
# Should be 10-15% (ultra light) or 2-5% (copy codec)

# Gradually add more streams
# Monitor total CPU < 90%
```

### Test Compatibility:
```bash
# Check if video uses copy codec
pm2 logs wanistream | grep "COPY CODEC"

# Should see for compatible videos:
# [STREAM X] Using COPY CODEC mode (ultra lightweight)

# For incompatible:
# [STREAM X] Using ULTRA LIGHTWEIGHT encode mode
```

---

## 💡 Best Practices

1. **Prepare videos offline**: Use `optimize_for_streaming.sh` before upload
2. **Monitor first**: Start with 15 streams, gradually increase
3. **Mix modes**: Some copy codec (0 CPU), some ultra light (10% CPU)
4. **Quality trade-off**: Lower bitrate = more streams, but lower quality
5. **Test quality**: Make sure 800k-1200k bitrate still acceptable for your use case

---

## 🎯 Configuration Summary

For **MAXIMUM concurrent streams**:

```javascript
// streamingService.js

// 1. Enable copy codec mode (edit checkIfNeedsReEncode)
// 2. Use threads: 1 (edit FFmpeg args)
// 3. Lower bitrates (edit quality profiles)
// 4. Larger GOP: 120 (edit FFmpeg args)

// resourceManager.js

// 1. Set maxConcurrentStreams = 25-30
// 2. Lower quality profiles (800k-1800k)

// ecosystem.config.js (PM2)

// 1. max_memory_restart: '600M' (lower if needed)
// 2. UV_THREADPOOL_SIZE: 2 (lower async threads)
```

---

**🚀 Result: Dengan 6 CPU bisa handle 25-30 streams (kalau pakai copy codec, bisa 40-50!)** 

Trade-off:
- ✅ 2-3x lebih banyak stream
- ⚠️ Quality sedikit lebih rendah (tapi masih bagus untuk 720p/1080p)
- ✅ CPU usage tetap stabil

**Perfect untuk mass streaming! 💪**
