import { useState } from 'react';
import axios from 'axios';

export default function Spy() {
    const [url, setUrl] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!url) return;

        setLoading(true);
        setError('');
        setData(null);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            const res = await axios.get(`${apiUrl}/youtube/spy?url=${encodeURIComponent(url)}`, { withCredentials: true });
            setData(res.data);
        } catch (err) {
            console.error('Spy error:', err);
            setError(err.response?.data?.error || 'Failed to analyze video. Make sure the URL is correct.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex-1 overflow-y-auto p-6 bg-dark-900 text-white scrollbar-thin">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight">YouTube Strategy Spy 🕵️‍♂️</h1>
                        <p className="text-gray-400 mt-1">Peek into other channels' settings to steal their winning strategy.</p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="glass-morphism p-6 rounded-2xl border border-gray-800 shadow-2xl mb-8">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔗</span>
                            <input
                                type="text"
                                placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)"
                                className="w-full bg-dark-700/50 border border-gray-700/50 rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-lg"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !url}
                            className={`bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 font-bold px-10 py-4 rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-primary-500/20 active:scale-95 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Analyzing...
                                </>
                            ) : 'SPY NOW'}
                        </button>
                    </form>
                    {error && <p className="mt-4 text-red-400 bg-red-500/10 p-4 rounded-xl border border-red-500/20 flex items-center gap-3">
                        <span>⚠️</span> {error}
                    </p>}
                </div>

                {data && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Sidebar: Thumbnail & Stats */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-dark-800 rounded-2xl border border-gray-800 overflow-hidden shadow-xl group">
                                <div className="relative overflow-hidden">
                                    <img src={data.thumbnail} alt={data.title} className="w-full aspect-video object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <div className="absolute top-2 right-2 bg-dark-900/80 px-2 py-1 rounded text-xs font-mono">
                                        {data.id}
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h2 className="font-bold text-xl leading-tight mb-2 group-hover:text-primary-400 transition-colors">{data.title}</h2>
                                    <div className="flex items-center gap-2 mt-3">
                                        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center font-bold text-xs uppercase">
                                            {data.channel.title.charAt(0)}
                                        </div>
                                        <p className="text-gray-300 font-semibold">{data.channel.title}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-dark-800 p-5 rounded-2xl border border-gray-800 shadow-lg hover:border-primary-500/30 transition-all group">
                                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-2 group-hover:text-primary-500">Views</p>
                                    <p className="text-2xl font-black">{parseInt(data.stats.views).toLocaleString()}</p>
                                </div>
                                <div className="bg-dark-800 p-5 rounded-2xl border border-gray-800 shadow-lg hover:border-primary-500/30 transition-all group">
                                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-2 group-hover:text-primary-500">Likes</p>
                                    <p className="text-2xl font-black">{parseInt(data.stats.likes).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="bg-dark-800 p-6 rounded-2xl border border-gray-800 shadow-lg">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Meta Details</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center text-xl">📅</div>
                                        <div>
                                            <p className="text-xs text-gray-400">Published</p>
                                            <p className="font-bold">{new Date(data.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-xl">⏰</div>
                                        <div>
                                            <p className="text-xs text-gray-400">Upload Time</p>
                                            <p className="font-bold">{new Date(data.publishedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-xl">🌎</div>
                                        <div>
                                            <p className="text-xs text-gray-400">Language</p>
                                            <p className="font-bold uppercase tracking-tight">{data.language}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content: Tags & Description */}
                        <div className="lg:col-span-8 space-y-8">
                            {/* Tags Section */}
                            <div className="bg-dark-800 p-8 rounded-2xl border border-gray-800 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                    <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" /></svg>
                                </div>
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                                    <span className="p-2 bg-primary-500/20 text-primary-400 rounded-lg">🏷️</span> Video Tags
                                    <span className="ml-auto text-xs bg-dark-700 px-3 py-1 rounded-full text-gray-400 font-mono">{data.tags.length} tags</span>
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {data.tags.length > 0 ? data.tags.map((tag, i) => (
                                        <span
                                            key={i}
                                            className="bg-dark-700/50 hover:bg-primary-500/10 border border-gray-700 hover:border-primary-500/50 px-4 py-2 rounded-xl text-sm transition-all cursor-default active:scale-95"
                                        >
                                            {tag}
                                        </span>
                                    )) : <div className="w-full text-center py-10 text-gray-600 italic">No tags hidden for this video.</div>}
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(data.tags.join(', '));
                                        alert('Tags copied to clipboard!');
                                    }}
                                    className="mt-6 text-sm text-primary-400 hover:text-primary-300 flex items-center gap-2 font-bold"
                                >
                                    📋 Copy all tags
                                </button>
                            </div>

                            {/* Hashtags Section */}
                            {data.hashtags.length > 0 && (
                                <div className="bg-dark-800 p-8 rounded-2xl border border-gray-800 shadow-2xl">
                                    <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                                        <span className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">#️⃣</span> Hashtags Detected
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        {data.hashtags.map((tag, i) => (
                                            <span
                                                key={i}
                                                className="bg-blue-500/5 text-blue-400 border border-blue-500/20 hover:border-blue-500/50 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Description Snippet */}
                            <div className="bg-dark-800 p-8 rounded-2xl border border-gray-800 shadow-2xl">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                                    <span className="p-2 bg-green-500/20 text-green-400 rounded-lg">📝</span> Description Preview
                                </h3>
                                <div className="bg-dark-900/50 rounded-xl p-5 border border-gray-700/30 text-gray-400 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed scrollbar-thin">
                                    {data.description || 'No description provided.'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!data && !loading && (
                    <div className="mt-20 text-center opacity-30 select-none">
                        <div className="text-9xl mb-4">🕵️‍♂️</div>
                        <p className="text-xl font-bold italic">Paste a video URL above to uncover its secrets...</p>
                    </div>
                )}
            </div>

            <style jsx>{`
                .glass-morphism {
                    background: rgba(30, 41, 59, 0.5);
                    backdrop-filter: blur(10px);
                }
                .animate-fadeIn {
                    animation: fadeIn 0.5s ease-out forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </main>
    );
}
