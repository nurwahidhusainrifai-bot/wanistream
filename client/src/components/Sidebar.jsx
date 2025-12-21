import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
    const location = useLocation();

    const navItems = [
        { path: '/', icon: 'dashboard', label: 'Dashboard' },
        { path: '/manual', icon: 'key', label: 'Manual (Stream Key)' },
        { path: '/auto', icon: 'zap', label: 'Auto (API)' },
        { path: '/videos', icon: 'folder', label: 'Video Library' },
        { path: '/channels', icon: 'tv', label: 'Channels' },
        { path: '/history', icon: 'history', label: 'History' }
    ];

    const getIcon = (name) => {
        const icons = {
            dashboard: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>,
            key: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>,
            zap: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>,
            folder: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>,
            tv: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>,
            history: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
        };
        return icons[name];
    };

    return (
        <aside className="w-64 bg-dark-800 border-r border-gray-800 flex flex-col flex-shrink-0">
            <div className="h-16 flex items-center px-6 border-b border-gray-800">
                <div className="flex items-center gap-2 text-primary-500 font-bold text-xl tracking-wider">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                    </svg>
                    WANISTREAM
                </div>
            </div>

            <nav className="flex-1 py-6 space-y-1">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`nav-item flex items-center px-6 py-3 text-sm font-medium transition-colors ${location.pathname === item.path
                            ? 'active'
                            : 'text-gray-400 hover:text-white hover:bg-dark-700'
                            }`}
                    >
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {getIcon(item.icon)}
                        </svg>
                        {item.label}
                    </Link>
                ))}
            </nav>
        </aside>
    );
}
