import KpiTile from '../ui/KpiTile';
import { localISODate } from '../../lib/dates';

// Analytics & Reports (pages/Reports.jsx): date-range helpers and the shared skeleton / KPI cards.

// ── Date helpers ────────────────────────────────────────────────
export const DATE_RANGES = [
    { label: '7d',   days: 7   },
    { label: '30d',  days: 30  },
    { label: '90d',  days: 90  },
    { label: '365d', days: 365 },
];

export function formatDateRange(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    return {
        start_date: localISODate(start),
        end_date:   localISODate(end),
    };
}

export function formatDateLabel(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    const fmt = d => d.toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
}

export function formatHours(h) {
    if (!h || h <= 0) return '—';
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    if (hrs === 0) return `${mins}m`;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

// ── Skeleton ────────────────────────────────────────────────────
export function Skeleton({ className = '' }) {
    return <div className={`bg-slate-200 animate-pulse rounded-lg ${className}`} />;
}

// ── Bar sparkline (same as Dashboard) ──────────────────────────
// ── Wave sparkline (same as Dashboard) ─────────────────────────
// ── Gradient Card (identical to Dashboard) ──────────────────────
export function GradientCard(props) {
    return <KpiTile {...props} />;
}

// ── Mini icon KPI card ──────────────────────────────────────────
export function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor, loading, animDelay = '0ms' }) {
    return (
        <div className="card-anim bg-white/80 rounded-2xl shadow-sm p-5" style={{ animationDelay: animDelay }}>
            <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                    <Icon style={{ width: 18, height: 18 }} className={iconColor} />
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
            </div>
            {loading ? (
                <><Skeleton className="h-7 w-20 mb-1.5" /><Skeleton className="h-3 w-28" /></>
            ) : (
                <>
                    <div className="text-2xl font-bold" style={{ color: '#0046FF' }}>
                        {typeof value === 'number' ? value.toLocaleString() : (value ?? 0)}
                    </div>
                    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
                </>
            )}
        </div>
    );
}
