import { useState, useEffect } from 'react';
import { youtube, videos } from '../utils/api';
import { format } from 'date-fns';
import { useLocation } from 'react-router-dom';

export default function AutoMode() {
    const location = useLocation();
    const restreamData = location.state?.restreamData;

    const [accounts, setAccounts] = useState([]);
    const [videoList, setVideoList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [useSchedule, setUseSchedule] = useState(false);
    const [thumbnail, setThumbnail] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState(null);

    const [formData, setFormData] = useState({
        youtubeAccountId: restreamData?.youtubeAccountId || '',
        videoId: '',
        title: restreamData?.title || '',
        description: restreamData?.description || '',
        privacy: restreamData?.privacy || 'public',
        categoryId: restreamData?.categoryId || '',
        scheduledStart: '',
        scheduledEnd: ''
    });

    useEffect(() => { loadData(); }, []);

    // Auto-select video when videoList loads
    useEffect(() => {
        if (restreamData?.videoPath && videoList.length > 0 && !formData.videoId) {
            const matchingVideo = videoList.find(v => v.path === restreamData.videoPath);
            if (matchingVideo) {
                setFormData(prev => ({ ...prev, videoId: matchingVideo.id.toString() }));
            }
        }
    }, [videoList]);

    const loadData = async () => {
        try {
            const [accountsRes, videosRes] = await Promise.all([youtube.getAccounts(), videos.getAll()]);
            setAccounts(accountsRes.data);
            setVideoList(videosRes.data);
            if (accountsRes.data.length > 0) {
                const active = accountsRes.data.find(a => a.is_active === 1) || accountsRes.data[0];
                setFormData(prev => ({ ...prev, youtubeAccountId: active.id }));
            }
        } catch (error) { console.error('Error:', error); }
    };

    const handleThumbnailChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setThumbnail(file);
            setThumbnailPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');

        if (!formData.youtubeAccountId) { setError('Pilih YouTube account'); return; }
        if (!formData.videoId) { setError('Pilih video'); return; }
        if (!formData.title.trim()) { setError('Judul wajib diisi'); return; }

        setLoading(true);
        try {
            const submitData = new FormData();
            submitData.append('youtubeAccountId', formData.youtubeAccountId);
            submitData.append('videoId', formData.videoId);
            submitData.append('title', formData.title);
            submitData.append('description', formData.description);
            submitData.append('privacy', formData.privacy);

            if (formData.categoryId) {
                submitData.append('categoryId', formData.categoryId);
            }

            if (thumbnail) {
                submitData.append('thumbnail', thumbnail);
            }

            if (useSchedule && formData.scheduledStart) {
                submitData.append('scheduledStart', new Date(formData.scheduledStart).toISOString());
            }
            if (useSchedule && formData.scheduledEnd) {
                submitData.append('scheduledEnd', new Date(formData.scheduledEnd).toISOString());
            }

            const response = await fetch('/api/streams/auto', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: submitData
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Gagal membuat stream');

            if (useSchedule && formData.scheduledStart) {
                setSuccess(`Dijadwalkan untuk ${format(new Date(formData.scheduledStart), 'dd MMM yyyy HH:mm')}`);
            } else {
                setSuccess('Broadcast berhasil dibuat!');
            }
            setFormData(prev => ({ ...prev, title: '', description: '', videoId: '' }));
            setThumbnail(null);
            setThumbnailPreview(null);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold text-white mb-6">Auto Live Stream</h1>

                {accounts.length === 0 && (
                    <div className="glass-panel rounded-xl p-4 mb-4 border border-yellow-500/30 bg-yellow-500/5">
                        <p className="text-yellow-500">⚠️ <a href="/channels" className="underline">Tambahkan YouTube account dulu</a></p>
                    </div>
                )}

                {error && <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-4 text-red-500">{error}</div>}
                {success && <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 mb-4 text-green-500">{success}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="glass-panel rounded-xl p-5 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">YouTube Account *</label>
                            <select value={formData.youtubeAccountId} onChange={(e) => setFormData({ ...formData, youtubeAccountId: e.target.value })} className="w-full px-4 py-2.5 bg-dark-700 border border-gray-600 rounded-lg text-white">
                                <option value="">-- Pilih Account --</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.channel_title}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Pilih Video *</label>
                            <select value={formData.videoId} onChange={(e) => setFormData({ ...formData, videoId: e.target.value })} className="w-full px-4 py-2.5 bg-dark-700 border border-gray-600 rounded-lg text-white">
                                <option value="">-- Pilih Video --</option>
                                {videoList.map(video => <option key={video.id} value={video.id}>{video.name} ({video.size_mb} MB)</option>)}
                            </select>
                            {videoList.length === 0 && <p className="text-sm text-gray-500 mt-1">Belum ada video. <a href="/videos" className="text-primary-400 underline">Upload dulu</a></p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Nama Live *</label>
                            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Judul live stream" className="w-full px-4 py-2.5 bg-dark-700 border border-gray-600 rounded-lg text-white" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Deskripsi</label>
                            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-4 py-2.5 bg-dark-700 border border-gray-600 rounded-lg text-white resize-none" placeholder="Deskripsi (opsional)" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Kategori</label>
                            <select
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                className="w-full px-4 py-2.5 bg-dark-700 border border-gray-600 rounded-lg text-white"
                            >
                                <option value="">-- Pilih Kategori --</option>
                                <option value="20">Gaming</option>
                                <option value="22">People & Blogs</option>
                                <option value="10">Music</option>
                                <option value="24">Entertainment</option>
                                <option value="27">Education</option>
                                <option value="28">Science & Technology</option>
                                <option value="17">Sports</option>
                                <option value="23">Comedy</option>
                                <option value="25">News & Politics</option>
                                <option value="1">Film & Animation</option>
                                <option value="2">Autos & Vehicles</option>
                                <option value="26">Howto & Style</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Privacy</label>
                            <div className="flex gap-4">
                                {['public', 'unlisted', 'private'].map(p => (
                                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="privacy" value={p} checked={formData.privacy === p} onChange={(e) => setFormData({ ...formData, privacy: e.target.value })} />
                                        <span className="text-gray-300 capitalize text-sm">{p}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Thumbnail (Opsional)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleThumbnailChange}
                                className="w-full px-4 py-2.5 bg-dark-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-500 file:text-white hover:file:bg-primary-600 file:cursor-pointer"
                            />
                            {thumbnailPreview && (
                                <div className="mt-2 relative w-32 h-24 rounded-lg overflow-hidden border border-gray-600">
                                    <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => { setThumbnail(null); setThumbnailPreview(null); }}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                                    >×</button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="glass-panel rounded-xl p-5">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={useSchedule} onChange={(e) => setUseSchedule(e.target.checked)} className="w-4 h-4 rounded" />
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

                    <button type="submit" disabled={loading || accounts.length === 0 || videoList.length === 0} className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2">
                        {loading ? <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Loading...</> : <>{useSchedule ? 'Jadwalkan' : 'Mulai Broadcast'}</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
