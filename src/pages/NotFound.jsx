import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Shown for an unknown address inside the app (instead of silently redirecting Home)
export default function NotFound() {
    const { pathname } = useLocation();
    return (
        <div className="flex flex-col items-center justify-center text-center py-24 px-4">
            <p className="text-sm font-semibold text-indigo-600">404</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Page not found</h1>
            <p className="mt-2 text-sm text-slate-500 break-all">There is no page at <span className="font-mono">{pathname}</span>.</p>
            <Link to="/app/dashboard" className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
        </div>
    );
}
