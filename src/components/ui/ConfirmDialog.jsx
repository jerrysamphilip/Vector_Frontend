import { createContext, useCallback, useContext, useId, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import DialogPanel from './DialogPanel';

// Confirm dialog (F-09), instead of window.confirm:
//
//   const confirm = useConfirm();
//   if (await confirm({ title: 'Delete report?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true })) ...
//   confirm('Delete this task?').then(ok => ok && remove.mutate(id));
//
// Resolves true on the confirm button, false on Cancel / Escape / backdrop. Built on DialogPanel (Radix UI
// FocusScope + DismissableLayer, F5): role=dialog + aria-modal, focus moved to the safe choice (Cancel), Tab trap,
// focus back to the opener (or options.returnFocusRef when the opener is gone, e.g. a menu item of a closed menu).
// Without a ConfirmProvider (isolated component tests) it falls back to window.confirm.

const ConfirmContext = createContext(null);

export function ConfirmDialog({
    title = 'Are you sure?', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onCancel, returnFocusRef,
}) {
    const descriptionId = `confirm-desc-${useId().replace(/:/g, '')}`;
    const titleId = `${descriptionId}-title`;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40" onClick={onCancel} aria-hidden="true" />
            <DialogPanel
                onClose={onCancel}
                returnFocusRef={returnFocusRef}
                labelledBy={titleId}
                aria-describedby={message ? descriptionId : undefined}
                className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
                <div className="flex items-start gap-3">
                    {danger && (
                        <div className="w-10 h-10 shrink-0 rounded-full bg-red-50 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-500" aria-hidden="true" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <h2 id={titleId} className="text-base font-semibold text-slate-900">{title}</h2>
                        {message && <p id={descriptionId} className="mt-1 text-sm text-slate-600 whitespace-pre-line">{message}</p>}
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        data-autofocus
                        onClick={onCancel}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </DialogPanel>
        </div>
    );
}

function normalise(options) {
    return typeof options === 'string' ? { message: options } : (options || {});
}

export function ConfirmProvider({ children }) {
    const [request, setRequest] = useState(null);
    const current = useRef(null);
    const queue = useRef([]);
    const seq = useRef(0);

    const settle = useCallback((value) => {
        const done = current.current;
        current.current = queue.current.shift() || null;
        setRequest(current.current);
        done?.resolve(value);
    }, []);

    const confirm = useCallback((options) => new Promise((resolve) => {
        seq.current += 1;
        const next = { ...normalise(options), resolve, id: seq.current };
        if (current.current) { queue.current.push(next); return; }
        current.current = next;
        setRequest(next);
    }), []);

    const { resolve: _resolve, id, ...dialog } = request || {};
    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {request && (
                <ConfirmDialog
                    key={id}
                    {...dialog}
                    onConfirm={() => settle(true)}
                    onCancel={() => settle(false)}
                />
            )}
        </ConfirmContext.Provider>
    );
}

function windowConfirm(options) {
    const { title, message } = normalise(options);
    const text = [title, message].filter(Boolean).join('\n\n');
    return Promise.resolve(typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm(text) : false);
}

/** confirm(options | message) => Promise<boolean>. options: title, message, confirmLabel, cancelLabel, danger, returnFocusRef. */
export function useConfirm() {
    return useContext(ConfirmContext) || windowConfirm;
}

export default ConfirmDialog;
