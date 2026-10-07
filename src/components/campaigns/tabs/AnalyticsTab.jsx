import React, { useState, useMemo, useEffect } from 'react';
import { Info, TrendingUp, TrendingDown, ChevronDown, Plus, Mail, AlertCircle, Download, X, Loader2 } from 'lucide-react';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { containerVariants, itemVariants } from '../../layout/PageTransition';
import { campaignApi } from '../../../api/campaigns';
import KpiTile from '../../ui/KpiTile';

// Dashboard Theme Colors
const COLORS = {
    sent: '#0046FF',       // Dashboard textMain / Dark blue
    opened: '#73C8D2',     // Dashboard teal
    replied: '#8b5cf6',    // purple-500 (was orange)
    positive: '#10b981',   // emerald-500
    bounced: '#e6a830',    // dark orange
    unsubscribed: '#f59e0b',// amber-500
    active: '#F5F1DC',     // Dashboard light yellow
    completed: '#e2e8f0',  // slate-200 for gauge empty
};

// ─── Inline SVG sparklines for gradient cards ───────────────────────────
// ─── Gradient Card with hover-replay sparkline ───────────────────────────────
function GradientCard(props) {
    return <KpiTile {...props} />;
}



export default function AnalyticsTab({ metrics, barData, sequences, leadStats, campaign, totalMessagesSent = 0, isLoading = false, chartFilter = 'Daily', setChartFilter, onTabChange }) {
    // Modal state for viewing sequence emails
    const [selectedStep, setSelectedStep] = useState(null);
    const [stepEmailsData, setStepEmailsData] = useState(null);
    const [stepEmailsLoading, setStepEmailsLoading] = useState(false);

    const handleViewEmails = async (step) => {
        if (!campaign?.campaign_id) return;
        setSelectedStep(step);
        setStepEmailsLoading(true);
        try {
            const data = await campaignApi.getSequenceStepEmails(campaign.campaign_id, step);
            setStepEmailsData(data);
        } catch (error) {
            console.error("Failed to load step emails:", error);
        } finally {
            setStepEmailsLoading(false);
        }
    };

    // Calculate rates
    const sent = metrics?.sent_count || 0;
    const opened = metrics?.opened_count || 0;
    const replied = metrics?.replied_count || 0;
    const positive = metrics?.positive_replied_count || 0;
    const ooo = metrics?.ooo_count || 0;
    const bounced = metrics?.bounced_count || 0;
    const senderBounced = metrics?.sender_bounced_count || 0;
    const unsub = metrics?.unsubscribed_count || 0;
    const leadsContacted = campaign?.prospect_count || leadStats?.total || 0;

    const base = Math.max(sent - bounced, 0) || 1;
    const openRate = ((opened / base) * 100).toFixed(1);
    const replyRate = ((replied / base) * 100).toFixed(1);
    
    const repliedNoOOO = Math.max(replied - ooo, 0);
    const cleanReplyRate = ((repliedNoOOO / base) * 100).toFixed(1);
    const positiveRate = ((positive / base) * 100).toFixed(1);
    
    const bounceRate = sent > 0 ? ((bounced / sent) * 100).toFixed(1) : 0;
    const senderBounceRate = sent > 0 ? ((senderBounced / sent) * 100).toFixed(1) : 0;
    const unsubRate = sent > 0 ? ((unsub / sent) * 100).toFixed(1) : 0;

    // Calculate Completion for Gauge
    const completedCount = leadStats?.data?.find(d => d.name === 'Completed')?.value || 0;
    // Fallback: If prospects have null status, the backend tags them as "Other". Let's show them as Active.
    const activeCount = (leadStats?.data?.find(d => d.name === 'Active')?.value || 0) + (leadStats?.data?.find(d => d.name === 'Other')?.value || 0);
    const completionPercent = leadsContacted > 0 ? Math.round((completedCount / leadsContacted) * 100) : 0;

    const gaugeData = [
        { name: 'Completed', value: completedCount > 0 ? completedCount : (completionPercent > 0 ? completionPercent : 1) },
        { name: 'Remaining', value: leadsContacted > 0 ? leadsContacted - completedCount : (completionPercent > 0 ? 100 - completionPercent : 100) }
    ];

    // Aggregate barData based on chartFilter
    const chartData = useMemo(() => {
        if (!barData || barData.length === 0) return [];
        
        let targetData = barData;

        if (chartFilter === 'Daily') {
            // Only show the last 7 days for daily view
            return targetData.slice(-7);
        }

        if (chartFilter === 'Weekly') {
            // Only show the last 30 days for weekly view to aggregate
            targetData = targetData.slice(-30);
            const weeks = {};
            
            targetData.forEach((day) => {
                // Safely parse date using local timezone to prevent UTC shift bugs
                const [year, month, d] = day.date.split('-');
                const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(d));
                
                // Find the Monday of this week
                const dayOfWeek = dateObj.getDay(); 
                const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                
                const mondayDate = new Date(dateObj);
                mondayDate.setDate(dateObj.getDate() - diffToMonday);
                
                const sundayDate = new Date(mondayDate);
                sundayDate.setDate(mondayDate.getDate() + 6);
                
                const key = mondayDate.getTime();
                
                if (!weeks[key]) {
                    weeks[key] = {
                        sent: 0, opened: 0, replied: 0, bounced: 0,
                        timestamp: key,
                        date: `${mondayDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} - ${sundayDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`
                    };
                }
                
                weeks[key].sent += day.sent || 0;
                weeks[key].opened += day.opened || 0;
                weeks[key].replied += day.replied || 0;
                weeks[key].bounced += day.bounced || 0;
            });
            
            return Object.values(weeks).sort((a, b) => a.timestamp - b.timestamp);
        }

        if (chartFilter === 'Monthly') {
            // Show all 180 days for monthly
            const months = {};
            targetData.forEach((day) => {
                const dateObj = new Date(day.date);
                const mm = dateObj.toLocaleString('default', { month: 'short' });
                const yyyy = dateObj.getFullYear();
                const key = `${mm} ${yyyy}`;
                
                if (!months[key]) months[key] = { date: key, sent: 0, opened: 0, replied: 0, bounced: 0, timestamp: dateObj.getTime() };
                months[key].sent += day.sent || 0;
                months[key].opened += day.opened || 0;
                months[key].replied += day.replied || 0;
                months[key].bounced += day.bounced || 0;
            });
            return Object.values(months).sort((a, b) => a.timestamp - b.timestamp);
        }

        return targetData;
    }, [barData, chartFilter]);

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse p-4">
                <div className="h-48 bg-white border border-slate-200 rounded-xl" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-32 bg-white border border-slate-200 rounded-xl" />)}
                </div>
                <div className="h-96 bg-white border border-slate-200 rounded-xl" />
            </div>
        );
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="space-y-6 text-slate-800"
        >
            {/* 1. Top Section - Campaign Health & Warning */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">

                {/* Campaign Health Gauge */}
                <div className="bg-[#fffdf2] rounded-xl border border-orange-100 p-6 flex items-start gap-8">
                    <div>
                        <h3 className="font-semibold text-orange-900 flex items-center gap-2 mb-1">
                            <AlertCircle className="w-4 h-4 text-orange-400" />
                            Campaign Health
                        </h3>
                        <p className="text-sm text-orange-800/70 mb-6">See campaign reply possibility stats</p>

                        <div className="flex items-center gap-8">
                            <div className="relative w-32 h-32">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={gaugeData}
                                            innerRadius={45}
                                            outerRadius={60}
                                            startAngle={90}
                                            endAngle={-270}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            <Cell fill={COLORS.active} />
                                            <Cell fill={COLORS.completed} />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-xl font-bold text-slate-800">{completionPercent}%</span>
                                    <span className="text-[10px] uppercase font-medium text-slate-500 tracking-wider">Completed</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-15 text-sm">
                                    <span className="flex items-center gap-2 text-slate-600">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div> Active
                                    </span>
                                    <span className="font-semibold text-slate-800">{activeCount}</span>
                                </div>
                                <div className="flex items-center justify-between gap-15 text-sm">
                                    <span className="flex items-center gap-2 text-slate-600">
                                        <div className="w-2 h-2 rounded-full bg-blue-400"></div> Completed
                                    </span>
                                    <span className="font-semibold text-slate-800">{completedCount}</span>
                                </div>
                                <div className="flex items-center justify-between gap-15 text-sm">
                                    <span className="flex items-center gap-2 text-slate-600">
                                        <div className="w-2 h-2 rounded-full bg-red-400"></div> Bounced
                                    </span>
                                    <span className="font-semibold text-slate-800">{bounced}</span>
                                </div>
                                <div className="flex items-center justify-between gap-15 text-sm">
                                    <span className="flex items-center gap-2 text-slate-600">
                                        <div className="w-2 h-2 rounded-full bg-amber-400"></div> Unsubscribed
                                    </span>
                                    <span className="font-semibold text-slate-800">{unsub}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Total Sent Today */}
                <div className="bg-[#f0fdf4] rounded-xl border border-green-100 p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-semibold text-green-900 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Total Sent Today / Limit
                        </h3>
                        <button className="text-xs bg-white border border-green-200 text-green-700 px-3 py-1 rounded-full font-medium shadow-sm">
                            View Plan
                        </button>
                    </div>
                    <div>
                        <span className="text-4xl font-bold text-slate-800">55</span>
                        <span className="text-sm text-slate-500 ml-2">Total emails filling your queue</span>
                    </div>
                </div>
            </motion.div>

            {/* 2. KPI Grid (Matching Dashboard Style) */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Leads Contacted', count: leadsContacted, percent: '', link: '', targetTab: 'Prospects', from: '#0046FF', to: '#0035CC', chart: 'bar', trend: true },
                    { label: 'Total Opened', count: opened, percent: `${openRate}%`, link: '', targetTab: 'Prospects', from: '#73C8D2', to: '#5BB4BE', chart: 'wave', trend: true },
                    { label: 'Clean Replies (No OOO)', count: repliedNoOOO, percent: `${cleanReplyRate}%`, link: '', targetTab: 'Inbox', from: '#8b5cf6', to: '#6d28d9', chart: 'wave', trend: true },
                    { label: 'Positive Replies', count: positive, percent: `${positiveRate}%`, link: '', targetTab: 'Inbox', from: '#10b981', to: '#059669', chart: 'wave', trend: true },
                    { label: 'Total Sent', count: sent, percent: '', link: '', targetTab: 'Schedule', from: '#E5E7EB', to: '#D1D5DB', dark: true, chart: 'bar', trend: true },
                    { label: 'Bounced', count: bounced, percent: `${bounceRate}%`, link: '', targetTab: 'Prospects', from: '#FF9013', to: '#E67B05', chart: 'bar', trend: false },
                    { label: 'Sender Bounced', count: senderBounced, percent: `${senderBounceRate}%`, link: '', targetTab: 'Prospects', from: '#f59e0b', to: '#d97706', chart: 'bar', trend: false },
                    { label: 'Unsubscribed', count: unsub, percent: `${unsubRate}%`, link: '', targetTab: 'Prospects', from: '#ef4444', to: '#b91c1c', chart: 'bar', trend: false }
                ].map((stat, i) => (
                    <GradientCard 
                        key={i}
                        label={stat.label} 
                        value={stat.count} 
                        sub={stat.percent ? `${stat.percent} of metrics` : 'Contacts enrolled'} 
                        from={stat.from} 
                        to={stat.to} 
                        dark={stat.dark}
                        chart={stat.chart} 
                        trend={stat.trend} 
                        animDelay={`${(i+1)*100}ms`} 
                        link={stat.link} 
                        targetTab={stat.targetTab}
                        onTabChange={onTabChange}
                    />
                ))}
            </motion.div>

            {/* 3. Campaign Analytics Chart */}
            <motion.div variants={itemVariants} className="card-anim bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ animationDelay: '500ms' }}>
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-slate-800 text-sm">Campaign Analytics over the period</h3>
                        <p className="text-xs text-slate-500 mt-1">Shows metrics of campaign activity across your team</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-slate-100 p-1 rounded-md text-xs font-medium">
                            {['Daily', 'Weekly', 'Monthly'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setChartFilter(f)}
                                    className={`px-3 py-1.5 rounded-sm transition-colors ${chartFilter === f ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {chartData && chartData.some(d => d.sent > 0 || d.opened > 0 || d.replied > 0) ? (
                    <div className="h-80 p-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} tickFormatter={(val) => {
                                    if (chartFilter === 'Daily') return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                    return val; 
                                }} />
                                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" iconSize={8} />
                                <Bar name="Sent" dataKey="sent" fill={COLORS.sent} radius={[2, 2, 0, 0]} maxBarSize={40} />
                                <Bar name="Open" dataKey="opened" fill={COLORS.opened} radius={[2, 2, 0, 0]} maxBarSize={40} />
                                <Bar name="Reply" dataKey="replied" fill={COLORS.replied} radius={[2, 2, 0, 0]} maxBarSize={40} />
                                <Bar name="Bounced" dataKey="bounced" fill={COLORS.bounced} radius={[2, 2, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400 p-5">
                        <TrendingUp className="w-10 h-10 mb-3 text-slate-200" />
                        <p className="font-medium text-sm">No daily activity data available yet</p>
                    </div>
                )}
            </motion.div>

            {/* 4. Sequence Analytics & Management */}
            <motion.div variants={itemVariants} className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-800 text-lg">Sequence Analytics & Management</h3>
                    {/* <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
                        <Plus className="w-4 h-4" /> Add Sequence
                    </button> */}
                </div>

                {sequences && sequences.length > 0 ? sequences.map((seq, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
                        {/* Header */}
                        <div className="border-b border-slate-100 p-4 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <h4 className="font-semibold text-slate-800">Email {seq.step} - {seq.type || 'Follow up'}</h4>
                                <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Open Rate {seq.openRate}%</span>
                            </div>
                            <button className="text-slate-400 hover:text-slate-600 transition-colors">
                                <Info className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-5 divide-x divide-slate-100">
                            <div className="p-6 text-center">
                                <div className="text-3xl font-bold text-blue-600">{seq.sent}</div>
                                <div className="text-xs font-bold text-slate-500 uppercase mt-2">Sent</div>
                            </div>
                            <div className="p-6 text-center">
                                <div className="text-2xl font-bold text-slate-800">{seq.openedCount ?? Math.round(seq.sent * (seq.openRate / 100))} <span className="text-base text-slate-400 ml-1">({seq.openRate}%)</span></div>
                                <div className="text-xs font-bold text-slate-500 uppercase mt-2 flex items-center justify-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Opened</div>
                            </div>
                            <div className="p-6 text-center">
                                <div className="text-2xl font-bold text-slate-800">{seq.repliedCount ?? Math.round(seq.sent * (seq.replyRate / 100))} <span className="text-base text-slate-400 ml-1">({seq.replyRate}%)</span></div>
                                <div className="text-xs font-bold text-slate-500 uppercase mt-2 flex items-center justify-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span> Replied</div>
                            </div>
                            <div className="p-6 text-center">
                                <div className="text-2xl font-bold text-slate-800">{seq.positiveCount || 0} <span className="text-base text-slate-400 ml-1">({seq.sent > 0 ? ((seq.positiveCount / seq.sent) * 100).toFixed(1) : 0}%)</span></div>
                                <div className="text-xs font-bold text-slate-500 uppercase mt-2 flex items-center justify-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Positive</div>
                            </div>
                            <div className="p-6 text-center">
                                <div className="text-2xl font-bold text-slate-800">{seq.bouncedCount ?? Math.round(seq.sent * (seq.bounceRate / 100))} <span className="text-base text-slate-400 ml-1">({seq.bounceRate}%)</span></div>
                                <div className="text-xs font-bold text-slate-500 uppercase mt-2 flex items-center justify-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Bounced</div>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="bg-slate-50 p-5 flex flex-col items-center justify-center border-t border-slate-100 text-center">
                            <button 
                                onClick={() => handleViewEmails(seq.step)}
                                className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-md transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <Mail className="w-4 h-4" /> View Emails
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                        No sequences added to this campaign yet.
                    </div>
                )}
            </motion.div>

            {/* 4. Bottom Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                {/* Prospect Stats - Pie Chart */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-semibold text-slate-800 text-lg">Prospect Stats</h3>
                        <span className="text-sm text-slate-400">{leadStats?.total || 0} total</span>
                    </div>
                    <div className="flex items-center justify-center">
                        <div className="h-48 w-48 relative">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={leadStats?.data || []}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        dataKey="value"
                                        startAngle={90}
                                        endAngle={-270}
                                    >
                                        {leadStats?.data?.map((entry, index) => {
                                            let color = COLORS.completed; // fallback
                                            if (entry.name === 'Active') color = COLORS.opened;
                                            if (entry.name === 'Replied') color = COLORS.replied;
                                            if (entry.name === 'Bounced') color = COLORS.bounced;
                                            if (entry.name === 'Unsubscribed') color = COLORS.unsubscribed;
                                            if (entry.name === 'Completed') color = COLORS.active;
                                            return <Cell key={`cell-${index}`} fill={color} />;
                                        })}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold text-slate-800">{replyRate}%</span>
                                <span className="text-xs uppercase font-medium text-slate-400 tracking-wider">Reply Rate</span>
                            </div>
                        </div>
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
                        {leadStats?.data?.map((item, i) => (
                            <span key={i} className="flex items-center gap-2">
                                <span
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                        backgroundColor: item.name === 'Active' ? COLORS.opened :
                                            item.name === 'Replied' ? COLORS.replied :
                                                item.name === 'Bounced' ? COLORS.bounced :
                                                    item.name === 'Unsubscribed' ? COLORS.unsubscribed :
                                                        item.name === 'Completed' ? COLORS.active : COLORS.completed
                                    }}
                                ></span>
                                <span className="text-slate-500">{item.name} ({item.value})</span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Campaign Health Breakdown */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
                    <h3 className="font-semibold text-slate-800 text-lg mb-6">Campaign Health Breakdown</h3>

                    <div className="space-y-6">
                        {/* Deliverability */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-slate-600">Deliverability</span>
                                <span className="font-bold" style={{ color: 100 - bounceRate > 95 ? COLORS.positive : 100 - bounceRate > 85 ? COLORS.unsubscribed : COLORS.bounced }}>
                                    {(100 - bounceRate).toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                                <div
                                    className="h-2 rounded-full transition-all"
                                    style={{
                                        width: `${100 - bounceRate}%`,
                                        backgroundColor: 100 - bounceRate > 95 ? COLORS.positive : 100 - bounceRate > 85 ? COLORS.unsubscribed : COLORS.bounced
                                    }}
                                ></div>
                            </div>
                        </div>

                        {/* Positive Reply Rate */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-slate-600">Positive Reply Rate</span>
                                <span className="font-bold" style={{ color: COLORS.positive }}>{positiveRate}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                                <div
                                    className="h-2 rounded-full transition-all"
                                    style={{ width: `${Math.min(positiveRate, 100)}%`, backgroundColor: COLORS.positive }}
                                ></div>
                            </div>
                        </div>

                        {/* Open Rate */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-slate-600">Open Rate</span>
                                <span className="font-bold" style={{ color: COLORS.opened }}>{openRate}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                                <div
                                    className="h-2 rounded-full transition-all"
                                    style={{ width: `${Math.min(openRate, 100)}%`, backgroundColor: COLORS.opened }}
                                ></div>
                            </div>
                        </div>

                        {/* Reply Rate */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-slate-600">Reply Rate</span>
                                <span className="font-bold" style={{ color: COLORS.replied }}>{replyRate}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                                <div
                                    className="h-2 rounded-full transition-all"
                                    style={{ width: `${Math.min(replyRate * 10, 100)}%`, backgroundColor: COLORS.replied }}
                                ></div>
                            </div>
                        </div>

                        {/* Total Sent Summary */}
                        <div className="pt-6 mt-6 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-slate-600">Total Messages Sent</span>
                                <span className="text-2xl font-bold text-slate-800">{totalMessagesSent}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Modal for View Emails */}
            <AnimatePresence>
                {selectedStep !== null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                                <h3 className="font-semibold text-lg text-slate-800">Sequence Step {selectedStep} Details</h3>
                                <button
                                    onClick={() => setSelectedStep(null)}
                                    className="p-1 hover:bg-slate-200 rounded-lg transition-colors text-slate-500"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                                {stepEmailsLoading ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
                                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                        <p>Loading template and replies...</p>
                                    </div>
                                ) : stepEmailsData ? (
                                    <div className="space-y-8">
                                        {/* Sent Template */}
                                        <div>
                                            <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-indigo-500" /> Original Template
                                            </h4>
                                            <div className="bg-white border text-sm border-slate-200 rounded-lg p-5 shadow-sm">
                                                <div className="font-medium text-slate-800 border-b border-slate-100 pb-3 mb-3">
                                                    Subject: {stepEmailsData.template.subject}
                                                </div>
                                                <div className="text-slate-600 whitespace-pre-wrap">
                                                    {stepEmailsData.template.body}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Prospect Replies */}
                                        <div>
                                            <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 text-emerald-500" /> Recent Prospect Replies
                                            </h4>
                                            {stepEmailsData.recent_replies && stepEmailsData.recent_replies.length > 0 ? (
                                                <div className="space-y-4">
                                                    {stepEmailsData.recent_replies.map((reply, idx) => (
                                                        <div key={idx} className="bg-white border text-sm border-slate-200 rounded-lg p-5 shadow-sm">
                                                            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                                                                <div>
                                                                    <span className="font-semibold text-slate-800">From: </span>
                                                                    <span className="text-slate-600">{reply.from_email}</span>
                                                                </div>
                                                                <span className="text-xs text-slate-400">
                                                                    {reply.received_at ? new Date(reply.received_at).toLocaleString() : ''}
                                                                </span>
                                                            </div>
                                                            <div className="font-medium text-slate-800 mb-2">
                                                                Re: {reply.subject}
                                                            </div>
                                                            <div className="text-slate-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                                                {reply.body_text}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500 text-sm shadow-sm">
                                                    No replies have been received for this step yet.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-red-500 p-8">Failed to load data.</div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
