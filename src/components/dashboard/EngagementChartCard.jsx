import { AreaTooltip } from './dashboardWidgets';
import { ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Dashboard: sent / opened area chart with the Daily / Weekly / Monthly / Yearly tabs and totals.
export default function EngagementChartCard({ dashboard }) {
    const {
        activeTab, areaData, chartFade, handleTabChange, navigate, tabSubtitle, totals
    } = dashboard;
    return (
        <div className="card-anim bg-white/80 rounded-2xl shadow-sm p-6 min-w-0 flex flex-col" style={{ animationDelay: '0ms' }}>
            {/* Top bar */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Dashboard</p>
                    <p className="text-xs text-gray-400">{tabSubtitle}</p>
                </div>
                <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1">
                    {['DAILY','WEEKLY','MONTHLY','YEARLY'].map(t => (
                        <button key={t}
                            onClick={() => handleTabChange(t)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                activeTab === t
                                    ? 'bg-white shadow-sm border border-gray-100 text-[#0046FF]'
                                    : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >{t.charAt(0) + t.slice(1).toLowerCase()}</button>
                    ))}
                </div>
            </div>

            <div className="flex gap-6 flex-1 min-h-0">
                {/* Metrics */}
                <div className="flex flex-col justify-between min-w-[120px] shrink-0">
                    <div>
                        <p className="text-3xl font-bold text-gray-900">{totals.sent.toLocaleString()}</p>
                        <p className="text-xs text-gray-400 mt-1">Total Emails Sent</p>
                    </div>
                    <div className="mt-4">
                        <p className="text-2xl font-bold text-gray-800">{totals.opened.toLocaleString()}</p>
                        <p className="text-xs text-gray-400 mt-1">Total Opens</p>
                    </div>
                    <button
                        onClick={() => navigate('/app/campaigns')}
                        className="mt-6 flex items-center gap-2 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:opacity-90 transition-all w-fit"
                        style={{ background: 'linear-gradient(135deg, #0046FF, #73C8D2)' }}
                    >
                        View Campaigns <ArrowRight size={13} />
                    </button>
                </div>

                {/* Chart */}
                <div className="flex-1 min-w-0 flex flex-col" style={{
                    opacity: chartFade ? 1 : 0,
                    transform: chartFade ? 'translateY(0)' : 'translateY(6px)',
                    transition: 'opacity 0.18s ease, transform 0.18s ease',
                }}>
                    <div className="flex items-center justify-end gap-4 mb-3">
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#0046FF' }}/>Sent
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#73C8D2' }}/>Opened
                        </span>
                    </div>
                    <div className="flex-1" style={{ minHeight: 210 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart key={activeTab} data={areaData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#0046FF" stopOpacity={0.35}/>
                                    <stop offset="95%" stopColor="#0046FF" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="gOpened" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#73C8D2" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#73C8D2" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}/>
                            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}/>
                            <Tooltip content={<AreaTooltip />}/>
                            <Area type="monotone" dataKey="Sent"   stroke="#0046FF" strokeWidth={2.5} fill="url(#gSent)"   isAnimationActive={true} animationDuration={1800} animationEasing="ease-out" dot={false} activeDot={{ r: 5, fill: '#0046FF' }}/>
                            <Area type="monotone" dataKey="Opened" stroke="#73C8D2" strokeWidth={2.5} fill="url(#gOpened)" isAnimationActive={true} animationDuration={2100} animationEasing="ease-out" dot={false} activeDot={{ r: 5, fill: '#73C8D2' }}/>
                        </AreaChart>
                    </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
