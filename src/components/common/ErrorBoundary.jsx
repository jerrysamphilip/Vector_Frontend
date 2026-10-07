import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                    <div className="w-full max-w-4xl bg-white shadow-xl rounded-xl border border-red-100 overflow-hidden">
                        <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-red-900">Application Error</h1>
                                <p className="text-sm text-red-600">The component crashed. Please share this trace.</p>
                            </div>
                        </div>
                        <div className="p-6">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Error Message</h3>
                            <div className="bg-red-50/50 border border-red-100 rounded-lg p-3 text-red-700 font-mono text-sm mb-6">
                                {this.state.error && this.state.error.toString()}
                            </div>

                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Stack Trace</h3>
                            <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-[400px]">
                                <pre className="text-xs font-mono text-green-400 leading-relaxed whitespace-pre-wrap">
                                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
