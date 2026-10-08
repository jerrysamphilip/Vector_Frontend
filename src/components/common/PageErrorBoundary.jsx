import React from 'react';

/** Keeps the app shell usable when one screen crashes; resets when the route changes (key). */
export default class PageErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error('Page crashed:', error, info?.componentStack);
    }

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <div role="alert" className="max-w-xl mx-auto mt-16 bg-white border border-slate-200 rounded-xl p-6 text-center shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Something went wrong on this screen</h2>
                <p className="text-sm text-slate-500 mt-1">The rest of the app still works. Try again, or go to another screen.</p>
                <button onClick={() => this.setState({ error: null })}
                    className="mt-4 h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">Try again</button>
            </div>
        );
    }
}
