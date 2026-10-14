import KpiTile from '../../ui/KpiTile';

// Shared constants and small presentational pieces of the Email Accounts page (pages/EmailAccounts.jsx).

// ─── Constants ────────────────────────────────────────────────────────────────
export const DEFAULT_OVERVIEW = {
    total_accounts: 0, warmup_enabled: 0, accounts_with_issues: 0,
    average_reputation: 0, current_pool: 'FOUNDATION', pool_growth_score: 0,
    planned_today: 0, warmup_sent_today: 0, warmup_replied_today: 0, saved_today: 0,
};

export const POOL_STYLES = {
    ULTRA_PREMIUM: { bg: '#ecfdf5', border: '#6ee7b7', color: '#065f46', label: 'Ultra Premium' },
    PREMIUM:       { bg: '#eff3ff', border: '#c7d2fe', color: '#0046FF', label: 'Premium' },
    GROWTH:        { bg: '#e0f7fa', border: '#67e8f9', color: '#0e7490', label: 'Growth' },
    FOUNDATION:    { bg: '#f8fafc', border: '#cbd5e1', color: '#64748b', label: 'Foundation' },
};

export const PROVIDER_COLORS = {
    gmail:     { bg: '#fce8e8', color: '#d93025', initial: 'G' },
    google:    { bg: '#fce8e8', color: '#d93025', initial: 'G' },
    outlook:   { bg: '#e8f0fe', color: '#0072c6', initial: 'O' },
    sendgrid:  { bg: '#e8f5e9', color: '#1a73e8', initial: 'S' },
    ses:       { bg: '#fff3e0', color: '#f57c00', initial: 'A' },
    smtp:      { bg: '#eff3ff', border: '#c7d2fe', color: '#0046FF', initial: '#' },
};

export function providerStyle(provider) {
    return PROVIDER_COLORS[(provider || '').toLowerCase()] || PROVIDER_COLORS.smtp;
}

// ─── Tiny sub-components ──────────────────────────────────────────────────────

export function ReputationRing({ value, size = 56 }) {
    const pct = Math.min(Math.max(Number(value || 0), 0), 100);
    const r   = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    const color = pct >= 92 ? '#0046FF' : pct >= 75 ? '#FF9013' : '#ef4444';
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="5"/>
            <circle cx={size/2} cy={size/2} r={r}
                fill="none" stroke={color} strokeWidth="5"
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                transform={`rotate(-90 ${size/2} ${size/2})`}
                style={{ transition: 'stroke-dasharray 0.6s ease' }}/>
            <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: size * 0.21, fontWeight: 700, fill: color }}>
                {pct}
            </text>
        </svg>
    );
}

export function Toggle({ checked, onChange, disabled = false }) {
    return (
        <button type="button" onClick={onChange} disabled={disabled}
            style={checked ? { backgroundColor: '#0046FF' } : {}}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0
                ${!checked ? 'bg-gray-200' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform
                ${checked ? 'translate-x-[18px]' : 'translate-x-[2px]'}`}/>
        </button>
    );
}

// Dashboard-style gradient KPI card with sparkline
export function GradientKpi(props) {
    return <KpiTile {...props} />;
}

export function PoolBadge({ pool }) {
    const s = POOL_STYLES[pool] || POOL_STYLES.FOUNDATION;
    return (
        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: s.bg, borderColor: s.border, color: s.color }}>
            {s.label}
        </span>
    );
}

export function IssueBadge({ code, warmupEnabled = true }) {
    if (!warmupEnabled) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"/>Warmup Disabled
            </span>
        );
    }
    if (!code) return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Healthy
        </span>
    );
    const critical = ['POOL_TOO_SMALL','SEND_FAILED','MAILBOX_PAUSED'].includes(code);
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold
            ${critical ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${critical ? 'bg-red-500' : 'bg-amber-500'}`}/>
            {code.replaceAll('_',' ')}
        </span>
    );
}

export function EventRow({ event }) {
    const typeColors = {
        SENT:           { bg: '#eff3ff', color: '#0046FF', border: '#c7d2fe' },
        RECEIVED:       { bg: '#e0f7fa', color: '#0e7490', border: '#67e8f9' },
        OPENED:         { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
        REPLIED:        { bg: '#eff3ff', color: '#0046FF', border: '#c7d2fe' },
        SAVED_FROM_SPAM:{ bg: '#fff7ed', color: '#FF9013', border: '#fdba74' },
        ISSUE:          { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
    };
    const s = typeColors[event.event_type] || typeColors.SENT;
    const failed = event.status === 'FAILED';
    const ts = new Date(event.event_time);
    const timeStr = ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <div className={`flex gap-3 rounded-xl border p-3 ${failed ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white'}`}>
            <span className="mt-0.5 rounded-lg border px-2 py-0.5 text-[10px] font-bold shrink-0"
                  style={failed ? { bg:'#fef2f2', color:'#dc2626', borderColor:'#fca5a5' } : { backgroundColor: s.bg, color: s.color, borderColor: s.border }}>
                {event.event_type.replace('_',' ')}
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-800">{event.subject || 'Warmup event'}</p>
                <p className="mt-0.5 text-[11px] text-gray-500 line-clamp-1">{event.detail}</p>
            </div>
            <div className="shrink-0 text-right">
                <p className="text-[11px] font-medium text-gray-400">{timeStr}</p>
                <p className="text-[10px] text-gray-300">{dateStr}</p>
            </div>
        </div>
    );
}

// ─── Detail panel tabs ────────────────────────────────────────────────────────
export const TABS = ['Overview', 'Connection', 'Settings', 'Activity'];

export const errorText = (err, fallback) => {
    const d = err?.response?.data?.detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) return d.map(x => x.msg).filter(Boolean).join('; ') || fallback;
    return fallback;
};
