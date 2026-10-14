import KpiTile from '../ui/KpiTile';

// Dashboard: chart tooltip and the gradient KPI card.

// ─── Custom Area Tooltip ──────────────────────────────────────────────────────
export function AreaTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-100 shadow-xl rounded-xl p-3 text-xs">
            <p className="font-semibold text-gray-600 mb-2">{label}</p>
            {payload.map(p => (
                <div key={p.dataKey} className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-gray-500">{p.dataKey}</span>
                    <span className="font-bold text-gray-800 ml-2">{p.value.toLocaleString()}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Gradient Card with hover-replay sparkline ───────────────────────────────
export function GradientCard(props) {
    return <KpiTile {...props} />;
}
