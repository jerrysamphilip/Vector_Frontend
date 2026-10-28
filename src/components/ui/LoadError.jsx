import { AlertTriangle, RotateCw } from 'lucide-react';
import { errorMessage, errorReference } from '../../lib/apiErrors';

// A failed load: says so (instead of an empty state), shows the API's message and request reference,
// and offers Retry. compact renders a smaller block for use inside a card or tab.
export default function LoadError({ error, onRetry, title = "Couldn't load this", compact = false, className = '' }) {
    const message = errorMessage(error);
    const reference = errorReference(error);
    return (
        <div
            role="alert"
            className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-16 px-6'} ${className}`}
        >
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-slate-900 font-semibold">{title}</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md">{message}</p>
            {reference && (
                <p className="text-xs text-slate-400 mt-2">Reference: <span className="font-mono select-all">{reference}</span></p>
            )}
            {onRetry && (
                <button
                    type="button"
                    onClick={() => onRetry()}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
                >
                    <RotateCw className="w-4 h-4" />
                    Retry
                </button>
            )}
        </div>
    );
}
