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
                <div className="flex flex-col items-center justify-center min-h-screen bg-dark-900 text-white p-8">
                    <div className="bg-dark-800 p-6 rounded-xl border border-red-500/50 max-w-2xl w-full">
                        <h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h1>
                        <p className="text-gray-300 mb-4">Aplikasi mengalami error tampilan. Mohon screenshot ini dan kirim ke developer.</p>

                        <div className="bg-black/50 p-4 rounded-lg overflow-auto max-h-60 mb-4">
                            <code className="text-red-400 font-mono text-sm block mb-2">
                                {this.state.error && this.state.error.toString()}
                            </code>
                            <pre className="text-gray-500 font-mono text-xs whitespace-pre-wrap">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white font-medium"
                        >
                            Refresh Halaman
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
