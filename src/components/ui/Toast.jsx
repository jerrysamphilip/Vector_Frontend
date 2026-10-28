import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { errorMessage, errorReference } from '../../lib/apiErrors';

// Toasts (F-09): short notices after an action, instead of window.alert.
//
//   const toast = useToast();
//   toast.success('Report saved');
//   toast.info('Sync started');
//   toast.error(error);                       // an API error: friendly text + request reference
//   toast.error('Export failed', { reference: 'req-1' });
//
// Accessible: success/info toasts are added to a polite live region, errors to an assertive one (always in
// the page, so screen readers announce what is added; no role=alert on the empty regions). Success/info dismiss after 5 s, errors after 10 s (hover keeps them);
// each has a close button. Without a ToastProvider (isolated component tests) the calls do nothing.

const ToastContext = createContext(null);

const DURATION = { success: 5000, info: 5000, error: 10000 };
const MAX_TOASTS = 5;
let nextId = 1;

const NOOP_API = Object.freeze({ show: () => 0, success: () => 0, info: () => 0, error: () => 0, dismiss: () => {} });

function toToast(type, input, options = {}) {
    const isText = typeof input === 'string';
    const message = type === 'error' && !isText ? errorMessage(input, options.fallback) : String(input ?? '');
    const reference = options.reference ?? (type === 'error' && !isText ? errorReference(input) : undefined);
    return {
        id: nextId++,
        type,
        title: options.title,
        message,
        reference,
        duration: options.duration ?? DURATION[type],
    };
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const dismiss = useCallback((id) => setToasts(list => list.filter(t => t.id !== id)), []);
    const show = useCallback((type, input, options) => {
        const toast = toToast(type, input, options);
        setToasts(list => [...list, toast].slice(-MAX_TOASTS));
        return toast.id;
    }, []);

    const api = useMemo(() => ({
        show,
        success: (input, options) => show('success', input, options),
        info: (input, options) => show('info', input, options),
        error: (input, options) => show('error', input, options),
        dismiss,
    }), [show, dismiss]);

    const polite = toasts.filter(t => t.type !== 'error');
    const assertive = toasts.filter(t => t.type === 'error');

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="fixed bottom-4 right-4 z-[200] flex flex-col items-end gap-2 pointer-events-none max-w-[calc(100vw-2rem)] w-96">
                <div aria-live="polite" aria-relevant="additions" data-testid="toast-region-polite" className="flex flex-col gap-2 w-full">
                    {polite.map(t => <ToastItem key={t.id} toast={t} onDismiss={dismiss} />)}
                </div>
                <div aria-live="assertive" aria-relevant="additions" data-testid="toast-region-assertive" className="flex flex-col gap-2 w-full">
                    {assertive.map(t => <ToastItem key={t.id} toast={t} onDismiss={dismiss} />)}
                </div>
            </div>
        </ToastContext.Provider>
    );
}

const STYLE = {
    success: { icon: CheckCircle2, color: 'text-emerald-600', border: 'border-emerald-200' },
    info: { icon: Info, color: 'text-indigo-600', border: 'border-indigo-200' },
    error: { icon: AlertTriangle, color: 'text-red-600', border: 'border-red-200' },
};

export function ToastItem({ toast, onDismiss }) {
    const { id, type, title, message, reference, duration } = toast;
    const [paused, setPaused] = useState(false);
    const onDismissRef = useRef(onDismiss);
    useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);

    useEffect(() => {
        if (paused || !duration) return undefined;
        const timer = setTimeout(() => onDismissRef.current(id), duration);
        return () => clearTimeout(timer);
    }, [id, duration, paused]);

    const { icon: Icon, color, border } = STYLE[type] || STYLE.info;
    return (
        <div
            data-testid={`toast-${type}`}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className={`pointer-events-auto w-full flex items-start gap-3 rounded-xl border ${border} bg-white px-4 py-3 shadow-lg animate-fade-in`}
        >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${color}`} aria-hidden="true" />
            <div className="flex-1 min-w-0 text-sm">
                {title && <p className="font-semibold text-slate-900">{title}</p>}
                <p className="text-slate-700 break-words">{message}</p>
                {reference && (
                    <p className="text-xs text-slate-400 mt-1">Reference: <span className="font-mono select-all">{reference}</span></p>
                )}
            </div>
            <button
                type="button"
                onClick={() => onDismiss(id)}
                className="shrink-0 p-0.5 text-slate-400 hover:text-slate-700 rounded"
                aria-label="Dismiss notification"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

/** { success, info, error, show, dismiss }; error(e) accepts an API error and shows its request reference. */
export function useToast() {
    return useContext(ToastContext) || NOOP_API;
}

export default ToastProvider;
