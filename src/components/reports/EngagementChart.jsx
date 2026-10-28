import { parseApiDate } from '../../lib/dates';
import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// Reports: sent / opened / replied / bounced over time (area chart with series toggles).

// ── Area chart tooltip ──────────────────────────────────────────
export const SERIES = [
    { key: 'Sent',    color: '#0046FF', bg: 'bg-blue-50',    text: 'text-blue-700'    },
    { key: 'Opened',  color: '#73C8D2', bg: 'bg-cyan-50',    text: 'text-cyan-700'    },
    { key: 'Replied', color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    { key: 'Bounced', color: '#FF9013', bg: 'bg-orange-50',  text: 'text-orange-700'  },
];

export function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    const dt = parseApiDate(label) ?? new Date(NaN); // 'YYYY-MM-DD' = that local calendar day
    const dateStr = dt.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' });
    return (
        <div className="bg-white border border-gray-100 rounded-xl shadow-xl px-4 py-3 text-xs min-w-[140px]">
            <p className="font-semibold text-gray-600 mb-2.5 pb-2 border-b border-gray-100">{dateStr}</p>
            <div className="space-y-1.5">
                {payload.map(p => (
                    <div key={p.dataKey} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                            <span className="text-gray-500">{p.dataKey}</span>
                        </div>
                        <span className="font-bold text-gray-800">{p.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Engagement area chart card ──────────────────────────────────
export default function EngagementChart({ timeseries, loading, kpis }) {
    const [active, setActive] = useState(null);

    const data = (timeseries || []).map(pt => ({
        d:       pt.date,
        Sent:    pt.sent,
        Opened:  pt.opened,
        Replied: pt.replied,
        Bounced: pt.bounced,
    }));

    const hasData = data.some(d => d.Sent > 0 || d.Opened > 0);
    const totals = {
        Sent:    kpis?.total_emails_sent ?? 0,
        Opened:  kpis?.total_opened      ?? 0,
        Replied: kpis?.total_replied     ?? 0,
        Bounced: kpis?.total_bounced     ?? 0,
    };

    return (
        <div className="card-anim bg-white/80 rounded-2xl shadow-sm overflow-hidden" style={{ animationDelay: '200ms' }}>
            <div className="px-6 pt-6 pb-4">
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                        <p className="text-sm font-semibold text-gray-800">Email Engagement Over Time</p>
                        <p className="text-xs text-gray-400 mt-0.5">Daily breakdown for selected period</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {SERIES.map(s => (
                            <button key={s.key}
                                onClick={() => setActive(active === s.key ? null : s.key)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                                    active === null || active === s.key
                                        ? `${s.bg} ${s.text} border-transparent`
                                        : 'bg-gray-50 text-gray-400 border-gray-200'
                                }`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                    style={{ background: (active === null || active === s.key) ? s.color : '#cbd5e1' }} />
                                {s.key}
                                <span className="ml-0.5 opacity-70">{totals[s.key]}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="px-2 pb-5">
                {loading ? (
                    <div className="h-64 flex items-end gap-1 px-4 pb-2">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div key={i} className="flex-1 bg-slate-200 animate-pulse rounded-t-sm"
                                style={{ height: `${30 + Math.sin(i * 0.6) * 20 + (i % 3) * 15}%` }} />
                        ))}
                    </div>
                ) : !hasData ? (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-2">
                        <BarChart3 className="w-8 h-8 opacity-25" />
                        <p className="text-sm">No email activity in this period</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                            <defs>
                                {SERIES.map(s => (
                                    <linearGradient key={s.key} id={`rg-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor={s.color} stopOpacity={0.2} />
                                        <stop offset="95%" stopColor={s.color} stopOpacity={0}   />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                            <XAxis dataKey="d" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                                tickFormatter={d => { const dt = parseApiDate(d) ?? new Date(NaN); return `${dt.getDate()} ${dt.toLocaleString('en', { month: 'short' })}`; }}
                                interval={Math.max(0, Math.floor(data.length / 7))}
                            />
                            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={32} axisLine={false} tickLine={false}
                                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                            />
                            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
                            {SERIES.filter(s => active === null || active === s.key).map(s => (
                                <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2}
                                    fill={`url(#rg-${s.key})`} dot={false}
                                    activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: s.color }}
                                    isAnimationActive={true} animationDuration={1600} animationEasing="ease-out"
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
