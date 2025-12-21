#!/bin/bash

# Pastikan di folder yang benar
if [ ! -d "client" ] || [ ! -d "server" ]; then
    echo "ERROR: Jalankan script ini di dalam folder wanistream (biasanya /opt/wanistream)"
    exit 1
fi

echo "=== MEMULAI PERBAIKAN TOTAL ==="

# 1. FIX: Server Config (Pastikan baca folder dist)
echo "[1/5] Memperbaiki Server Config..."
sed -i "s|../client'|../client/dist'|g" server/server.js
sed -i 's|../client"|../client/dist"|g' server/server.js

# 2. FIX: Buat komponen ErrorBoundary
echo "[2/5] Memasang Pengaman Error..."
mkdir -p client/src/components
cat << 'EOF' > client/src/components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
        this.setState({ error: error });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', background: '#1a1a1a', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h2 style={{ color: '#ef4444', fontSize: '24px', marginBottom: '10px' }}>Terjadi Kesalahan Tampilan</h2>
                    <p>Jangan khawatir, sistem tetap berjalan.</p>
                    <button 
                        onClick={() => window.location.reload()}
                        style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', marginTop: '20px', cursor: 'pointer' }}
                    >
                        Klik untuk Refresh
                    </button>
                    <pre style={{ marginTop: '20px', color: '#6b7280', fontSize: '12px' }}>
                        {this.state.error && this.state.error.toString()}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
EOF

# 3. FIX: App.jsx (Gunakan ErrorBoundary)
echo "[3/5] Mengupdate App.jsx..."
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
                        <Route path="/*" element={
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
                        } />
                    </Routes>
                </ErrorBoundary>
            </BrowserRouter>
        </AuthProvider>
    );
}
EOF

# 4. FIX: ManualMode.jsx (Full Overwrite - Anti Crash)
echo "[4/5] Memperbaiki Halaman Manual..."
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
        loadVideos();
    }, []);

    const loadVideos = async () => {
        try {
            const response = await videos.getAll();
            // Safety check: pastikan data adalah array
            if (response.data && Array.isArray(response.data)) {
                setVideoList(response.data);
                
                // Auto-select jika ada data restream
                if (restreamData?.videoPath) {
                    const matching = response.data.find(v => v.path === restreamData.videoPath);
                    if (matching) {
                        setFormData(prev => ({ ...prev, videoId: matching.id.toString() }));
                    }
                }
            } else {
                console.error("Format data video salah:", response);
                setVideoList([]);
            }
        } catch (error) {
            console.error('Error loading videos:', error);
            setVideoList([]);
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
                setSuccess('Stream dijadwalkan: ' + format(new Date(formData.scheduledStart), 'dd MMM HH:mm'));
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
                            <label className="block text-sm font-medium text-gray-300 mb-2">Judul (Opsional)</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Judul live stream"
                                className="w-full px-4 py-2.5 bg-dark-700 border border-gray-600 rounded-lg text-white"
                                disabled={streaming}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Video *</label>
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
                                <p className="text-sm text-gray-500 mt-1">
                                    Belum ada video. <a href="/videos" className="text-primary-400 underline">Upload di menu Video</a>
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="glass-panel rounded-xl p-5">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={useSchedule} onChange={(e) => setUseSchedule(e.target.checked)} className="w-4 h-4 rounded" disabled={streaming} />
                            <span className="text-white font-medium">Jadwalkan?</span>
                        </label>
                        {useSchedule && (
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Mulai</label>
                                    <input type="datetime-local" value={formData.scheduledStart} onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })} className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Akhir</label>
                                    <input type="datetime-local" value={formData.scheduledEnd} onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })} className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm" />
                                </div>
                            </div>
                        )}
                    </div>

                    {!streaming ? (
                        <button type="submit" disabled={loading} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-all">
                            {loading ? 'Memproses...' : (useSchedule ? 'Simpan Jadwal' : 'MULAI LIVE')}
                        </button>
                    ) : (
                        <button type="button" onClick={handleStopStream} className="w-full py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-xl">
                            BERHENTI
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}
EOF

# 5. Build & Restart
echo "[5/5] Rebuild Frontend & Restart Server..."
cd client
rm -rf dist
npm install
npm run build
cd ..
pm2 restart all

echo "==========================================="
echo "   SEMUA FIX SELESAI. SILAKAN CEK WEB."
echo "==========================================="
