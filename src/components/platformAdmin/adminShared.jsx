import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import KpiTile from '../ui/KpiTile';

// Platform admin console (pages/PlatformAdmin.jsx): cards, badges, error banner and formatting helpers.

export function Skeleton({ className = '' }) {
    return <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />;
}

export function GradientCard(props) {
    return <KpiTile {...props} />;
}

export function SectionCard({ title, subtitle, icon: Icon, children, delay = '0ms', action = null }) {
    return (
        <div className="card-anim overflow-hidden rounded-[24px] bg-white/85 shadow-sm ring-1 ring-slate-100" style={{ animationDelay: delay }}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                    <span
                        className="flex h-10 w-10 items-center justify-center rounded-2xl"
                        style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.12), rgba(115,200,210,0.18))' }}
                    >
                        <Icon className="h-5 w-5 text-[#2d6bbf]" />
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-slate-800">{title}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
                    </div>
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}

export function StatusBadge({ status }) {
    const normalized = (status || '').toUpperCase();
    const cls = normalized === 'ACTIVE'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : normalized === 'SUSPENDED'
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : normalized === 'INVITED'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-slate-50 text-slate-600 border-slate-200';

    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${cls}`}>
            {normalized === 'ACTIVE' && <CheckCircle2 className="h-3 w-3" />}
            {normalized === 'SUSPENDED' && <XCircle className="h-3 w-3" />}
            {normalized === 'INVITED' && <AlertTriangle className="h-3 w-3" />}
            {normalized}
        </span>
    );
}

export function RoleBadge({ role }) {
    const tones = {
        SUPER_ADMIN: 'bg-violet-50 text-violet-700',
        ADMIN: 'bg-blue-50 text-blue-700',
        MANAGER: 'bg-emerald-50 text-emerald-700',
        AGENT: 'bg-slate-100 text-slate-700',
        VIEWER: 'bg-amber-50 text-amber-700',
    };

    return (
        <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${tones[role] || 'bg-slate-100 text-slate-700'}`}>
            {role?.replace('_', ' ')}
        </span>
    );
}

export function StatPill({ label, value }) {
    return (
        <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
    );
}

export function formatDate(dateValue) {
    if (!dateValue) return '—';
    return new Date(dateValue).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}
export function ErrorBanner({ message }) {
    if (!message) return null;
    return (
        <div role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {message}
        </div>
    );
}

export const errDetail = (e, fallback) => {
    const d = e?.response?.data?.detail;
    return typeof d === 'string' ? d : fallback;
};
