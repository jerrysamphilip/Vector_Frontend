import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
    Mail, Eye, MessageSquare, AlertTriangle, Zap,
    TrendingUp, TrendingDown, Users, Target, Server,
    Inbox, Monitor, RefreshCw, Download, BarChart3, ChevronDown, User,
} from 'lucide-react';
import {
    ResponsiveContainer, AreaChart, Area,
    PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { reportsApi } from '../api/reports';
import KpiTile from '../components/ui/KpiTile';

// ── Date helpers ────────────────────────────────────────────────
const DATE_RANGES = [
    { label: '7d',   days: 7   },
    { label: '30d',  days: 30  },
    { label: '90d',  days: 90  },
    { label: '365d', days: 365 },
];

function formatDateRange(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    return {
        start_date: start.toISOString().split('T')[0],
        end_date:   end.toISOString().split('T')[0],
    };
}

function formatDateLabel(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    const fmt = d => d.toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
}

function formatHours(h) {
    if (!h || h <= 0) return '—';
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    if (hrs === 0) return `${mins}m`;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

// ── Skeleton ────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
    return <div className={`bg-slate-200 animate-pulse rounded-lg ${className}`} />;
}

// ── Bar sparkline (same as Dashboard) ──────────────────────────
// ── Wave sparkline (same as Dashboard) ─────────────────────────
// ── Gradient Card (identical to Dashboard) ──────────────────────
function GradientCard(props) {
    return <KpiTile {...props} />;
}

// ── Mini icon KPI card ──────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor, loading, animDelay = '0ms' }) {
    return (
        <div className="card-anim bg-white/80 rounded-2xl shadow-sm p-5" style={{ animationDelay: animDelay }}>
            <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                    <Icon style={{ width: 18, height: 18 }} className={iconColor} />
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
            </div>
            {loading ? (
                <><Skeleton className="h-7 w-20 mb-1.5" /><Skeleton className="h-3 w-28" /></>
            ) : (
                <>
                    <div className="text-2xl font-bold" style={{ color: '#0046FF' }}>
                        {typeof value === 'number' ? value.toLocaleString() : (value ?? 0)}
                    </div>
                    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
                </>
            )}
        </div>
    );
}

// ── Area chart tooltip ──────────────────────────────────────────
const SERIES = [
    { key: 'Sent',    color: '#0046FF', bg: 'bg-blue-50',    text: 'text-blue-700'    },
    { key: 'Opened',  color: '#73C8D2', bg: 'bg-cyan-50',    text: 'text-cyan-700'    },
    { key: 'Replied', color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    { key: 'Bounced', color: '#FF9013', bg: 'bg-orange-50',  text: 'text-orange-700'  },
];

function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    const dt = new Date(label);
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
function EngagementChart({ timeseries, loading, kpis }) {
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
                                tickFormatter={d => { const dt = new Date(d); return `${dt.getDate()} ${dt.toLocaleString('en', { month: 'short' })}`; }}
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

// ── Campaign status donut ───────────────────────────────────────

function CampaignDonut({ stats, loading }) {
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
const PIE_COLORS = ['#0046FF', '#73C8D2'];

function LeadDonut({ leadStats, loading }) {
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

// ── Optimization metrics ────────────────────────────────────────
function OptimizationRow({ optimization, loading }) {
    const items = [
        {
            value:  loading ? null : (optimization?.avg_leads_before_first_reply ?? 0),
            label:  'Avg. Leads Before First Reply',
            sub:    'Per campaign average',
            color:  '#0046FF',
            icon:   Users,
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
        },
        {
            value:  loading ? null : `${optimization?.follow_up_reply_rate ?? 0}%`,
            label:  'Follow-up Reply Rate',
            sub:    'Replies from follow-up sequences',
            color:  '#10b981',
            icon:   MessageSquare,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
        },
        {
            value:  loading ? null : formatHours(optimization?.median_time_to_first_reply_hours),
            label:  'Median Time to First Reply',
            sub:    'From send to first response',
            color:  '#FF9013',
            icon:   Target,
            iconBg: 'bg-orange-50',
            iconColor: 'text-orange-500',
        },
    ];

    return (
        <>
            {items.map((item, i) => {
                const Icon = item.icon;
                return (
                    <div key={i} className="card-anim bg-white/80 rounded-2xl shadow-sm p-5"
                        style={{ animationDelay: `${400 + i * 60}ms` }}>
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.iconBg}`}>
                                <Icon style={{ width: 18, height: 18 }} className={item.iconColor} />
                            </div>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{item.label}</span>
                        </div>
                        {loading ? (
                            <><Skeleton className="h-8 w-20 mb-1" /><Skeleton className="h-3 w-32" /></>
                        ) : (
                            <>
                                <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                            </>
                        )}
                    </div>
                );
            })}
        </>
    );
}

// ── Provider performance table ──────────────────────────────────
const PROVIDER_ICON = p => ({ ses: '📧', gmail: '📬', outlook: '📮', smtp: '📡', sendgrid: '📨' }[p?.toLowerCase()] || '📭');

function ProviderTable({ providers, loading }) {
    return (
        <div className="card-anim bg-white/80 rounded-2xl shadow-sm overflow-hidden" style={{ animationDelay: '540ms' }}>
            <div className="px-6 pt-6 pb-3 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}>
                    <Server className="w-3.5 h-3.5" style={{ color: '#2d6bbf' }} />
                </div>
                <div>
                    <p className="text-sm font-semibold text-gray-800">Email Providers</p>
                    <p className="text-xs text-gray-400">Sending performance by provider</p>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            {['Provider', 'Sent', 'Delivered', 'Open %', 'Reply %', 'Bounce %'].map(h => (
                                <th key={h} className={`px-5 py-3 text-xs font-semibold text-slate-500 ${h === 'Provider' ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [1, 2].map(i => (
                                <tr key={i} className={i % 2 !== 0 ? 'bg-gray-50/40' : ''}>
                                    {[1,2,3,4,5,6].map(j => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                                </tr>
                            ))
                        ) : providers?.length > 0 ? providers.map((p, i) => (
                            <tr key={p.provider} className={`transition-colors hover:bg-blue-50/30 ${i % 2 !== 0 ? 'bg-gray-50/40' : ''}`}>
                                <td className="px-5 py-3 font-medium text-gray-800 capitalize">
                                    <span className="mr-2">{PROVIDER_ICON(p.provider)}</span>{p.provider || 'Unknown'}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600">{p.sent_count?.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right text-gray-600">{p.delivered_count?.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right font-semibold" style={{ color: '#73C8D2' }}>{p.open_rate}%</td>
                                <td className="px-4 py-3 text-right font-semibold text-emerald-600">{p.reply_rate}%</td>
                                <td className="px-4 py-3 text-right font-semibold" style={{ color: '#FF9013' }}>{p.bounce_rate}%</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400 text-sm">No provider data for this period</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Mailbox stats mini card ─────────────────────────────────────
function MailboxStatsCard({ stats, loading }) {
    const items = [
        { label: 'Total Connected', value: stats?.total_connected ?? 0, color: '#0046FF' },
        { label: 'In Use',          value: stats?.mailbox_in_use  ?? 0, color: '#2d6bbf' },
        { label: 'Disconnected',    value: stats?.disconnected    ?? 0, color: '#FF9013' },
        { label: 'No Warmup',       value: stats?.without_warmup  ?? 0, color: '#e6a830' },
    ];
    return (
        <div className="card-anim bg-white/80 rounded-2xl shadow-sm p-6" style={{ animationDelay: '580ms' }}>
            <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}>
                    <Monitor className="w-3.5 h-3.5" style={{ color: '#2d6bbf' }} />
                </div>
                <p className="text-sm font-semibold text-gray-800">Mailbox Stats</p>
            </div>
            <div className="space-y-4">
                {items.map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{item.label}</span>
                        {loading ? <Skeleton className="h-5 w-8" /> : (
                            <span className="text-base font-bold" style={{ color: item.color }}>{item.value}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Top campaigns table ─────────────────────────────────────────
function TopCampaignsTable({ campaigns, loading, onExport, exporting }) {
    const statusCls = s =>
        s === 'ACTIVE'    ? 'bg-emerald-50 text-emerald-700' :
        s === 'PAUSED'    ? 'bg-orange-50 text-orange-700'   :
        s === 'COMPLETED' ? 'bg-blue-50 text-blue-700'       :
        'bg-gray-100 text-gray-500';

    return (
        <div className="card-anim bg-white/80 rounded-2xl shadow-sm overflow-hidden" style={{ animationDelay: '620ms' }}>
            <div className="px-6 pt-6 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}>
                        <TrendingUp className="w-3.5 h-3.5" style={{ color: '#2d6bbf' }} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">Top Campaign Performance</p>
                        <p className="text-xs text-gray-400">Ranked by emails sent</p>
                    </div>
                </div>
                <button onClick={onExport} disabled={exporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-xl disabled:opacity-50 transition-all hover:opacity-90 shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                    <Download className="w-3.5 h-3.5" />
                    {exporting ? 'Exporting…' : 'Export CSV'}
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            {['Campaign', 'Status', 'Sent', 'Opened', 'Replied', 'Open %', 'Reply %', 'Bounce %'].map(h => (
                                <th key={h} className={`px-5 py-3 text-xs font-semibold text-slate-500 ${h === 'Campaign' ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [1,2,3,4].map(i => (
                                <tr key={i} className={i % 2 !== 0 ? 'bg-gray-50/40' : ''}>
                                    {[1,2,3,4,5,6,7,8].map(j => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                                </tr>
                            ))
                        ) : campaigns?.length > 0 ? campaigns.map((c, i) => (
                            <tr key={c.campaign_id} className={`transition-colors hover:bg-blue-50/30 ${i % 2 !== 0 ? 'bg-gray-50/40' : ''}`}>
                                <td className="px-5 py-3.5 font-medium text-gray-800 max-w-[200px] truncate">{c.campaign_name}</td>
                                <td className="px-4 py-3.5 text-right">
                                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusCls(c.status)}`}>{c.status}</span>
                                </td>
                                <td className="px-4 py-3.5 text-right text-gray-600">{c.sent_count?.toLocaleString()}</td>
                                <td className="px-4 py-3.5 text-right text-gray-600">{c.opened_count?.toLocaleString()}</td>
                                <td className="px-4 py-3.5 text-right text-gray-600">{c.replied_count?.toLocaleString()}</td>
                                <td className="px-4 py-3.5 text-right font-semibold" style={{ color: '#73C8D2' }}>{c.open_rate}%</td>
                                <td className="px-4 py-3.5 text-right font-semibold text-emerald-600">{c.reply_rate}%</td>
                                <td className="px-4 py-3.5 text-right font-semibold" style={{ color: '#FF9013' }}>{c.bounce_rate}%</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={8} className="px-5 py-8 text-center text-gray-400 text-sm">No campaigns found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Mailbox health table ────────────────────────────────────────
function MailboxHealthTable({ mailboxHealth, loading, onExport, exporting }) {
    return (
        <div className="card-anim bg-white/80 rounded-2xl shadow-sm overflow-hidden" style={{ animationDelay: '660ms' }}>
            <div className="px-6 pt-6 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}>
                        <Inbox className="w-3.5 h-3.5" style={{ color: '#2d6bbf' }} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">Mailbox Health</p>
                        <p className="text-xs text-gray-400">Per-mailbox engagement metrics</p>
                    </div>
                </div>
                <button onClick={onExport} disabled={exporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-xl disabled:opacity-50 transition-all hover:opacity-90 shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                    <Download className="w-3.5 h-3.5" />
                    {exporting ? 'Exporting…' : 'Export CSV'}
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            {['Mailbox', 'Leads', 'Sent', 'Opens', 'Open %', 'Replies', 'Reply %', 'Bounce %'].map(h => (
                                <th key={h} className={`px-5 py-3 text-xs font-semibold text-slate-500 ${h === 'Mailbox' ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [1,2,3].map(i => (
                                <tr key={i} className={i % 2 !== 0 ? 'bg-gray-50/40' : ''}>
                                    {[1,2,3,4,5,6,7,8].map(j => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                                </tr>
                            ))
                        ) : mailboxHealth?.length > 0 ? mailboxHealth.map((m, i) => (
                            <tr key={m.mailbox} className={`transition-colors hover:bg-blue-50/30 ${i % 2 !== 0 ? 'bg-gray-50/40' : ''}`}>
                                <td className="px-5 py-3.5 font-medium text-gray-800 text-xs max-w-[180px] truncate">{m.mailbox}</td>
                                <td className="px-4 py-3.5 text-right text-gray-600">{m.lead_contacted}</td>
                                <td className="px-4 py-3.5 text-right text-gray-600">{m.email_sent}</td>
                                <td className="px-4 py-3.5 text-right text-gray-600">{m.opened}</td>
                                <td className="px-4 py-3.5 text-right font-semibold" style={{ color: '#73C8D2' }}>{m.opened_rate}%</td>
                                <td className="px-4 py-3.5 text-right text-gray-600">{m.replied}</td>
                                <td className="px-4 py-3.5 text-right font-semibold text-emerald-600">{m.replied_rate}%</td>
                                <td className="px-4 py-3.5 text-right font-semibold" style={{ color: '#FF9013' }}>{m.bounce_rate}%</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={8} className="px-5 py-8 text-center text-gray-400 text-sm">No mailbox data available</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Team Performance Table ───────────────────────────────────────
function TeamPerformanceTable({ users, loading }) {
    const roleColors = {
        PLATFORM_ADMIN: { bg: 'rgba(99,102,241,0.1)',   color: '#4f46e5' },
        SUPER_ADMIN:    { bg: 'rgba(45,107,191,0.1)',    color: '#2d6bbf' },
        ADMIN:          { bg: 'rgba(115,200,210,0.12)',  color: '#4db0bb' },
        MANAGER:        { bg: 'rgba(245,158,11,0.1)',    color: '#d97706' },
        AGENT:          { bg: 'rgba(16,185,129,0.1)',    color: '#059669' },
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100"
                style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.15), rgba(115,200,210,0.15))' }}>
                    <Users className="w-4 h-4" style={{ color: '#2d6bbf' }} />
                </div>
                <div>
                    <p className="text-sm font-semibold text-gray-800">Team Performance</p>
                    <p className="text-xs text-gray-400">Per-user breakdown for the selected period</p>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr style={{ background: 'rgba(45,107,191,0.04)' }}>
                            {['Team Member', 'Role', 'Campaigns', 'Sent', 'Opened', 'Replied', 'Open Rate', 'Reply Rate', 'Bounce Rate'].map(h => (
                                <th key={h} className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i}>
                                {Array.from({ length: 9 }).map((_, j) => (
                                    <td key={j} className="px-4 py-3.5">
                                        <div className="h-3.5 bg-gray-100 rounded animate-pulse" style={{ width: j === 0 ? 120 : 48 }} />
                                    </td>
                                ))}
                            </tr>
                        )) : users?.length > 0 ? users.map((u, i) => {
                            const rc = roleColors[u.role] || roleColors.AGENT;
                            return (
                                <tr key={u.user_id} className={`transition-colors hover:bg-blue-50/30 ${i % 2 !== 0 ? 'bg-gray-50/40' : ''}`}>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                                                style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                                                {u.first_name?.[0]}{u.last_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800">{u.first_name} {u.last_name}</p>
                                                <p className="text-gray-400">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                                            style={{ background: rc.bg, color: rc.color }}>{u.role}</span>
                                    </td>
                                    <td className="px-4 py-3.5 text-gray-700 font-medium">{u.campaigns_created}</td>
                                    <td className="px-4 py-3.5 text-gray-700">{u.total_sent.toLocaleString()}</td>
                                    <td className="px-4 py-3.5 text-gray-700">{u.total_opened.toLocaleString()}</td>
                                    <td className="px-4 py-3.5 text-gray-700">{u.total_replied.toLocaleString()}</td>
                                    <td className="px-4 py-3.5 font-semibold" style={{ color: '#2d6bbf' }}>{u.open_rate}%</td>
                                    <td className="px-4 py-3.5 font-semibold text-emerald-600">{u.reply_rate}%</td>
                                    <td className="px-4 py-3.5 font-semibold" style={{ color: '#FF9013' }}>{u.bounce_rate}%</td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={9} className="px-5 py-8 text-center text-gray-400">No team data available</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function Reports() {
    const [range, setRange] = useState(30);
    const [selectedUserId, setSelectedUserId] = useState(null); // null = all users
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const userDropdownRef = useRef(null);
    const [exportingGlobal,        setExportingGlobal]        = useState(false);
    const [exportingDocx,          setExportingDocx]          = useState(false);
    const [exportingCampaign,      setExportingCampaign]      = useState(false);
    const [exportingDeliverability,setExportingDeliverability]= useState(false);
    const dates = formatDateRange(range);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => { if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) setUserDropdownOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const apiParams = { ...dates, ...(selectedUserId ? { user_id: selectedUserId } : {}) };

    const { data, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ['reports-dashboard', range, selectedUserId],
        queryFn:  () => reportsApi.dashboardSummary(apiParams),
        placeholderData: keepPreviousData,
        staleTime: 5 * 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: false,
    });

    const kpis          = data?.kpis           ?? {};
    const timeseries    = data?.timeseries      ?? [];
    const leadStats     = data?.lead_stats      ?? {};
    const campaignStats = data?.campaign_stats  ?? {};
    const mailboxStats  = data?.mailbox_stats   ?? {};
    const providers     = data?.providers       ?? [];
    const mailboxHealth = data?.mailbox_health  ?? [];
    const topCampaigns  = data?.top_campaigns   ?? [];
    const optimization  = data?.optimization    ?? {};
    const userBreakdown = data?.user_breakdown  ?? [];
    const filteredUserBreakdown = useMemo(
        () => userBreakdown.filter((u) => u?.role !== 'PLATFORM_ADMIN'),
        [userBreakdown]
    );

    // Cache team member list — only update when we get a non-empty breakdown (org-wide view)
    // so the dropdown stays populated even when a user is selected
    const [cachedTeamMembers, setCachedTeamMembers] = useState([]);
    useEffect(() => {
        if (filteredUserBreakdown.length > 0) setCachedTeamMembers(filteredUserBreakdown);
    }, [filteredUserBreakdown]);

    useEffect(() => {
        if (selectedUserId && !cachedTeamMembers.some((u) => u.user_id === selectedUserId)) {
            setSelectedUserId(null);
        }
    }, [selectedUserId, cachedTeamMembers]);

    const canFilterUsers = true;
    const selectedUser = cachedTeamMembers.find(u => u.user_id === selectedUserId) ?? null;

    const handleExportGlobal = useCallback(async () => {
        setExportingGlobal(true);
        try { await reportsApi.exportGlobalCsv(apiParams); } finally { setExportingGlobal(false); }
    }, [apiParams]);

    const handleExportDocx = useCallback(async () => {
        setExportingDocx(true);
        try { await reportsApi.exportGlobalDocx(apiParams); } finally { setExportingDocx(false); }
    }, [apiParams]);

    const handleExportCampaign = useCallback(async () => {
        setExportingCampaign(true);
        try { await reportsApi.exportCampaignComparisonCsv(apiParams); } finally { setExportingCampaign(false); }
    }, [apiParams]);

    const handleExportDeliverability = useCallback(async () => {
        setExportingDeliverability(true);
        try { await reportsApi.exportDeliverabilityCsv(); } finally { setExportingDeliverability(false); }
    }, []);

    // Show ghost skeletons both on first load AND when switching user/date range
    const loading = isLoading || isFetching;

    const openRate   = kpis.overall_open_rate   ?? 0;
    const replyRate  = kpis.overall_reply_rate  ?? 0;
    const bounceRate = kpis.overall_bounce_rate ?? 0;

    return (
        <div className="p-6 space-y-5">

            {/* ── Header ─────────────────────────────────── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 leading-tight">Analytics & Reports</h1>
                    <p className="text-sm text-gray-400 mt-0.5">{formatDateLabel(range)}</p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* User filter dropdown — admins only */}
                    {canFilterUsers && (
                        <div className="relative" ref={userDropdownRef}>
                            <button
                                onClick={() => setUserDropdownOpen(o => !o)}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all"
                                style={selectedUserId
                                    ? { background: 'rgba(45,107,191,0.08)', color: '#2d6bbf', borderColor: 'rgba(45,107,191,0.25)' }
                                    : { background: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }}>
                                <User className="w-3.5 h-3.5" />
                                {selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : 'All Users'}
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {userDropdownOpen && (
                                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                                    <button
                                        onClick={() => { setSelectedUserId(null); setUserDropdownOpen(false); }}
                                        className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-blue-50 ${!selectedUserId ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                                        All Users
                                    </button>
                                    <div className="border-t border-gray-100" />
                                    {cachedTeamMembers?.map(u => (
                                        <button key={u.user_id}
                                            onClick={() => { setSelectedUserId(u.user_id); setUserDropdownOpen(false); }}
                                            className={`w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-blue-50 ${selectedUserId === u.user_id ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                                            <p className="font-semibold">{u.first_name} {u.last_name}</p>
                                            <p className="text-gray-400">{u.role}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Date range tabs */}
                    <div className="relative flex items-center bg-white border border-gray-100 rounded-xl p-1">
                        {DATE_RANGES.map(r => (
                            <button key={r.days} onClick={() => setRange(r.days)} disabled={isFetching}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                                style={range === r.days
                                    ? { background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)', color: '#ffffff' }
                                    : { color: '#9ca3af' }
                                }
                            >{r.label}</button>
                        ))}
                        {isFetching && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse"
                                style={{ background: '#0046FF' }} />
                        )}
                    </div>

                    {/* Export CSV */}
                    <button onClick={handleExportGlobal} disabled={exportingGlobal}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-xl disabled:opacity-50 transition-all hover:opacity-90 shadow-sm"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                        <Download className="w-3.5 h-3.5" />
                        {exportingGlobal ? 'Exporting…' : 'Export CSV'}
                    </button>

                    {/* Export Word */}
                    <button onClick={handleExportDocx} disabled={exportingDocx}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl disabled:opacity-50 transition-all hover:opacity-90 shadow-sm border"
                        style={{ background: '#fff', color: '#2d6bbf', borderColor: '#2d6bbf' }}>
                        <Download className="w-3.5 h-3.5" />
                        {exportingDocx ? 'Generating…' : 'Export Word'}
                    </button>

                    {error && (
                        <button onClick={() => refetch()}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-xl"
                            style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>
                            <RefreshCw className="w-3.5 h-3.5" /> Retry
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-100 rounded-2xl text-sm text-orange-800">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-orange-500" />
                    <span>Could not load reports — showing last available data. <strong>{error.message}</strong></span>
                </div>
            )}

            {/* ── Row 1: Gradient KPI cards ──────────────── */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <GradientCard
                    label="Open Rate" value={loading ? '—' : `${openRate}%`}
                    sub={`${kpis.total_opened ?? 0} emails opened`}
                    from="#2d6bbf" to="#1f56aa" dark={false} chart="bar"
                    trend={openRate >= 20} animDelay="0ms"
                />
                <GradientCard
                    label="Reply Rate" value={loading ? '—' : `${replyRate}%`}
                    sub={`${kpis.total_replied ?? 0} replies received`}
                    from="#F5F1DC" to="#e8e3c0" dark={true} chart="wave"
                    trend={replyRate >= 5} animDelay="80ms"
                />
                <GradientCard
                    label="Emails Sent" value={loading ? '—' : (kpis.total_emails_sent ?? 0).toLocaleString()}
                    sub={`${kpis.total_leads_contacted ?? 0} leads contacted`}
                    from="#FF9013" to="#cc6f00" dark={false} chart="bar"
                    trend={(kpis.total_emails_sent ?? 0) > 0} animDelay="160ms"
                />
                <GradientCard
                    label="Bounce Rate" value={loading ? '—' : `${bounceRate}%`}
                    sub={`${kpis.total_bounced ?? 0} bounced`}
                    from="#73C8D2" to="#4db0bb" dark={false} chart="wave"
                    trend={bounceRate < 5} animDelay="240ms"
                />
            </div>

            {/* ── Row 2: Area chart + Campaign donut ─────── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2">
                    <EngagementChart timeseries={timeseries} loading={loading} kpis={kpis} />
                </div>
                <CampaignDonut stats={campaignStats} loading={loading} />
            </div>

            {/* ── Row 3: Mini stat cards ──────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                <StatCard icon={Mail}          label="Total Sent"    value={kpis.total_emails_sent}
                    sub={`${kpis.total_leads_contacted ?? 0} leads`}
                    iconBg="bg-blue-50"    iconColor="text-blue-600"   loading={loading} animDelay="300ms" />
                <StatCard icon={Eye}           label="Opened"        value={kpis.total_opened}
                    sub={`${openRate}% open rate`}
                    iconBg="bg-cyan-50"    iconColor="text-cyan-600"   loading={loading} animDelay="340ms" />
                <StatCard icon={MessageSquare} label="Replied"       value={kpis.total_replied}
                    sub={`${replyRate}% reply rate`}
                    iconBg="bg-emerald-50" iconColor="text-emerald-600" loading={loading} animDelay="380ms" />
                <StatCard icon={Zap}           label="Clicked"       value={kpis.total_clicked ?? 0}
                    sub="Link clicks tracked"
                    iconBg="bg-orange-50"  iconColor="text-orange-500" loading={loading} animDelay="420ms" />
                <StatCard icon={AlertTriangle} label="Bounced"       value={kpis.total_bounced}
                    sub={`${bounceRate}% bounce rate`}
                    iconBg="bg-red-50"     iconColor="text-red-500"    loading={loading} animDelay="460ms" />
            </div>

            {/* ── Row 4: Optimization + Lead donut ───────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <OptimizationRow optimization={optimization} loading={loading} />
                <LeadDonut leadStats={leadStats} loading={loading} />
            </div>

            {/* ── Row 5: Provider + Mailbox stats ────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                <div className="xl:col-span-3">
                    <ProviderTable providers={providers} loading={loading} />
                </div>
                <MailboxStatsCard stats={mailboxStats} loading={loading} />
            </div>

            {/* ── Row 6: Top campaigns ────────────────────── */}
            <TopCampaignsTable
                campaigns={topCampaigns} loading={loading}
                onExport={handleExportCampaign} exporting={exportingCampaign}
            />

            {/* ── Row 7: Mailbox health ───────────────────── */}
            <MailboxHealthTable
                mailboxHealth={mailboxHealth} loading={loading}
                onExport={handleExportDeliverability} exporting={exportingDeliverability}
            />

            {/* ── Row 8: Team Performance (org-wide only) ─── */}
            {!selectedUserId && cachedTeamMembers.length > 0 && (
                <TeamPerformanceTable users={cachedTeamMembers} loading={loading} />
            )}

        </div>
    );
}
