import { useEffect, useState } from 'react';
import { AlertTriangle, RotateCw, X } from 'lucide-react';
import { subscribeStaleVersion } from '../../lib/staleVersion';

/**
 * App-wide notice for 409 STALE_VERSION (rule T-3, lib/staleVersion.js): someone else changed the record
 * this screen was editing. Reload reloads the page so every form starts again from the latest version.
 */
export default function StaleVersionBanner({ onReload }) {
    const [notice, setNotice] = useState(null);
    useEffect(() => subscribeStaleVersion(setNotice), []);
    if (!notice) return null;
    const reload = () => {
        setNotice(null);
        if (onReload) onReload();
        else window.location.reload();
    };
    return (
        <div role="alert" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-[min(36rem,calc(100%-2rem))] rounded-xl border border-amber-300 bg-amber-50 shadow-lg px-4 py-3 flex items-start gap-3 text-sm text-amber-900">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
            <p className="flex-1">{notice.message}</p>
            <button type="button" onClick={reload} className="inline-flex items-center gap-1 font-semibold text-amber-900 hover:underline">
                <RotateCw className="w-4 h-4" aria-hidden="true" /> Reload
            </button>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="text-amber-700 hover:text-amber-900">
                <X className="w-4 h-4" aria-hidden="true" />
            </button>
        </div>
    );
}
