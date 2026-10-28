import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';

function formatLeft(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
}

/** "You will be signed out soon" panel with a countdown, shown by AuthProvider before the idle limit. */
export default function IdleWarning({ until, onStay, onSignOut }) {
    const [now, setNow] = useState(() => Date.now());
    const stayRef = useRef(null);
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);
    useEffect(() => { stayRef.current?.focus(); }, []);

    return (
        <div
            role="alertdialog"
            aria-modal="false"
            aria-labelledby="idle-warning-title"
            aria-describedby="idle-warning-text"
            data-testid="idle-warning"
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[210] w-[calc(100%-2rem)] max-w-md rounded-xl border border-amber-200 bg-white px-5 py-4 shadow-xl"
        >
            <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                    <p id="idle-warning-title" className="text-sm font-semibold text-slate-900">Are you still there?</p>
                    <p id="idle-warning-text" className="text-sm text-slate-600 mt-0.5">
                        For your security you will be signed out in <span className="font-mono">{formatLeft(until - now)}</span> because of inactivity.
                    </p>
                    <div className="mt-3 flex gap-2 justify-end">
                        <button type="button" onClick={onSignOut}
                            className="px-3 h-8 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
                            Sign out
                        </button>
                        <button type="button" ref={stayRef} onClick={onStay}
                            className="px-3 h-8 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700">
                            Stay signed in
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
