import si from 'systeminformation';

// Track network stats for delta calculation
let lastNetworkStats = null;
let lastNetworkTime = Date.now();
let currentUploadMbps = 0;

export const getCachedSystemStats = async (req, res) => {
    try {
        const now = Date.now();
        const timeDelta = (now - lastNetworkTime) / 1000; // seconds

        // 1. Get CPU usage
        const cpuLoad = await si.currentLoad();
        const cpu = Math.round(cpuLoad.currentLoad);

        // 2. Get memory usage
        const memory = await si.mem();
        const ramUsed = (memory.used / 1024 / 1024 / 1024).toFixed(1);
        const ramTotal = (memory.total / 1024 / 1024 / 1024).toFixed(1);
        const ramPercent = Math.round((memory.used / memory.total) * 100);

        // 3. Get Real-time Upload Traffic
        try {
            const networkStats = await si.networkStats();
            if (lastNetworkStats && timeDelta > 0) {
                // Sum TX across all interfaces
                const totalTxBytes = networkStats.reduce((acc, iface) => {
                    const lastIface = lastNetworkStats.find(l => l.iface === iface.iface);
                    if (lastIface) {
                        return acc + Math.max(0, iface.tx_bytes - lastIface.tx_bytes);
                    }
                    return acc;
                }, 0);

                // Convert to Mbps: (Bytes * 8) / TimeDelta / 1024 / 1024
                const mbps = (totalTxBytes * 8) / timeDelta / 1024 / 1024;
                currentUploadMbps = parseFloat(mbps.toFixed(2));
            }
            lastNetworkStats = networkStats;
            lastNetworkTime = now;
        } catch (netError) {
            console.error('Network stats error:', netError.message);
        }

        res.json({
            cpu,
            ram: {
                used: parseFloat(ramUsed),
                total: parseFloat(ramTotal),
                percent: ramPercent
            },
            internet: currentUploadMbps // Now shows real-time Upload Speed
        });
    } catch (error) {
        console.error('System stats error:', error);
        res.status(500).json({ error: 'Failed to get system stats' });
    }
};

export const getSystemStats = getCachedSystemStats; // Compatibility
