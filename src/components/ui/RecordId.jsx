import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** A record's ID, read-only, with a copy button (CM-02). */
export default function RecordId({ id, label = 'Record ID' }) {
    const [copied, setCopied] = useState(false);
    if (!id) return null;
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(id);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard unavailable: the ID stays selectable */ }
    };
    return (
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5" data-testid="record-id">
            <span>{label}:</span>
            <code className="font-mono text-slate-500 select-all break-all">{id}</code>
            <button type="button" onClick={copy} aria-label={copied ? 'Copied' : `Copy ${label.toLowerCase()}`}
                title={copied ? 'Copied' : 'Copy'} className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
        </p>
    );
}
