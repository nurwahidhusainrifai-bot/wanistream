#!/bin/bash
# FINAL STEP: Add Copy Codec Detection to WANISTREAM
# Target: 40-50 concurrent streams @ 2-5% CPU each

echo "🚀 ADDING COPY CODEC MODE - FINAL OPTIMIZATION"
echo "=============================================="
echo ""

cd /opt/wanistream/server/src/services

# Backup
echo "📦 Backup streamingService.js..."
cp streamingService.js streamingService.js.before-copy-codec

# Step 1: Check current line count to insert at correct position
TOTAL_LINES=$(wc -l < streamingService.js)
echo "📄 Current file: $TOTAL_LINES lines"

# Step 2: Find line number where startStream is exported
EXPORT_LINE=$(grep -n "^export const startStream" streamingService.js | cut -d: -f1)
echo "📍 startStream export at line: $EXPORT_LINE"

# Step 3: Create detection function in separate file
cat > /tmp/copy_codec_function.js << 'FUNC_EOF'
/**
 * COPY CODEC DETECTION
 * Check if video can use copy codec (no re-encode needed)
 * H.264 videos <=1080p <=30fps = COPY (2-5% CPU!)
 * Others = RE-ENCODE (8-12% CPU)
 */
async function checkIfNeedsReEncode(videoPath) {
    return new Promise((resolve) => {
        const ffprobe = spawn('ffprobe', [
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=codec_name,width,height,r_frame_rate',
            '-of', 'json',
            videoPath
        ]);
        
        let output = '';
        ffprobe.stdout.on('data', (data) => output += data.toString());
        
        ffprobe.on('close', (code) => {
            if (code !== 0) {
                console.log(`[COPY-CODEC] ffprobe failed for ${videoPath}, will re-encode`);
                resolve(true);
                return;
            }
            
            try {
                const info = JSON.parse(output);
                const stream = info.streams[0];
                
                const codec = stream.codec_name;
                const width = parseInt(stream.width) || 0;
                const height = parseInt(stream.height) || 0;
                const fpsStr = stream.r_frame_rate || '30/1';
                const fps = eval(fpsStr); // e.g., "30/1" = 30
                
                // Check if can use copy codec
                const isH264 = codec === 'h264';
                const isGoodRes = width <= 1920 && height <= 1080;
                const isGoodFps = fps <= 30;
                
                const canUseCopy = isH264 && isGoodRes && isGoodFps;
                
                console.log(`[COPY-CODEC] Video: ${videoPath.split('/').pop()}`);
                console.log(`  Codec: ${codec}, Resolution: ${width}x${height}, FPS: ${fps.toFixed(1)}`);
                console.log(`  Can use COPY: ${canUseCopy ? '✅ YES (2-5% CPU!)' : '❌ NO (will re-encode 8-12% CPU)'}`);
                
                resolve(!canUseCopy); // true = needs re-encode
            } catch (e) {
                console.error(`[COPY-CODEC] Parse error: ${e.message}, will re-encode`);
                resolve(true);
            }
        });
        
        ffprobe.on('error', (err) => {
            console.error(`[COPY-CODEC] ffprobe error: ${err.message}`);
            resolve(true);
        });
        
        // Timeout after 5 seconds
        setTimeout(() => {
            try { ffprobe.kill(); } catch(e) {}
            console.warn(`[COPY-CODEC] ffprobe timeout for ${videoPath}`);
            resolve(true);
        }, 5000);
    });
}

FUNC_EOF

# Step 4: Insert function before startStream export
# Insert at line before EXPORT_LINE
INSERT_LINE=$((EXPORT_LINE - 1))

# Create new file with function inserted
head -n $INSERT_LINE streamingService.js > /tmp/streaming_new.js
cat /tmp/copy_codec_function.js >> /tmp/streaming_new.js
tail -n +$((INSERT_LINE + 1)) streamingService.js >> /tmp/streaming_new.js

# Replace original
mv /tmp/streaming_new.js streamingService.js

echo "✅ Copy codec detection function added!"
echo ""

# Step 5: Now modify startStream to use copy codec when detected
echo "🔧 Modifying startStream to use copy codec..."

# Find where FFmpeg args are built (around line with '-c:v')
# We'll add logic to check video and use copy or encode

cat > /tmp/copy_codec_logic.patch << 'PATCH_EOF'
        // CHECK IF VIDEO CAN USE COPY CODEC (SAVES 70% CPU!)
        const needsReEncode = await checkIfNeedsReEncode(videoPath);
        
        let videoCodecArgs;
        let audioCodecArgs;
        
        if (needsReEncode) {
            // RE-ENCODE MODE (8-12% CPU)
            console.log(`[STREAM ${streamId}] Using RE-ENCODE mode (8-12% CPU)`);
            videoCodecArgs = [
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-threads', '1',
                '-b:v', '1500k',
                '-maxrate', '2000k',
                '-bufsize', '4000k',
                '-g', '60',
                '-keyint_min', '60',
                '-sc_threshold', '0'
            ];
            audioCodecArgs = [
                '-c:a', 'aac',
                '-b:a', '128k',
                '-ar', '44100'
            ];
        } else {
            // COPY MODE (2-5% CPU!)
            console.log(`[STREAM ${streamId}] Using COPY CODEC mode (2-5% CPU!) 🚀`);
            videoCodecArgs = [
                '-c:v', 'copy'  // NO RE-ENCODE!
            ];
            audioCodecArgs = [
                '-c:a', 'copy'  // NO RE-ENCODE!
            ];
        }
PATCH_EOF

echo "⚠️  Manual step required: Insert copy codec logic into startStream function"
echo ""
echo "Location: streamingService.js, inside startStream function"
echo "Insert AFTER: const rtmpUrl = ..."
echo "Insert BEFORE: const ffmpegArgs = ["
echo ""
echo "Patch content saved to: /tmp/copy_codec_logic.patch"
echo ""

# Step 6: Provide manual instructions
echo "📝 MANUAL STEPS TO COMPLETE:"
echo "================================"
echo ""
echo "1. Edit streamingService.js:"
echo "   nano /opt/wanistream/server/src/services/streamingService.js"
echo ""
echo "2. Find this line (around line 45-50):"
echo "   const rtmpUrl = ..."
echo ""
echo "3. AFTER that line, INSERT the content from:"
echo "   cat /tmp/copy_codec_logic.patch"
echo ""
echo "4. REPLACE the existing '-c:v', 'libx264' section with videoCodecArgs"
echo "5. REPLACE the existing '-c:a', 'aac' section with audioCodecArgs"
echo ""
echo "OR use this AUTOMATED SCRIPT (be careful!):"
echo ""
echo "================================"
echo "AUTOMATED INSERTION (Advanced):"
echo "================================"
echo ""

cat > /tmp/auto_insert_copy_codec.sh << 'AUTO_EOF'
#!/bin/bash
cd /opt/wanistream/server/src/services

# Find line with rtmpUrl
RTMP_LINE=$(grep -n "const rtmpUrl" streamingService.js | head -1 | cut -d: -f1)
echo "Found rtmpUrl at line: $RTMP_LINE"

# Insert copy codec check after rtmpUrl (add 2 lines)
INSERT_AT=$((RTMP_LINE + 2))

# Read detection logic
DETECT_LOGIC="
        // CHECK IF VIDEO CAN USE COPY CODEC (SAVES 70% CPU!)
        const needsReEncode = await checkIfNeedsReEncode(videoPath);
        
        let videoCodecArgs;
        let audioCodecArgs;
        
        if (needsReEncode) {
            // RE-ENCODE MODE (8-12% CPU)
            console.log(\`[STREAM \${streamId}] Using RE-ENCODE mode (8-12% CPU)\`);
            videoCodecArgs = [
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-threads', '1',
                '-b:v', '1500k',
                '-maxrate', '2000k',
                '-bufsize', '4000k',
                '-g', '60'
            ];
            audioCodecArgs = ['-c:a', 'aac', '-b:a', '128k'];
        } else {
            // COPY MODE (2-5% CPU!)
            console.log(\`[STREAM \${streamId}] Using COPY CODEC mode (2-5% CPU!) 🚀\`);
            videoCodecArgs = ['-c:v', 'copy'];
            audioCodecArgs = ['-c:a', 'copy'];
        }
"

# Backup
cp streamingService.js streamingService.js.auto-backup

# Insert detection logic
head -n $INSERT_AT streamingService.js > /tmp/stream_part1.js
echo "$DETECT_LOGIC" >> /tmp/stream_part1.js
tail -n +$((INSERT_AT + 1)) streamingService.js >> /tmp/stream_part1.js
mv /tmp/stream_part1.js streamingService.js

echo "✅ Detection logic inserted!"

# Now replace hard-coded codec args with variables
sed -i "s/'-c:v', 'libx264',/...videoCodecArgs,/g" streamingService.js
sed -i "s/'-c:a', 'aac',/...audioCodecArgs,/g" streamingService.js

echo "✅ Codec args replaced with variables!"
echo "⚠️  VERIFY the changes look correct!"
AUTO_EOF

chmod +x /tmp/auto_insert_copy_codec.sh

echo "Run: bash /tmp/auto_insert_copy_codec.sh"
echo ""
echo "================================"
echo "✅ COPY CODEC FUNCTION READY!"
echo "================================"
echo ""
echo "Next: Complete manual insertion OR run auto script"
echo "Then: pm2 restart wanistream-api"
echo ""
echo "Expected: H.264 videos will use COPY mode (2-5% CPU!) 🚀"
