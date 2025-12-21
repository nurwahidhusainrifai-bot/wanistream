import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function Header() {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatDate = () => {
        // Format: "Rabu, 04 Desember 2024 | 23:15:30"
        const day = format(currentTime, 'EEEE', { locale: idLocale });
        const date = format(currentTime, 'dd MMMM yyyy', { locale: idLocale });
        const time = format(currentTime, 'HH:mm:ss');
        return `${day}, ${date} | ${time}`;
    };

    return (
        <header className="h-16 bg-dark-800/50 backdrop-blur-md border-b border-gray-800 flex items-center justify-between px-8">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold text-white">Dashboard</h1>
            </div>

            {/* Live Clock */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-dark-700/50 border border-gray-700/50">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-sm font-mono text-gray-300">{formatDate()}</span>
            </div>

            <div className="flex items-center gap-4">
                <button className="p-2 text-gray-400 hover:text-white relative">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                    </svg>
                </button>
            </div>
        </header>
    );
}
