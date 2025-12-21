import os from 'os';
import { dbGet, dbAll } from '../config/db.js';

/**
 * ResourceManager - VPS Resource Management
 * Handles resource constraints, auto-throttling, and quality adjustment
 */
class ResourceManager {
    constructor() {
        this.cpuCores = os.cpus().length;
        this.totalMemoryGB = os.totalmem() / 1024 / 1024 / 1024;

        // Dynamic limits based on system specs
        this.maxConcurrentStreams = this.calculateMaxStreams();
        this.currentLoad = 0;

        // Quality profiles for auto-adjustment
        this.qualityProfiles = {
            high: { bitrate: '6000k', preset: 'veryfast', bufsize: '12000k' },
            medium: { bitrate: '4000k', preset: 'veryfast', bufsize: '8000k' },
            low: { bitrate: '2500k', preset: 'ultrafast', bufsize: '5000k' },
            potato: { bitrate: '1500k', preset: 'ultrafast', bufsize: '3000k' }
        };

        console.log(`[RESOURCE-MANAGER] Initialized`);
        console.log(`[RESOURCE-MANAGER] CPU Cores: ${this.cpuCores}`);
        console.log(`[RESOURCE-MANAGER] Total RAM: ${this.totalMemoryGB.toFixed(1)}GB`);
        console.log(`[RESOURCE-MANAGER] Max Concurrent Streams: ${this.maxConcurrentStreams}`);
    }

    /**
     * Calculate max concurrent streams based on system resources
     */
    calculateMaxStreams() {
        // Conservative formula for VPS
        // Each stream needs ~1 CPU core (25-35% usage) and ~200-300MB RAM

        const cpuLimit = Math.floor(this.cpuCores * 1.2); // 1.2x CPU cores
        const memLimit = Math.floor((this.totalMemoryGB * 0.7) / 0.3); // 70% available RAM, 300MB per stream

        const max = Math.min(cpuLimit, memLimit);

        // Safety limits
        if (max < 3) return 3;  // Minimum 3 concurrent streams
        if (max > 20) return 20; // Maximum 20 concurrent streams

        return max;
    }

    /**
     * Get current system load
     */
    async getSystemLoad() {
        const loadAvg = os.loadavg()[0]; // 1-minute load average
        const cpuUsagePercent = (loadAvg / this.cpuCores) * 100;

        const freeMem = os.freemem();
        const totalMem = os.totalmem();
        const memUsagePercent = ((totalMem - freeMem) / totalMem) * 100;

        return {
            cpu: Math.round(cpuUsagePercent),
            memory: Math.round(memUsagePercent),
            loadAvg: loadAvg.toFixed(2),
            freeMem: Math.round(freeMem / 1024 / 1024), // MB
            isOverloaded: cpuUsagePercent > 80 || memUsagePercent > 85
        };
    }

    /**
     * Get recommended quality profile based on current load
     */
    async getRecommendedQuality(activeStreamCount) {
        const load = await this.getSystemLoad();

        // If system is overloaded, use lower quality
        if (load.isOverloaded) {
            console.warn(`[RESOURCE-MANAGER] System overloaded! CPU: ${load.cpu}%, Memory: ${load.memory}%`);
            return 'potato';
        }

        // Adjust quality based on concurrent stream count
        if (activeStreamCount >= this.maxConcurrentStreams * 0.8) {
            return 'low';
        } else if (activeStreamCount >= this.maxConcurrentStreams * 0.5) {
            return 'medium';
        } else {
            return 'high';
        }
    }

    /**
     * Get FFmpeg args for specific quality profile
     */
    getQualityArgs(profile) {
        const settings = this.qualityProfiles[profile] || this.qualityProfiles.medium;

        return [
            '-b:v', settings.bitrate,
            '-maxrate', settings.bitrate,
            '-bufsize', settings.bufsize,
            '-preset', settings.preset
        ];
    }

    /**
     * Check if system can accept new stream
     */
    async canAcceptNewStream(activeStreamCount) {
        // Check stream limit
        if (activeStreamCount >= this.maxConcurrentStreams) {
            console.warn(`[RESOURCE-MANAGER] Max streams reached (${activeStreamCount}/${this.maxConcurrentStreams})`);
            return {
                canAccept: false,
                reason: 'Max concurrent streams limit reached',
                suggestion: 'Please wait for an existing stream to finish'
            };
        }

        // Check system load
        const load = await this.getSystemLoad();

        // Critical levels - reject new streams
        if (load.cpu > 90 || load.memory > 90 || load.freeMem < 200) {
            console.error(`[RESOURCE-MANAGER] Critical load! CPU: ${load.cpu}%, Mem: ${load.memory}%, Free: ${load.freeMem}MB`);
            return {
                canAccept: false,
                reason: 'System resources critically low',
                suggestion: 'System is overloaded, please stop some streams first'
            };
        }

        return {
            canAccept: true,
            recommendedQuality: await this.getRecommendedQuality(activeStreamCount),
            currentLoad: load
        };
    }

    /**
     * Monitor and log system health
     */
    async logSystemHealth(activeStreamCount) {
        const load = await this.getSystemLoad();

        console.log(`[RESOURCE-MANAGER] Health Check:`);
        console.log(`  Active Streams: ${activeStreamCount}/${this.maxConcurrentStreams}`);
        console.log(`  CPU: ${load.cpu}% | Load Avg: ${load.loadAvg}`);
        console.log(`  Memory: ${load.memory}% | Free: ${load.freeMem}MB`);

        if (load.isOverloaded) {
            console.warn(`  ⚠️  SYSTEM OVERLOADED - Consider reducing stream quality or count`);
        }

        return load;
    }

    /**
     * Get optimization recommendations for VPS
     */
    getVPSRecommendations() {
        const rec = [];

        // Based on CPU cores
        if (this.cpuCores <= 2) {
            rec.push('⚠️  Low CPU count detected. Recommend max 3-5 concurrent streams.');
            rec.push('💡 Use "potato" or "low" quality profiles for better stability.');
        }

        // Based on memory
        if (this.totalMemoryGB < 2) {
            rec.push('⚠️  Low RAM detected (<2GB). Recommend max 3-4 concurrent streams.');
            rec.push('💡 Monitor memory usage frequently to avoid OOM kills.');
        }

        // General VPS recommendations
        rec.push('✅ Use swap file (1-2GB) for memory buffer.');
        rec.push('✅ Enable kernel memory management: `sysctl vm.swappiness=10`');
        rec.push('✅ Monitor with: `pm2 monit` and `htop`');
        rec.push('✅ Set up alerts for high CPU/memory usage.');

        return rec;
    }

    /**
     * Auto-tune FFmpeg settings based on VPS specs
     */
    getVPSTunedArgs() {
        let tuning = {
            threads: 1,  // Default
            quality: 'medium'
        };

        // CPU-based tuning
        if (this.cpuCores <= 1) {
            tuning.quality = 'potato';
            tuning.threads = 1;
        } else if (this.cpuCores <= 2) {
            tuning.quality = 'low';
            tuning.threads = 1;
        } else if (this.cpuCores <= 4) {
            tuning.quality = 'medium';
            tuning.threads = 2;
        } else {
            tuning.quality = 'high';
            tuning.threads = 2;
        }

        // Memory-based adjustment
        if (this.totalMemoryGB < 2) {
            tuning.quality = 'potato';
        } else if (this.totalMemoryGB < 4) {
            if (tuning.quality === 'high') tuning.quality = 'medium';
        }

        return tuning;
    }
}

export default ResourceManager;
