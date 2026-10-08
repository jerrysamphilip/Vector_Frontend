import { Loader2 } from 'lucide-react';

/** Mini bar sparkline drawn on the coloured tile (decorative). */
function Bars({ color }) {
    const h = [8, 14, 10, 18, 12, 20, 15, 24];
    return (
        <svg width="54" height="26" viewBox="0 0 54 26" aria-hidden="true">
            {h.map((v, i) => <rect key={i} x={i * 7} y={26 - v} width="4" height={v} rx="1.5" fill={color} />)}
        </svg>
    );
}

/** Headline number tile in the Outreach360 colour theme: a brand-coloured gradient card. */
export default function KpiTile({ label, value, sub, from = '#2d6bbf', to = '#1f56aa', dark = false, link, targetTab, onTabChange, loading }) {
    const main = dark ? '#1f4a85' : '#ffffff';
    const muted = dark ? 'rgba(31,74,133,0.7)' : 'rgba(255,255,255,0.8)';
    return (
        <div className="rounded-xl px-4 py-3.5 shadow-sm hover:shadow-md transition-shadow flex items-end justify-between gap-2"
            style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
            <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: muted }}>{label}</p>
                <p className="text-2xl font-bold tracking-tight tabular-nums mt-1" style={{ color: main }}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : value}
                </p>
                {sub && <p className="text-xs mt-0.5 truncate" style={{ color: muted }}>{sub}</p>}
                {link && (
                    <button onClick={() => onTabChange && targetTab && onTabChange(targetTab)} className="mt-1.5 text-xs font-semibold hover:underline" style={{ color: main }}>
                        {link}
                    </button>
                )}
            </div>
            <div className="opacity-60 shrink-0"><Bars color={dark ? 'rgba(31,74,133,0.35)' : 'rgba(255,255,255,0.6)'} /></div>
        </div>
    );
}
