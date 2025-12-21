import { useState, useEffect } from 'react';
import { videos } from '../utils/api';
import { format } from 'date-fns';
import { useLocation } from 'react-router-dom';

export default function ManualMode() {
    const location = useLocation();
    const restreamData = location.state?.restreamData;

    const [videoList, setVideoList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [streaming, setStreaming] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [useSchedule, setUseSchedule] = useState(false);

    const [formData, setFormData] = useState({
        streamKey: restreamData?.streamKey || '',
        title: restreamData?.title || '',
        videoId: '',
        scheduledStart: '',
        scheduledEnd: '',
    });

    useEffect(() => {
        loadVideos().then(() => {
            // Auto-select video if restream data exists
            if (restreamData?.videoPath && videoList.length > 0) {
                const matchingVideo = videoList.find(v => v.path === restreamData.videoPath);
                if (matchingVideo) {
                    setFormData(prev => ({ ...prev, videoId: matchingVideo.id.toString() }));
                }
            }
        });
    }, []);

    // Watch videoList changes for restream auto-select
    useEffect(() => {
        if (restreamData?.videoPath && videoList.length > 0 && !formData.videoId) {
            const matchingVideo = videoList.find(v => v.path === restreamData.videoPath);
            if (matchingVideo) {
                setFormData(prev => ({ ...prev, videoId: matchingVideo.id.toString() }));
            }
        }
    }, [videoList]);

    const loadVideos = async () => {
        try {
            const response = await videos.getAll();
            setVideoList(response.data);
        } catch (error) {
            console.error('Error loading videos:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.streamKey.trim()) { setError('Stream Key wajib diisi'); return; }
        if (!formData.videoId) { setError('Pilih video terlebih dahulu'); return; }

        setLoading(true);

        try {
            const response = await fetch('/api/streams/manual-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    streamKey: formData.streamKey,
                    title: formData.title,
                    videoId: formData.videoId,
                    scheduledStart: useSchedule && formData.scheduledStart ? new Date(formData.scheduledStart).toISOString() : null,
                    scheduledEnd: useSchedule && formData.scheduledEnd ? new Date(formData.scheduledEnd).toISOString() : null
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Gagal memulai stream');

            if (useSchedule && formData.scheduledStart) {
                setSuccess(`Stream dijadwalkan untuk ${format(new Date(formData.scheduledStart), 'dd MMM yyyy HH:mm')}`);
            } else {
                setSuccess('Stream berhasil dimulai!');
                setStreaming(true);
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStopStream = async () => {
        try {
            await fetch('/api/streams/stop-manual', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setStreaming(false);
            setSuccess('Stream dihentikan');
        } catch (error) {
            setError('Gagal menghentikan stream');
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold text-white mb-6">Manual Live Stream</h1>

                {error && <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-4 text-red-500">{error}</div>}
                {success && <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 mb-4 text-green-500">{success}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="glass-panel rounded-xl p-5 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Stream Key *</label>
                            <input
                                type="password"
                                value={formData.streamKey}
                                onChange={(e) => setFormData({ ...formData, streamKey: e.target.value })}
                                placeholder="xxxx-xxxx-xxxx-xxxx-xxxx"
                                className="w-full px-4 py-2.5 bg-dark-700 border border-gray-600 rounded-lg text-white font-mono"
                                disabled={streaming}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Nama Live</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Judul live stream (opsional)"
                                className="w-full px-4 py-2.5 bg-dark-700 border border-gray-600 rounded-lg text-white"
                                disabled={streaming}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Pilih Video *</label>
                            <select
                                value={formData.videoId}
                                onChange={(e) => setFormData({ ...formData, videoId: e.target.value })}
                                className="w-full px-4 py-2.5 bg-dark-700 border border-gray-600 rounded-lg text-white"
                                disabled={streaming}
                            >
                                <option value="">-- Pilih Video --</option>
                                {Array.isArray(videoList) && videoList.map(video => (
                                    <option key={video.id} value={video.id}>
                                        {video.name} ({video.size_mb} MB)
                                    </option>
                                ))}
                            </select>
                            {videoList.length === 0 && (
                                <p className="text-sm text-gray-500 mt-1">Belum ada video. <a href="/videos" className="text-primary-400 underline">Upload dulu</a></p>
                            )}
                        </div>
                    </div>

                    <div className="glass-panel rounded-xl p-5">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={useSchedule} onChange={(e) => setUseSchedule(e.target.checked)} className="w-4 h-4 rounded" disabled={streaming} />
                            <span className="text-white font-medium">Jadwalkan Stream</span>
                        </label>
                        {useSchedule && (
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Mulai</label>
                                    <input type="datetime-local" value={formData.scheduledStart} onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })} className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Akhir (opsional)</label>
                                    <input type="datetime-local" value={formData.scheduledEnd} onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })} className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm" />
                                </div>
                            </div>
                        )}
                    </div>

                    {!streaming ? (
                        <button type="submit" disabled={loading || videoList.length === 0} className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2">
                            {loading ? (
                                <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Loading...</>
                            ) : (
                                <><span className="w-3 h-3 bg-white rounded-full animate-pulse" />{useSchedule ? 'Jadwalkan' : 'Mulai Live'}</>
                            )}
                        </button>
                    ) : (
                        <button type="button" onClick={handleStopStream} className="w-full py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl">Stop Stream</button>
                    )}
                </form>
            </div>
        </div>
    );
}
