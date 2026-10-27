import { motion } from 'framer-motion';
import { KeyRound, Pencil, Trash2 } from 'lucide-react';
import { IssueBadge, PoolBadge, ReputationRing, Toggle, providerStyle } from './shared';
import { PausedBadge, ResumeButton } from './PausedMailbox';
import { isPaused } from './useEmailAccounts';

// Sent today against today's capacity (limit capped by pacing, F-20); older API: the counter and limit
export function sendingCapacity(inbox) {
    const sent = inbox.sent_today ?? inbox.emails_sent_today ?? 0;
    const capacity = inbox.daily_capacity ?? inbox.current_daily_limit ?? inbox.daily_limit ?? 0;
    const pct = capacity ? Math.min(Math.round((sent / capacity) * 100), 100) : 0;
    return { sent, capacity, pct, remaining: inbox.remaining_today ?? Math.max(capacity - sent, 0) };
}

// ─── Inbox Row (table-style, matching dashboard card patterns) ────────────────
export default function InboxRow({ inbox, isSelected, onSelect, onEdit, onDelete, onToggleWarmup, isUpdating, onConnectMs365,
    onResume, isResuming = false }) {
    const ps = providerStyle(inbox.provider);
    const { sent, capacity, pct: sentPct, remaining } = sendingCapacity(inbox);
    const paused = isPaused(inbox);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => onSelect(inbox.inbox_id)}
            className={`grid grid-cols-[minmax(200px,1fr)_165px_110px_180px_90px_130px] gap-3 items-center px-5 py-3.5 cursor-pointer transition-all border-b border-gray-50 min-w-[980px]
                ${isSelected
                    ? 'bg-[#eff3ff]/60'
                    : 'hover:bg-gray-50/60'
                }`}
        >
            {/* Account */}
            <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                     style={{ backgroundColor: ps.bg, color: ps.color }}>
                    {ps.initial}
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{inbox.email_address}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <PoolBadge pool={inbox.warmup_pool || 'FOUNDATION'}/>
                        <span className="text-[10px] text-gray-400">Day {inbox.warmup_day || 0}</span>
                        {inbox.auth_type === 'OAUTH_MS365' && <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 rounded">Microsoft 365</span>}
                        {paused && <PausedBadge inbox={inbox} />}
                    </div>
                    {paused && inbox.paused_reason && (
                        <p className="text-[10px] text-amber-700 truncate max-w-[260px]" title={inbox.paused_reason}>{inbox.paused_reason}</p>
                    )}
                    {(inbox.oauth_error || inbox.imap_last_error) && (
                        <p className="text-[10px] text-red-600 truncate max-w-[260px]" title={inbox.oauth_error || inbox.imap_last_error}>
                            {inbox.oauth_error ? 'Sign-in problem: ' : 'Reply sync failing: '}{inbox.oauth_error || inbox.imap_last_error}
                        </p>
                    )}
                </div>
            </div>

            {/* Status */}
            <IssueBadge code={inbox.warmup_issue_code} warmupEnabled={Boolean(inbox.warmup_enabled)}/>

            {/* Provider */}
            <span className="text-xs font-medium text-gray-500 capitalize">{inbox.provider || 'SMTP'}</span>

            {/* Sent progress */}
            <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                    <span>Sent</span>
                    <span className="font-medium text-gray-600"
                        title={`Up to ${capacity} emails a day (daily limit and pacing); ${remaining} left today`}>
                        {sent} / {capacity}
                    </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                         style={{
                             width: `${sentPct}%`,
                             background: sentPct > 85 ? '#ef4444' : 'linear-gradient(90deg,#0046FF,#73C8D2)',
                         }}/>
                </div>
            </div>

            {/* Reputation */}
            <div className="flex justify-center">
                <ReputationRing value={inbox.warmup_reputation} size={38}/>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                {paused && onResume && <ResumeButton onResume={() => onResume(inbox)} busy={isResuming} compact />}
                <Toggle
                    checked={Boolean(inbox.warmup_enabled)}
                    onChange={() => onToggleWarmup(inbox)}
                    disabled={isUpdating}
                />
                <button onClick={() => onConnectMs365(inbox)} title={inbox.auth_type === 'OAUTH_MS365' ? 'Reconnect Microsoft 365' : 'Connect with Microsoft 365 (OAuth)'}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-sky-50 hover:text-sky-700">
                    <KeyRound size={13}/>
                </button>
                <button onClick={() => onEdit(inbox)} title="Edit sending & receiving settings" aria-label="Edit sending and receiving settings"
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-[#eff3ff] hover:text-[#0046FF]">
                    <Pencil size={13}/>
                </button>
                <button onClick={() => onDelete(inbox)}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={13}/>
                </button>
            </div>
        </motion.div>
    );
}
