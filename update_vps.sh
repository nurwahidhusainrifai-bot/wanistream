#!/bin/bash

echo "========================================"
echo "   UPDATE & FIX WANISTREAM VPS (v2)"
echo "========================================"

# 1. Buat ErrorBoundary.jsx
echo "[1/4] Membuat Component ErrorBoundary..."
mkdir -p client/src/components
cat << 'EOF' > client/src/components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8">
                    <div className="bg-gray-900 p-6 rounded-xl border border-red-500 max-w-2xl w-full">
                        <h1 className="text-2xl font-bold text-red-500 mb-4">Terjadi Error Tampilan</h1>
                        <p className="text-gray-300 mb-4">Jangan panik. Screenshot halaman ini dan kirim ke developer.</p>
                        
                        <div className="bg-black p-4 rounded-lg overflow-auto max-h-60 mb-4 border border-gray-700">
                            <code className="text-red-400 font-mono text-sm block mb-2">
                                {this.state.error && this.state.error.toString()}
                            </code>
                            <pre className="text-gray-500 font-mono text-xs whitespace-pre-wrap">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>
                        
                        <button 
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium"
                        >
                            Coba Refresh
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
EOF

# 2. Update App.jsx
echo "[2/4] Mengupdate App.jsx..."
cat << 'EOF' > client/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ManualMode from './pages/ManualMode';
import AutoMode from './pages/AutoMode';
import Videos from './pages/Videos';
import Channels from './pages/Channels';
import History from './pages/History';
import ErrorBoundary from './components/ErrorBoundary';

function AppLayout({ children }) {
    return (
        <div className="h-screen flex overflow-hidden bg-dark-900">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                {children}
            </div>
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <ErrorBoundary>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/*"
                            element={
                                <ProtectedRoute>
                                    <AppLayout>
                                        <ErrorBoundary>
                                            <Routes>
                                                <Route path="/" element={<Dashboard />} />
                                                <Route path="/manual" element={<ManualMode />} />
                                                <Route path="/auto" element={<AutoMode />} />
                                                <Route path="/videos" element={<Videos />} />
                                                <Route path="/channels" element={<Channels />} />
                                                <Route path="/history" element={<History />} />
                                                <Route path="*" element={<Navigate to="/" replace />} />
                                            </Routes>
                                        </ErrorBoundary>
                                    </AppLayout>
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </ErrorBoundary>
            </BrowserRouter>
        </AuthProvider>
    );
}
EOF

# 3. Update ManualMode.jsx (Safety Fix)
echo "[3/4] Mengamankan ManualMode.jsx..."
cat << 'EOF' > client/src/pages/ManualMode.jsx
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
            if (restreamData?.videoPath && videoList.length > 0) {
                const matchingVideo = videoList.find(v => v.path === restreamData.videoPath);
                if (matchingVideo) {
                    setFormData(prev => ({ ...prev, videoId: matchingVideo.id.toString() }));
                }
            }
        });
    }, []);

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
            if (response.data && Array.isArray(response.data)) {
                setVideoList(response.data);
            } else {
                setVideoList([]);
            }
        } catch (error) {
            console.error('Error loading videos:', error);
            setVideoList([]); // Safe fallback
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
                setSuccess('Stream dijadwalkan untuk ' + format(new Date(formData.scheduledStart), 'dd MMM yyyy HH:mm'));
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
                            {(!videoList || videoList.length === 0) && (
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
                        <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2">
                            {loading ? 'Loading...' : (useSchedule ? 'Jadwalkan' : 'Mulai Live')}
                        </button>
                    ) : (
                        <button type="button" onClick={handleStopStream} className="w-full py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl">Stop Stream</button>
                    )}
                </form>
            </div>
        </div>
    );
}
EOF

# 4. Build Ulang
echo "[4/4] Membangun Ulang Frontend..."
cd client
npm run build
cd ..

# Restart PM2
pm2 restart all

echo "==========================================="
echo "   UPDATE SELESAI. SILAKAN REFRESH WEB"
echo "==========================================="
