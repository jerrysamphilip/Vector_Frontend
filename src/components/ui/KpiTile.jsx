import { Loader2 } from 'lucide-react';

// The older pages passed gradient colours; map them onto the calmer palette.
const ACCENTS = {
    '#2d6bbf': '#4f46e5', '#0046ff': '#4f46e5', '#f5f1dc': '#64748b', '#ff9013': '#d97706', '#73c8d2': '#0d9488',
};

/** Headline number tile used across the outreach pages (replaces the old gradient cards). */
export default function KpiTile({ label, value, sub, from, link, targetTab, onTabChange, loading }) {
    const accent = ACCENTS[(from || '').toLowerCase()] || '#4f46e5';
    return (
        <div className="relative bg-white rounded-xl border border-slate-200 px-4 py-3.5 overflow-hidden">
            <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r" style={{ background: accent }} />
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold tracking-tight tabular-nums text-slate-900 mt-1">
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-300" /> : value}
            </p>
            {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
            {link && (
                <button onClick={() => onTabChange && targetTab && onTabChange(targetTab)} className="mt-2 text-xs font-semibold hover:underline" style={{ color: accent }}>
                    {link}
                </button>
            )}
        </div>
    );
}
