import { useState, useEffect } from 'react';
import { streams } from '../utils/api';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export default function History() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const response = await streams.getHistory();
            setHistory(response.data);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRestream = (stream) => {
        // Redirect to appropriate page based on stream type
        if (stream.type === 'manual_key') {
            // Redirect to Manual mode with pre-filled data
            navigate('/manual', {
                state: {
                    restreamData: {
                        streamKey: stream.stream_key,
                        title: stream.title,
                        videoPath: stream.video_path
                    }
                }
            });
        } else if (stream.type === 'auto') {
            // Redirect to Auto mode with pre-filled data
            navigate('/auto', {
                state: {
                    restreamData: {
                        youtubeAccountId: stream.youtube_account_id,
                        title: stream.title,
                        description: stream.description,
                        privacy: stream.privacy,
                        videoPath: stream.video_path
                    }
                }
            });
        }
    };

    const handleEdit = async (stream) => {
        if (!confirm('Yakin ingin menghapus stream ini dari history?')) return;

        try {
            await streams.delete(stream.id);
            alert('Stream berhasil dihapus!');
            loadHistory();
        } catch (error) {
            alert('Gagal hapus: ' + error.response?.data?.error);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-8">
            <h1 className="text-2xl font-bold text-white mb-6">Stream History</h1>

            {loading ? (
                <div className="glass-panel rounded-xl p-8 text-center text-gray-400">
                    Loading...
                </div>
            ) : history.length === 0 ? (
                <div className="glass-panel rounded-xl p-8 text-center text-gray-400">
                    No stream history yet
                </div>
            ) : (
                <div className="space-y-4">
                    {history.map(stream => (
                        <div key={stream.id} className="glass-panel rounded-xl p-6 flex items-center gap-6">
                            <div className="w-32 h-20 bg-gray-800 rounded-lg relative overflow-hidden flex-shrink-0">
                                {stream.thumbnail_path && (
                                    <img src={`/api/videos/thumbnail/${stream.thumbnail_path}`} className="w-full h-full object-cover" alt={stream.title} />
                                )}
                            </div>

                            <div className="flex-1">
                                <h3 className="font-semibold text-white text-lg mb-1">{stream.title}</h3>
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                    <span>📅 {format(new Date(stream.created_at), 'dd MMM yyyy', { locale: idLocale })}</span>
                                    <span>⏰ {format(new Date(stream.scheduled_start), 'HH:mm', { locale: idLocale })} - {format(new Date(stream.scheduled_end || stream.actual_end), 'HH:mm', { locale: idLocale })}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs ${stream.status === 'completed' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                        {stream.status}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleRestream(stream)}
                                    className="px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-500 border border-primary-500/50 rounded-lg text-sm font-medium transition-colors"
                                    title="Livekan Ulang"
                                >
                                    🔄 Livekan Ulang
                                </button>
                                <button
                                    onClick={() => handleEdit(stream)}
                                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 rounded-lg text-sm font-medium transition-colors"
                                    title="Hapus"
                                >
                                    🗑️ Hapus
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
