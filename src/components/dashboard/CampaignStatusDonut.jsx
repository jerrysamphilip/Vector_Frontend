import { motion } from 'framer-motion';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Dashboard sidebar: campaign status donut with the percentage per status.
export default function CampaignStatusDonut({ dashboard }) {
    const {
        donutData, statusCounts
    } = dashboard;
    return (
        <motion.div
            layout
            className="flex flex-col gap-3 min-w-0"
            transition={{ layout: { duration: 0.3, ease: 'easeInOut' } }}
        >
            <motion.div
                layout
                className="card-anim bg-white/80 rounded-2xl shadow-sm p-6"
                style={{ animationDelay: '80ms' }}
                transition={{ layout: { duration: 0.3, ease: 'easeInOut' } }}
            >
                <p className="text-sm font-semibold text-gray-800 mb-1">Campaign Status</p>
                <p className="text-xs text-gray-400 mb-4">Breakdown by status</p>

                {donutData.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-gray-300 text-sm">No campaigns yet</div>
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={donutData} cx="50%" cy="50%" innerRadius={58} outerRadius={88}
                                dataKey="value" paddingAngle={3} strokeWidth={0}>
                                {donutData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(v, n) => [v, n]} />
                        </PieChart>
                    </ResponsiveContainer>
                )}

                <div className="space-y-2.5 mt-2">
                    {[
                        { label: 'Active',    val: statusCounts.active,    pct: statusCounts.total ? Math.round(statusCounts.active/statusCounts.total*100) : 0,    color: '#0046FF' },
                        { label: 'Paused',    val: statusCounts.paused,    pct: statusCounts.total ? Math.round(statusCounts.paused/statusCounts.total*100) : 0,    color: '#73C8D2' },
                        { label: 'Draft',     val: statusCounts.draft,     pct: statusCounts.total ? Math.round(statusCounts.draft/statusCounts.total*100) : 0,     color: '#F5F1DC' },
                        { label: 'Completed', val: statusCounts.completed, pct: statusCounts.total ? Math.round(statusCounts.completed/statusCounts.total*100) : 0, color: '#FF9013' },
                    ].filter(r => r.val > 0).map(r => (
                        <div key={r.label} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }}/>
                                <span className="text-xs text-gray-500">{r.label}</span>
                            </div>
                            <span className="text-xs font-bold" style={{ color: r.color }}>{r.pct}%</span>
                        </div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
}
