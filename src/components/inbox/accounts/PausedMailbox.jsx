import { PauseCircle, PlayCircle } from 'lucide-react';

// Paused mailbox (F-20): a "Paused" badge whose tooltip gives the reason and since when, and the
// "Resume sending" action (POST /inboxes/{id}/resume, admins with manage_inboxes).

export function PausedBadge({ inbox }) {
    const since = inbox.paused_at ? ` (since ${new Date(inbox.paused_at).toLocaleString()})` : '';
    const reason = inbox.paused_reason || 'Paused';
    return (
        <span title={`${reason}${since}`} data-testid="paused-badge"
            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 rounded">
            <PauseCircle size={10} aria-hidden="true" /> Paused
        </span>
    );
}

export function ResumeButton({ onResume, busy = false, compact = false }) {
    return (
        <button type="button" onClick={onResume} disabled={busy}
            title="Resume sending from this mailbox" aria-label="Resume sending"
            className={`inline-flex items-center gap-1 rounded-lg font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 ${compact ? 'p-1.5 text-[11px]' : 'px-3 py-1.5 text-xs border border-emerald-200'}`}>
            <PlayCircle size={13} aria-hidden="true" />
            {busy ? 'Resuming…' : (compact ? null : 'Resume sending')}
        </button>
    );
}
