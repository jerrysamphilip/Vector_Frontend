
import React, { useEffect, useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { apiClient as api } from '../../api/http';
import { Loader2, AlertCircle, BarChart3 } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const filteredPayload = payload.filter((entry) => Number(entry.value) > 0);
        return (
            <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
                <div className="space-y-2">
                    {filteredPayload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-sm font-medium text-slate-600">
                                    {entry.name}
                                </span>
                            </div>
                            <span className="text-sm font-bold text-slate-900">
                                {entry.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export default function DeliverabilityTrendsChart({ domains = [] }) {
    const [selectedDomain, setSelectedDomain] = useState("ALL");
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchStats();
    }, [selectedDomain]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const params = selectedDomain !== "ALL" ? { domain: selectedDomain } : {};
            const res = await api.get('/deliverability/statistics', { params });
            const formattedData = res.data.data_points.map(p => ({
                ...p,
                delivered: Math.max(
                    (p.DeliveryAttempts || 0) - (p.Bounces || 0) - (p.Complaints || 0) - (p.Rejects || 0),
                    0
                ),
                complaints: p.Complaints || 0,
                rejects: p.Rejects || 0,
                bounces: p.Bounces || 0,
                date: new Date(p.Timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                fullDate: new Date(p.Timestamp).toLocaleString()
            }));
            setData(formattedData);
        } catch (err) {
            console.error("Failed to fetch deliverability stats:", err);
            setError("Failed to load chart data");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        // Premium Skeleton Loader
        return (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-[400px] flex flex-col">
                <div className="flex justify-between items-center mb-8">
                    <div className="space-y-2">
                        <div className="h-6 w-48 bg-slate-100 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-slate-50 rounded animate-pulse" />
                    </div>
                    <div className="h-10 w-40 bg-slate-100 rounded-lg animate-pulse" />
                </div>
                <div className="flex-1 flex items-end gap-4 pb-4 px-4 border-b border-l border-slate-100">
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className="flex-1 bg-slate-50 rounded-t-lg animate-pulse"
                            style={{ height: `${Math.random() * 60 + 20}%`, animationDelay: `${i * 0.1}s` }}
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-[400px] flex flex-col items-center justify-center bg-red-50/50 rounded-2xl border border-red-100 text-red-600">
                <div className="bg-red-100 p-3 rounded-full mb-3">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <p className="font-medium">{error}</p>
                <button
                    onClick={fetchStats}
                    className="mt-4 text-sm bg-white border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors shadow-sm"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md">
            {/* Header */}
            <div className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.95)_0%,rgba(255,255,255,1)_100%)] px-6 py-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                            <BarChart3 className="h-5 w-5 text-emerald-600" />
                        Sending & Bounce History
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Layered delivery volume across sent, complaints, rejects, and bounces.
                        </p>
                    </div>

                    <div className="relative">
                        <select
                            value={selectedDomain}
                            onChange={(e) => setSelectedDomain(e.target.value)}
                            className="appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-4 pr-10 text-sm font-medium text-slate-700 outline-none transition-all hover:bg-slate-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        >
                            <option value="ALL">Global (All Domains)</option>
                            {domains.map(d => (
                                <option key={d.domain_name} value={d.domain_name}>
                                    {d.domain_name}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            {data.length === 0 ? (
                <div className="m-6 flex h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-400">
                    <BarChart3 className="mb-3 h-10 w-10 opacity-20" />
                    <p className="font-medium">No data points recorded yet</p>
                    <p className="text-xs mt-1">Start sending campaigns to see activity.</p>
                </div>
            ) : (
                <div className="px-4 pb-4 pt-3 sm:px-6 sm:pb-6">
                    <div className="rounded-[24px] bg-[radial-gradient(circle_at_top,rgba(255,247,237,0.85),rgba(240,253,250,0.8)_38%,rgba(255,255,255,1)_78%)] p-3 sm:p-5">
                        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 px-2">
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#52D6C5]" />
                                Delivered
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#6EDB8C]" />
                                Complaints
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#D7E97A]" />
                                Rejects
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#F3A766]" />
                                Bounces
                            </div>
                        </div>
                        <div className="h-[360px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 8 }}>
                            <defs>
                                <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#52D6C5" stopOpacity={0.95} />
                                    <stop offset="100%" stopColor="#52D6C5" stopOpacity={0.55} />
                                </linearGradient>
                                <linearGradient id="colorComplaints" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6EDB8C" stopOpacity={0.92} />
                                    <stop offset="100%" stopColor="#6EDB8C" stopOpacity={0.5} />
                                </linearGradient>
                                <linearGradient id="colorRejects" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#D7E97A" stopOpacity={0.92} />
                                    <stop offset="100%" stopColor="#D7E97A" stopOpacity={0.45} />
                                </linearGradient>
                                <linearGradient id="colorBounces" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#F3A766" stopOpacity={0.92} />
                                    <stop offset="100%" stopColor="#F3A766" stopOpacity={0.45} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(148,163,184,0.12)" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94A3B8', fontSize: 11 }}
                                dy={10}
                                tickMargin={6}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94A3B8', fontSize: 11 }}
                                width={34}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(100,116,139,0.25)', strokeWidth: 1 }} />

                            <Area
                                type="monotone"
                                dataKey="delivered"
                                name="Delivered"
                                stackId="delivery"
                                stroke="#52D6C5"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorDelivered)"
                                activeDot={{ r: 5, strokeWidth: 0, fill: '#52D6C5' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="complaints"
                                name="Complaints"
                                stackId="delivery"
                                stroke="#6EDB8C"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorComplaints)"
                                activeDot={{ r: 5, strokeWidth: 0, fill: '#6EDB8C' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="rejects"
                                name="Rejects"
                                stackId="delivery"
                                stroke="#D7E97A"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorRejects)"
                                activeDot={{ r: 5, strokeWidth: 0, fill: '#D7E97A' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="bounces"
                                name="Bounces"
                                stackId="delivery"
                                stroke="#F3A766"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorBounces)"
                                activeDot={{ r: 5, strokeWidth: 0, fill: '#F3A766' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
