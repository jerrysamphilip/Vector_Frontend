import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const data = [
    { date: 'Mon', openRate: 45, replyRate: 12 },
    { date: 'Tue', openRate: 52, replyRate: 15 },
    { date: 'Wed', openRate: 48, replyRate: 13 },
    { date: 'Thu', openRate: 61, replyRate: 18 },
    { date: 'Fri', openRate: 55, replyRate: 14 },
    { date: 'Sat', openRate: 38, replyRate: 8 },
    { date: 'Sun', openRate: 40, replyRate: 9 },
];

export default function EngagementChart() {
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-full">
            <h3 className="font-semibold text-slate-800 mb-6">Engagement Trends</h3>

            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorOpen" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorReply" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#64748b' }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#64748b' }}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="openRate"
                            name="Open Rate %"
                            stroke="#10B981"
                            fillOpacity={1}
                            fill="url(#colorOpen)"
                            strokeWidth={2}
                        />
                        <Area
                            type="monotone"
                            dataKey="replyRate"
                            name="Reply Rate %"
                            stroke="#F59E0B"
                            fillOpacity={1}
                            fill="url(#colorReply)"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
