import { useState, useEffect, useRef } from 'react';
import { videos } from '../utils/api';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function Videos() {
    const [videoList, setVideoList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewVideo, setPreviewVideo] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadVideos();
    }, []);

    const loadVideos = async () => {
        try {
            const response = await videos.getAll();
            setVideoList(response.data);
        } catch (error) {
            console.error('Error loading videos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('video', file);
            formData.append('name', file.name);

            await videos.upload(formData, (percent) => {
                setUploadProgress(percent);
            });
            loadVideos();
        } catch (error) {
            alert('Upload gagal: ' + (error.response?.data?.error || error.message));
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Hapus video "${name}"?`)) return;

        try {
            await videos.delete(id);
            loadVideos();
        } catch (error) {
            alert('Gagal menghapus: ' + error.response?.data?.error);
        }
    };

    const handleRename = async (id, currentName) => {
        const newName = prompt('Nama baru:', currentName);
        if (!newName || newName === currentName) return;

        try {
            await videos.update(id, { name: newName });
            loadVideos();
        } catch (error) {
            alert('Gagal mengganti nama: ' + error.response?.data?.error);
        }
    };

    const formatSize = (mb) => {
        if (!mb) return '0 MB';
        const num = parseFloat(mb);
        if (num >= 1024) return (num / 1024).toFixed(2) + ' GB';
        return num.toFixed(1) + ' MB';
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getThumbnailUrl = (thumbnail) => {
        if (!thumbnail) return null;
        return `/api/videos/thumbnail/${thumbnail}`;
    };

    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Video Library</h1>
                        <p className="text-gray-400">Kelola video untuk streaming</p>
                    </div>
                </div>

                {loading ? (
                    <div className="glass-panel rounded-xl p-12 text-center">
                        <svg className="animate-spin w-12 h-12 mx-auto text-primary-500 mb-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-gray-400">Loading videos...</p>
                    </div>
                ) : videoList.length === 0 ? (
                    <div className="glass-panel rounded-xl p-12 text-center">
                        <svg className="w-20 h-20 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                        <p className="text-white text-xl font-semibold mb-2">Belum ada video</p>
                        <p className="text-gray-500 mb-6">Silakan tambahkan video ke folder library secara manual</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {videoList.map(video => (
                            <div key={video.id} className="glass-panel rounded-xl overflow-hidden group hover:ring-2 hover:ring-primary-500/50 transition-all">
                                {/* Thumbnail */}
                                <div
                                    className="relative aspect-video bg-dark-900 cursor-pointer"
                                    onClick={() => setPreviewVideo(video)}
                                >
                                    {video.thumbnail_path ? (
                                        <img
                                            src={getThumbnailUrl(video.thumbnail_path)}
                                            alt={video.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <svg className="w-16 h-16 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                        </div>
                                    )}

                                    {/* Play overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                                            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Duration badge */}
                                    {video.duration_seconds > 0 && (
                                        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 rounded text-xs text-white font-medium">
                                            {formatDuration(video.duration_seconds)}
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-4">
                                    <h3 className="font-medium text-white truncate mb-2" title={video.name}>
                                        {video.name}
                                    </h3>

                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                                        <span>{formatSize(video.size_mb)}</span>
                                        <span>{format(new Date(video.created_at), 'dd MMM yyyy', { locale: idLocale })}</span>
                                    </div>

                                    {/* Action Buttons - Always Visible */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPreviewVideo(video)}
                                            className="flex-1 py-2 px-3 bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            Preview
                                        </button>
                                        <button
                                            onClick={() => handleRename(video.id, video.name)}
                                            className="py-2 px-3 bg-dark-600 hover:bg-dark-500 text-gray-300 rounded-lg text-sm transition-colors"
                                            title="Rename"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(video.id, video.name)}
                                            className="py-2 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                                            title="Hapus"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Storage Info */}
                {videoList.length > 0 && (
                    <div className="mt-8 glass-panel rounded-xl p-4 flex items-center justify-between">
                        <div className="text-gray-400 text-sm">
                            <span className="font-medium text-white">{videoList.length}</span> video tersimpan
                        </div>
                        <div className="text-gray-400 text-sm">
                            Total: <span className="font-medium text-white">
                                {formatSize(videoList.reduce((sum, v) => sum + parseFloat(v.size_mb || 0), 0))}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Video Preview Modal */}
            {previewVideo && (
                <div
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
                    onClick={() => setPreviewVideo(null)}
                >
                    <div
                        className="bg-dark-800 rounded-2xl overflow-hidden max-w-4xl w-full shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Video Player */}
                        <div className="relative aspect-video bg-black">
                            <video
                                src={`/api/videos/stream/${previewVideo.filename}`}
                                controls
                                autoPlay
                                className="w-full h-full"
                            />
                        </div>

                        {/* Info Bar */}
                        <div className="p-4 border-t border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-white font-semibold text-lg">{previewVideo.name}</h3>
                                    <p className="text-gray-500 text-sm">
                                        {formatSize(previewVideo.size_mb)} • {formatDuration(previewVideo.duration_seconds)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setPreviewVideo(null)}
                                    className="px-4 py-2 bg-dark-600 hover:bg-dark-500 text-gray-300 rounded-lg font-medium transition-colors"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
