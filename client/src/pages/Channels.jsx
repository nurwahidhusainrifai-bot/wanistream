import { useState, useEffect } from 'react';
import { youtube } from '../utils/api';

export default function Channels() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            const response = await youtube.getAccounts();
            setAccounts(response.data);
        } catch (error) {
            console.error('Error loading accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            const response = await youtube.getAuthUrl();
            window.open(response.data.url, '_blank', 'width=600,height=700');
            setTimeout(loadAccounts, 3000);
        } catch (error) {
            alert('Failed to get auth URL: ' + error.response?.data?.error);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            await youtube.syncStats();
            await loadAccounts();
            // alert('Stats synchronized!');
        } catch (error) {
            console.error('Sync failed', error);
        } finally {
            setSyncing(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to remove this account?')) return;
        try {
            await youtube.deleteAccount(id);
            loadAccounts();
        } catch (error) {
            alert('Failed to delete account');
        }
    };

    const handleSetActive = async (id) => {
        try {
            await youtube.setActiveAccount(id);
            loadAccounts();
        } catch (error) {
            alert('Failed to set active account');
        }
    };

    const formatNumber = (num) => {
        return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num || 0);
    };

    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">YouTube Channels</h1>
                <div className="flex gap-3">
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className={`px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 ${syncing ? 'opacity-50' : ''}`}
                    >
                        <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                        {syncing ? 'Syncing...' : 'Sync Stats'}
                    </button>
                    <button
                        onClick={handleConnect}
                        className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
                    >
                        + Add Channel
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="glass-panel rounded-xl p-8 text-center text-gray-400">Loading...</div>
            ) : accounts.length === 0 ? (
                <div className="glass-panel rounded-xl p-8 text-center text-gray-400">
                    <p className="mb-4">No YouTube channels connected</p>
                    <button onClick={handleConnect} className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium">
                        Connect Your First Channel
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {accounts.map(account => (
                        <div key={account.id} className="glass-panel rounded-xl p-6 relative group overflow-hidden">
                            {/* Header */}
                            <div className="flex items-start gap-4 mb-6">
                                {account.channel_thumbnail && (
                                    <img src={account.channel_thumbnail} alt={account.channel_title} className="w-16 h-16 rounded-full border-2 border-dark-700" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-white text-lg truncate" title={account.channel_title}>
                                        {account.channel_title}
                                    </h3>
                                    {account.is_active === 1 ? (
                                        <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded mt-1 inline-block font-medium">Active uploader</span>
                                    ) : (
                                        <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded mt-1 inline-block">Idle</span>
                                    )}
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-2 mb-6 text-center bg-dark-900/50 rounded-lg p-3">
                                <div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Subs</div>
                                    <div className="font-bold text-white text-lg">{formatNumber(account.subscriber_count)}</div>
                                </div>
                                <div className="border-l border-gray-700">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Views</div>
                                    <div className="font-bold text-white text-lg">{formatNumber(account.view_count)}</div>
                                </div>
                                <div className="border-l border-gray-700">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Videos</div>
                                    <div className="font-bold text-white text-lg">{formatNumber(account.video_count)}</div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                {account.is_active !== 1 && (
                                    <button
                                        onClick={() => handleSetActive(account.id)}
                                        className="flex-1 px-3 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Set Active
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(account.id)}
                                    className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Remove
                                </button>
                            </div>

                            {/* Last Updated */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] text-gray-600 bg-dark-900 px-2 py-1 rounded">
                                    {account.last_stats_update ? new Date(account.last_stats_update).toLocaleDateString() : 'New'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
