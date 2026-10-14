import { Mail, Users } from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from './reportWidgets';

// Reports: campaign status and lead (new vs follow-up) donuts.

// ── Campaign status donut ───────────────────────────────────────

export function CampaignDonut({ stats, loading }) {
    const rows = [
        { label: 'Active',    value: stats?.active    ?? 0, color: '#0046FF' },
        { label: 'Paused',    value: stats?.paused    ?? 0, color: '#73C8D2' },
        { label: 'Draft',     value: stats?.drafted   ?? 0, color: '#F5F1DC' },
        { label: 'Completed', value: stats?.completed ?? 0, color: '#FF9013' },
    ];
    const total = stats?.total_campaigns ?? 0;
    const pieData = rows.filter(r => r.value > 0).map(r => ({ name: r.label, value: r.value || 0, color: r.color }));

    return (
        <div className="card-anim bg-white/80 rounded-2xl shadow-sm p-6" style={{ animationDelay: '240ms' }}>
            <div className="flex items-center gap-2.5 mb-1">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}>
                    <Mail className="w-3.5 h-3.5" style={{ color: '#2d6bbf' }} />
                </div>
                <p className="text-sm font-semibold text-gray-800">Campaign Status</p>
            </div>
            <p className="text-xs text-gray-400 mb-4">Breakdown of all campaigns</p>

            {loading ? (
                <div className="flex justify-center"><Skeleton className="w-32 h-32 rounded-full" /></div>
            ) : (
                <div className="flex justify-center relative">
                    <PieChart width={160} height={160}>
                        <Pie data={pieData} cx={75} cy={75} innerRadius={44} outerRadius={68}
                            paddingAngle={3} dataKey="value" strokeWidth={0}>
                            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                    </PieChart>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-gray-900">{total}</span>
                        <span className="text-xs text-gray-400">total</span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-4">
                {rows.map(r => (
                    <div key={r.label} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
                        <span className="text-xs text-gray-500">{r.label}</span>
                        <span className="text-xs font-semibold text-gray-800 ml-auto">{r.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Lead stats donut ────────────────────────────────────────────
export const PIE_COLORS = ['#0046FF', '#73C8D2'];

export function LeadDonut({ leadStats, loading }) {
    const total    = leadStats?.total_leads_contacted ?? 0;
    const newLeads = leadStats?.new_leads_reached     ?? 0;
    const followUp = leadStats?.follow_up_leads       ?? 0;
    const newPct   = total > 0 ? Math.round((newLeads / total) * 100) : 0;
    const fuPct    = total > 0 ? 100 - newPct : 0;
    const pieData  = [
        { name: 'New Leads', value: newLeads || 0 },
        { name: 'Follow-up', value: followUp || 0 },
    ];

    return (
        <div className="card-anim bg-white/80 rounded-2xl shadow-sm p-6" style={{ animationDelay: '360ms' }}>
            <div className="flex items-center gap-2.5 mb-1">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}>
                    <Users className="w-3.5 h-3.5" style={{ color: '#2d6bbf' }} />
                </div>
                <p className="text-sm font-semibold text-gray-800">Lead Distribution</p>
            </div>
            <p className="text-xs text-gray-400 mb-3">New vs follow-up leads contacted</p>

            {loading ? (
                <Skeleton className="h-8 w-16 mb-4" />
            ) : (
                <p className="text-3xl font-bold mb-4" style={{ color: '#0046FF' }}>{total.toLocaleString()}</p>
            )}

            <div className="flex items-center gap-5">
                {loading ? (
                    <Skeleton className="w-24 h-24 rounded-full" />
                ) : (
                    <PieChart width={100} height={100}>
                        <Pie data={pieData.map(p => ({ ...p, value: p.value || 0.01 }))}
                            cx={45} cy={45} innerRadius={28} outerRadius={45} paddingAngle={3}
                            dataKey="value" strokeWidth={0}>
                            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                        </Pie>
                    </PieChart>
                )}
                <div className="space-y-3 flex-1">
                    <div>
                        <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-gray-500 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: '#0046FF' }} />
                                New Leads
                            </span>
                            <span className="text-xs font-semibold text-gray-800">{newPct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${newPct}%`, background: '#0046FF' }} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-gray-500 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: '#73C8D2' }} />
                                Follow-up
                            </span>
                            <span className="text-xs font-semibold text-gray-800">{fuPct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${fuPct}%`, background: '#73C8D2' }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
