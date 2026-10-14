import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

// ── Validation icon for first column ──────────────────────────────
export default function ValidationIcon({ prospectId, validationMap, prospect }) {
    const validation = validationMap[prospectId];
    if (validation) {
        if (validation.status === 'valid') return (
            <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full" title="Valid">
                <CheckCircle className="w-3.5 h-3.5" />
            </span>
        );
        if (validation.status === 'warning') return (
            <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-100 text-amber-600 rounded-full" title={validation.issues.join(', ')}>
                <AlertTriangle className="w-3.5 h-3.5" />
            </span>
        );
        return (
            <span className="inline-flex items-center justify-center w-5 h-5 bg-rose-100 text-rose-600 rounded-full" title={validation.issues.join(', ')}>
                <XCircle className="w-3.5 h-3.5" />
            </span>
        );
    }
    // Fallback: use consent_status
    if (prospect?.consent_status === 'OPT_IN') return (
        <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-100 rounded-full" title="Active">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
        </span>
    );
    return (
        <span className="inline-flex items-center justify-center w-5 h-5 bg-rose-100 rounded-full" title="Opted Out">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
        </span>
    );
}
