import { useState, useEffect } from 'react';
import { streams, system } from '../utils/api';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function Dashboard() {
    const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });
    const [systemStats, setSystemStats] = useState({ cpu: 0, ram: { used: 0, total: 0 }, internet: 0 });
    const [activeStreams, setActiveStreams] = useState([]);
    const [scheduledStreams, setScheduledStreams] = useState([]);

    useEffect(() => {
        loadData();
        const interval = setInterval(() => {
            loadData();
        }, 5000); // Refresh every 5 seconds (optimized for speed)

        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const [statsRes, systemRes, activeRes, scheduledRes] = await Promise.all([
                streams.getStats(),
                system.getStats(),
                streams.getActive(),
                streams.getScheduled()
            ]);

            setStats(statsRes.data);
            setSystemStats(systemRes.data);
            setActiveStreams(activeRes.data);
            setScheduledStreams(scheduledRes.data);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // Don't clear data on error - keep showing last successful data
        }
    };

    const handleEndStream = async (id) => {
        if (!confirm('Are you sure you want to end this stream?')) return;

        console.log(`[Dashboard] Attempting to end stream ${id}`);

        try {
            const response = await streams.end(id);
            console.log(`[Dashboard] Stream ${id} ended successfully:`, response.data);

            // Show success message
            alert(`✅ Stream ended successfully!`);

            // Refresh data
            loadData();
        } catch (error) {
            console.error(`[Dashboard] Failed to end stream ${id}:`, error);
            console.error(`[Dashboard] Error response:`, error.response?.data);

            const errorMessage = error.response?.data?.details
                || error.response?.data?.error
                || error.message
                || 'Unknown error occurred';

            alert(`❌ Failed to end stream: ${errorMessage}\n\nCheck browser console for more details.`);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
                {/* Stream Stats */}
                <StatsCard title="Active Streams" value={stats.active} color="red" pulse />
                <StatsCard title="Jadwal Live" value={scheduledStreams.length} color="blue" />

                {/* System Stats */}
                <div className="glass-panel p-4 rounded-xl">
                    <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">CPU Usage</div>
                    <div className="text-2xl font-bold text-white">{systemStats.cpu}%</div>
                    <div className="w-full bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${systemStats.cpu}%` }}></div>
                    </div>
                </div>

                <div className="glass-panel p-4 rounded-xl">
                    <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">RAM Usage</div>
                    <div className="text-xl font-bold text-white">
                        {systemStats.ram.used} <span className="text-sm text-gray-500 font-normal">/ {systemStats.ram.total} GB</span>
                    </div>
                    <div className="w-full bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${systemStats.ram.percent}%` }}></div>
                    </div>
                </div>

                <div className="glass-panel p-4 rounded-xl">
                    <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Internet</div>
                    <div className="text-2xl font-bold text-white">{systemStats.internet} <span className="text-sm text-gray-500 font-normal">Mbps</span></div>
                    <div className="flex gap-1 mt-2">
                        {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className={`h-1.5 w-1 rounded-full ${i < Math.floor(systemStats.internet / 30) ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Active Streams */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="w-2 h-6 bg-red-500 rounded-sm"></span>
                        Active Streams
                    </h2>
                </div>

                {activeStreams.length === 0 ? (
                    <div className="glass-panel rounded-xl p-8 text-center text-gray-400">
                        No active streams
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {activeStreams.map(stream => (
                            <StreamCard key={stream.id} stream={stream} onEnd={handleEndStream} />
                        ))}
                    </div>
                )}
            </div>

            {/* Scheduled Streams */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="w-2 h-6 bg-primary-500 rounded-sm"></span>
                        Scheduled Streams
                    </h2>
                </div>

                {scheduledStreams.length === 0 ? (
                    <div className="glass-panel rounded-xl p-8 text-center text-gray-400">
                        No scheduled streams
                    </div>
                ) : (
                    <div className="space-y-4">
                        {scheduledStreams.map(stream => (
                            <ScheduledCard key={stream.id} stream={stream} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatsCard({ title, value, color, pulse }) {
    const colors = {
        blue: 'text-blue-400',
        red: 'text-red-500',
        green: 'text-green-400'
    };

    return (
        <div className="glass-panel p-4 rounded-xl relative overflow-hidden group">
            <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">{title}</div>
            <div className="text-2xl font-bold text-white flex items-center gap-2">
                {value}
                {pulse && (
                    <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                )}
            </div>
        </div>
    );
}

function StreamCard({ stream, onEnd }) {
    const formatTime = (dateStr) => {
        if (!dateStr) return '--:--';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    const duration = stream.actual_start ? formatDistanceToNow(new Date(stream.actual_start), { locale: idLocale }) : '0m';

    return (
        <div className="glass-panel rounded-xl p-4 flex gap-4 hover:border-gray-600 transition-colors">
            <div className="w-48 h-28 bg-gray-800 rounded-lg relative overflow-hidden flex-shrink-0">
                {stream.thumbnail_path ? (
                    <img
                        src={`/api/videos/thumbnail/${stream.thumbnail_path}`}
                        className="w-full h-full object-cover opacity-80"
                        alt={stream.title}
                        onError={(e) => e.target.style.display = 'none'}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                )}
                <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> LIVE
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-between">
                <div>
                    <h3 className="font-mono font-semibold text-blue-400 text-sm leading-tight mb-0.5 truncate bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20" title={stream.stream_key}>
                        {stream.stream_key || 'No Stream Key'}
                    </h3>
                    <div className="text-white font-medium text-base mb-1 truncate">
                        {stream.title === stream.stream_key ? 'Manual Stream' : stream.title}
                    </div>

                    <div className="flex flex-col gap-1 text-sm text-gray-400 mb-2">
                        <div className="flex items-center gap-1.5 text-blue-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"></path>
                            </svg>
                            <span className="truncate" title={stream.video_name}>{stream.video_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-red-400 font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span>Aktif: {duration}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 bg-black/30 p-2 rounded border border-gray-800">
                        <div>Start: <span className="text-gray-400">{formatTime(stream.actual_start)}</span></div>
                        <div>Channel: <span className="text-gray-400 truncate">{stream.channel_title || 'N/A'}</span></div>
                    </div>
                </div>

                <div className="flex gap-2 mt-3">
                    <button
                        onClick={() => onEnd(stream.id)}
                        className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 py-1.5 rounded-lg text-sm font-medium transition-all"
                    >
                        End Stream
                    </button>
                </div>
            </div>
        </div>
    );
}

function ScheduledCard({ stream }) {
    const formatTime = (dateStr) => {
        if (!dateStr) return '--:--';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    const timeUntil = formatDistanceToNow(new Date(stream.scheduled_start), { locale: idLocale, addSuffix: true });

    return (
        <div className="glass-panel rounded-xl p-4 flex gap-4 hover:border-gray-600 transition-colors">
            <div className="w-48 h-28 bg-gray-800 rounded-lg relative overflow-hidden flex-shrink-0">
                {stream.thumbnail_path ? (
                    <img
                        src={`/api/videos/thumbnail/${stream.thumbnail_path}`}
                        className="w-full h-full object-cover opacity-80"
                        alt={stream.title}
                        onError={(e) => e.target.style.display = 'none'}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                )}
                <div className="absolute top-2 left-2 bg-yellow-600 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    SCHEDULED
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-between">
                <div>
                    <h3 className="font-semibold text-white text-lg leading-tight mb-1">{stream.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                        <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Mulai {timeUntil}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 bg-dark-900/50 p-2 rounded border border-gray-800">
                        <div>Mulai: <span className="text-gray-300">{formatTime(stream.scheduled_start)}</span></div>
                        <div>Akhir: <span className="text-gray-300">{formatTime(stream.scheduled_end)}</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
