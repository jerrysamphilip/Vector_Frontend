import { useQuery } from '@tanstack/react-query';
import { contactsApi } from '../../api/contacts';
import { leadsApi } from '../../api/sales';
import { inputClass } from '../contacts/shared';

export const card = 'bg-white rounded-xl border border-slate-200';
export const cardShadow = {};
export const selectSm = 'h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-400';

export function useLeadsMeta() {
    const { data } = useQuery({ queryKey: ['leads-meta'], queryFn: leadsApi.meta, staleTime: 300000 });
    return data;
}

/** People whose records the viewer can see (themselves and their team). */
export function useTeamOwners() {
    const { data = [] } = useQuery({ queryKey: ['contact-owners'], queryFn: contactsApi.owners });
    return data;
}

export function PageHeader({ title, subtitle, children }) {
    return (
        <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
                {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
        </div>
    );
}

export function StatTile({ label, value, sub, tone = 'text-slate-900', onClick }) {
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag onClick={onClick} className={`${card} px-4 py-3 text-left ${onClick ? 'hover:border-indigo-200' : ''}`} style={cardShadow}>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold tracking-tight mt-1 tabular-nums ${tone}`}>{value}</p>
            {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </Tag>
    );
}

export function Seg({ options, value, onChange }) {
    return (
        <div className="flex bg-slate-100 rounded-lg p-0.5">
            {options.map(([v, label]) => (
                <button key={typeof label === 'string' ? label : v} onClick={() => onChange(v)}
                    className={`px-3 h-8 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${value === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{label}</button>
            ))}
        </div>
    );
}

export function OwnerFilter({ value, onChange, allLabel = 'Everyone I can see' }) {
    const owners = useTeamOwners();
    if (owners.length <= 1) return null;
    return (
        <select className={selectSm} value={value} onChange={e => onChange(e.target.value)} aria-label="Owner">
            <option value="">{allLabel}</option>
            <option value="me">Me</option>
            {owners.map(o => <option key={o.user_id} value={o.user_id}>{o.name}</option>)}
        </select>
    );
}

/** Report on one team member and everyone below them. */
export function MemberFilter({ value, onChange }) {
    const owners = useTeamOwners();
    if (owners.length <= 1) return null;
    return (
        <select className={selectSm} value={value} onChange={e => onChange(e.target.value)} aria-label="Team">
            <option value="">All my teams</option>
            {owners.map(o => <option key={o.user_id} value={o.user_id}>{o.name} and team</option>)}
        </select>
    );
}

export function ClientTypeFilter({ value, onChange }) {
    return (
        <select className={selectSm} value={value} onChange={e => onChange(e.target.value)} aria-label="Client type">
            <option value="">New and existing clients</option>
            <option value="NEW">New clients</option>
            <option value="EXISTING">Existing clients</option>
        </select>
    );
}

const iso = (d) => d.toISOString().slice(0, 10);
export const PERIODS = {
    '30': 'Last 30 days', '90': 'Last 90 days', '365': 'Last 12 months', month: 'This month', quarter: 'This quarter',
};
export function periodRange(key) {
    const today = new Date();
    if (key === 'month') return { date_from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), date_to: iso(today) };
    if (key === 'quarter') {
        const q = Math.floor(today.getMonth() / 3) * 3;
        return { date_from: iso(new Date(today.getFullYear(), q, 1)), date_to: iso(today) };
    }
    const from = new Date(today); from.setDate(from.getDate() - (Number(key) - 1));
    return { date_from: iso(from), date_to: iso(today) };
}
export function PeriodFilter({ value, onChange }) {
    return (
        <select className={selectSm} value={value} onChange={e => onChange(e.target.value)} aria-label="Period">
            {Object.entries(PERIODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
    );
}

export function ClientTypeBadge({ value }) {
    return value === 'EXISTING'
        ? <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700">Existing</span>
        : <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700">New</span>;
}

const LEAD_STAGE_COLORS = {
    NEW: 'bg-sky-50 text-sky-700', CONTACTED: 'bg-blue-50 text-blue-700', ENGAGED: 'bg-indigo-50 text-indigo-700',
    SQL: 'bg-violet-100 text-violet-800', CONVERTED: 'bg-emerald-50 text-emerald-700', DISQUALIFIED: 'bg-slate-100 text-slate-500',
};
export function LeadStageBadge({ stage, label }) {
    return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${LEAD_STAGE_COLORS[stage] || 'bg-slate-100 text-slate-600'}`}>{label || stage}</span>;
}

export function DealStatusBadge({ status, stageName }) {
    const cls = status === 'WON' ? 'bg-emerald-50 text-emerald-700' : status === 'LOST' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700';
    return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${cls}`}>{stageName || status}</span>;
}

/**
 * Horizontal magnitude bar: one hue, 4px rounded data end, recessive track.
 * The value and label are text, not colour; hovering shows the exact figure.
 */
export function HBar({ label, value, max, display, sub, tone = '#4f46e5', onClick }) {
    const width = max > 0 ? Math.max(value > 0 ? 1.5 : 0, (value / max) * 100) : 0;
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag onClick={onClick} className={`w-full text-left grid grid-cols-[minmax(110px,180px)_1fr_auto] items-center gap-3 py-1.5 group ${onClick ? 'cursor-pointer' : ''}`}
            title={`${label}: ${display}${sub ? ` · ${sub}` : ''}`}>
            <span className="text-sm text-slate-700 truncate">{label}</span>
            <span className="h-3 rounded bg-slate-100 overflow-hidden">
                <span className="block h-full rounded-r group-hover:opacity-80" style={{ width: `${width}%`, background: tone }} />
            </span>
            <span className="text-sm font-semibold text-slate-800 tabular-nums whitespace-nowrap">{display}{sub && <span className="font-normal text-slate-400"> · {sub}</span>}</span>
        </Tag>
    );
}

export function Empty({ icon: Icon, title, text }) {
    return (
        <div className="py-16 text-center px-6">
            {Icon && <Icon className="w-10 h-10 text-slate-300 mx-auto mb-3" />}
            <p className="font-semibold text-slate-800">{title}</p>
            {text && <p className="text-sm text-slate-500 mt-1">{text}</p>}
        </div>
    );
}

export { inputClass };
