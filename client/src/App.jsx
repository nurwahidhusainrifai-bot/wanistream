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

import ErrorBoundary from './components/ErrorBoundary';

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
