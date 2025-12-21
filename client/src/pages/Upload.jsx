import { useState, useEffect } from 'react';
import { youtube } from '../utils/api';
import { useNavigate } from 'react-router-dom';

export default function Upload() {
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState('');
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [privacy, setPrivacy] = useState('private');
    const [scheduleTime, setScheduleTime] = useState('');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            const res = await youtube.getAccounts();
            setAccounts(res.data);
            // Auto select active or first
            const active = res.data.find(a => a.is_active);
            if (active) setSelectedAccount(active.id);
            else if (res.data.length > 0) setSelectedAccount(res.data[0].id);
        } catch (error) {
            console.error('Failed to load accounts');
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
            setTitle(e.target.files[0].name.replace(/\.[^/.]+$/, "")); // Auto title
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !selectedAccount) return alert('Select file and account!');

        setUploading(true);
        setProgress(0);

        const formData = new FormData();
        formData.append('video', file);
        formData.append('accountId', selectedAccount);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('privacy', scheduleTime ? 'private' : privacy); // Schedule must be private
        if (scheduleTime) formData.append('publishAt', new Date(scheduleTime).toISOString());

        try {
            await youtube.upload(formData, (percent) => {
                setProgress(percent);
            });
            alert('Upload Started! Check Dashboard/History.');
            navigate('/history');
        } catch (error) {
            alert('Upload Failed: ' + (error.response?.data?.error || error.message));
            setUploading(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-8">
            <h1 className="text-2xl font-bold text-white mb-6">Upload Video</h1>

            <div className="glass-panel rounded-xl p-8 max-w-3xl mx-auto">
                <form onSubmit={handleUpload} className="space-y-6">

                    {/* Account Selector */}
                    <div>
                        <label className="block text-gray-400 mb-2">Target Channel</label>
                        <select
                            className="input-field w-full"
                            value={selectedAccount}
                            onChange={(e) => setSelectedAccount(e.target.value)}
                        >
                            <option value="">Select Channel...</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.channel_title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* File Input */}
                    <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-primary-500 transition-colors cursor-pointer relative">
                        <input
                            type="file"
                            accept="video/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {file ? (
                            <div className="text-primary-400 font-medium">Selected: {file.name}</div>
                        ) : (
                            <div className="text-gray-400">
                                <span className="block text-4xl mb-2">📂</span>
                                <span className="font-medium">Click or Drag Video Here</span>
                            </div>
                        )}
                    </div>

                    {/* Meta Data */}
                    <div>
                        <label className="block text-gray-400 mb-2">Title</label>
                        <input
                            type="text"
                            className="input-field w-full"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 mb-2">Description</label>
                        <textarea
                            className="input-field w-full h-32"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Privacy & Schedule */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-400 mb-2">Visibility</label>
                            <select
                                className="input-field w-full"
                                value={privacy}
                                onChange={(e) => setPrivacy(e.target.value)}
                                disabled={!!scheduleTime}
                            >
                                <option value="public">Public</option>
                                <option value="unlisted">Unlisted</option>
                                <option value="private">Private</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-2">Schedule (Optional)</label>
                            <input
                                type="datetime-local"
                                className="input-field w-full"
                                value={scheduleTime}
                                onChange={(e) => setScheduleTime(e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">Leave empty to publish immediately.</p>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={uploading}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${uploading ? 'bg-gray-600 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                            }`}
                    >
                        {uploading ? `Uploading... ${progress}%` : 'Start Upload'}
                    </button>

                    {uploading && (
                        <div className="w-full bg-gray-700 rounded-full h-2 mt-4">
                            <div
                                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    )}

                </form>
            </div>
        </div>
    );
}
