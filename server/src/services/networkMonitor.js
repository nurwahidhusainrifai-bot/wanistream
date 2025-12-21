import { dbGet } from '../config/db.js';

/**
 * NetworkMonitor - Monitor network health and YouTube connectivity
 * Prevents crashes from network instability and YouTube throttling
 */
class NetworkMonitor {
    constructor() {
        this.youtubeRTMPServers = [
            'a.rtmp.youtube.com',
            'b.rtmp.youtube.com',
            'c.rtmp.youtube.com',
            'd.rtmp.youtube.com'
        ];

        this.networkHealth = {
            lastCheck: null,
            latency: 0,
            packetLoss: 0,
            isHealthy: true,
            preferredServer: 'a.rtmp.youtube.com'
        };

        // YouTube API rate limiting tracking
        this.apiCallTracker = {
            calls: [],
            maxCallsPerMinute: 50,  // Conservative limit
            maxCallsPerHour: 1000
        };

        console.log('[NETWORK-MONITOR] Initialized');
    }

    /**
     * Test connection to YouTube RTMP servers
     */
    async testYouTubeConnectivity() {
        const { spawn } = await import('child_process');

        const results = {};

        for (const server of this.youtubeRTMPServers) {
            try {
                const latency = await this.pingServer(server);
                results[server] = {
                    reachable: latency !== null,
                    latency: latency,
                    score: latency ? (1000 - latency) : 0  // Lower latency = higher score
                };
            } catch (error) {
                results[server] = {
                    reachable: false,
                    latency: null,
                    score: 0
                };
            }
        }

        // Find best server (lowest latency)
        let bestServer = this.youtubeRTMPServers[0];
        let bestScore = 0;

        for (const [server, data] of Object.entries(results)) {
            if (data.reachable && data.score > bestScore) {
                bestScore = data.score;
                bestServer = server;
            }
        }

        this.networkHealth.preferredServer = bestServer;
        this.networkHealth.latency = results[bestServer].latency || 999;
        this.networkHealth.isHealthy = results[bestServer].reachable;
        this.networkHealth.lastCheck = Date.now();

        console.log(`[NETWORK-MONITOR] Best RTMP server: ${bestServer} (${results[bestServer].latency}ms)`);

        return {
            bestServer,
            allResults: results,
            isHealthy: this.networkHealth.isHealthy
        };
    }

    /**
     * Ping a server to check latency
     */
    async pingServer(hostname) {
        return new Promise((resolve) => {
            const isWindows = process.platform === 'win32';
            const { spawn } = require('child_process');

            const args = isWindows
                ? ['ping', ['-n', '1', '-w', '2000', hostname]]
                : ['ping', ['-c', '1', '-W', '2', hostname]];

            const ping = spawn(args[0], args[1]);
            let output = '';

            ping.stdout.on('data', (data) => {
                output += data.toString();
            });

            ping.on('close', (code) => {
                if (code !== 0) {
                    resolve(null);
                    return;
                }

                // Parse latency from ping output
                const match = isWindows
                    ? output.match(/Average = (\d+)ms/)
                    : output.match(/time=([0-9.]+) ms/);

                if (match) {
                    resolve(parseFloat(match[1]));
                } else {
                    resolve(null);
                }
            });

            ping.on('error', () => resolve(null));

            // Timeout after 3 seconds
            setTimeout(() => {
                ping.kill();
                resolve(null);
            }, 3000);
        });
    }

    /**
     * Get recommended RTMP server based on network test
     */
    async getRecommendedRTMPServer() {
        // Re-test if last check was > 5 minutes ago
        if (!this.networkHealth.lastCheck || (Date.now() - this.networkHealth.lastCheck) > 300000) {
            await this.testYouTubeConnectivity();
        }

        return `rtmp://${this.networkHealth.preferredServer}/live2`;
    }

    /**
     * Check if YouTube API call can be made (rate limiting)
     */
    canMakeAPICall() {
        const now = Date.now();

        // Remove calls older than 1 hour
        this.apiCallTracker.calls = this.apiCallTracker.calls.filter(
            timestamp => now - timestamp < 3600000
        );

        // Check per-minute limit
        const callsLastMinute = this.apiCallTracker.calls.filter(
            timestamp => now - timestamp < 60000
        ).length;

        if (callsLastMinute >= this.apiCallTracker.maxCallsPerMinute) {
            console.warn(`[NETWORK-MONITOR] ⚠️  YouTube API rate limit hit (${callsLastMinute}/min)`);
            return {
                allowed: false,
                reason: 'Rate limit: too many calls per minute',
                retryAfter: 60  // seconds
            };
        }

        // Check per-hour limit
        if (this.apiCallTracker.calls.length >= this.apiCallTracker.maxCallsPerHour) {
            console.warn(`[NETWORK-MONITOR] ⚠️  YouTube API hourly limit hit (${this.apiCallTracker.calls.length}/hour)`);
            return {
                allowed: false,
                reason: 'Rate limit: too many calls per hour',
                retryAfter: 3600  // seconds
            };
        }

        return {
            allowed: true,
            callsThisMinute: callsLastMinute,
            callsThisHour: this.apiCallTracker.calls.length
        };
    }

    /**
     * Track an API call (for rate limiting)
     */
    trackAPICall() {
        this.apiCallTracker.calls.push(Date.now());
    }

    /**
     * Get network health status
     */
    getNetworkHealth() {
        return {
            ...this.networkHealth,
            apiCalls: {
                lastMinute: this.apiCallTracker.calls.filter(
                    t => Date.now() - t < 60000
                ).length,
                lastHour: this.apiCallTracker.calls.length
            }
        };
    }

    /**
     * Detect network degradation
     */
    isNetworkDegraded() {
        if (!this.networkHealth.lastCheck) return false;

        // Network is degraded if:
        // 1. Latency > 200ms
        // 2. Last check failed
        // 3. No check in last 10 minutes
        const timeSinceLastCheck = Date.now() - this.networkHealth.lastCheck;

        return (
            this.networkHealth.latency > 200 ||
            !this.networkHealth.isHealthy ||
            timeSinceLastCheck > 600000
        );
    }

    /**
     * Get recommended stream settings based on network health
     */
    async getNetworkOptimizedSettings() {
        const health = this.getNetworkHealth();

        let settings = {
            bitrate: '2500k',
            bufferSize: '5000k',
            reconnectDelay: '30',
            gopSize: '60'
        };

        // Adjust for network conditions
        if (this.isNetworkDegraded()) {
            console.warn('[NETWORK-MONITOR] Network degraded - using conservative settings');
            settings = {
                bitrate: '1500k',       // Lower bitrate
                bufferSize: '3000k',     // Smaller buffer
                reconnectDelay: '10',    // Faster reconnect
                gopSize: '120'           // Larger GOP for stability
            };
        } else if (health.latency < 50) {
            // Excellent network - can use higher quality
            settings = {
                bitrate: '3000k',
                bufferSize: '6000k',
                reconnectDelay: '30',
                gopSize: '60'
            };
        }

        return settings;
    }

    /**
     * Start periodic network monitoring
     */
    startMonitoring(intervalMinutes = 5) {
        console.log(`[NETWORK-MONITOR] Starting periodic check (every ${intervalMinutes} min)`);

        // Initial check
        this.testYouTubeConnectivity();

        // Periodic checks
        setInterval(() => {
            this.testYouTubeConnectivity();
        }, interval Minutes * 60 * 1000);
    }
}

export default NetworkMonitor;
