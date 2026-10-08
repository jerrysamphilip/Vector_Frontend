import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    TrendingUp, TrendingDown, Send, MailOpen,
    MessageSquare, AlertCircle, Plus, ArrowRight,
    BellRing, ChevronDown, ChevronUp, PauseCircle, ShieldAlert, ServerCrash, UserX,
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell,
} from 'recharts';
import Header from '../components/layout/Header';
import Loading from '../components/common/Loading';
import { campaignApi } from '../api/campaigns';
import deliverabilityApi from '../api/deliverability';
import { reportsApi } from '../api/reports';
import { hasPermission } from '../lib/authStorage';
import KpiTile from '../components/ui/KpiTile';

// ─── Tab configuration for date ranges ────────────────────────────────────────
function getTabParams(tab) {
    const today = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];
    switch (tab) {
        case 'DAILY': {
            const start = new Date(today);
            start.setDate(today.getDate() - 6); // last 7 days including today
            return { start_date: fmt(start), end_date: fmt(today), granularity: 'daily' };
        }
        case 'WEEKLY': {
            const start = new Date(today);
            start.setDate(today.getDate() - 27); // last 4 weeks
            return { start_date: fmt(start), end_date: fmt(today), granularity: 'weekly' };
        }
        case 'MONTHLY': {
            const start = new Date(today);
            start.setMonth(today.getMonth() - 5); // last 6 months
            start.setDate(1);
            return { start_date: fmt(start), end_date: fmt(today), granularity: 'daily' };
        }
        case 'YEARLY': {
            const start = new Date(today);
            start.setFullYear(today.getFullYear() - 3);
            start.setMonth(0, 1);
            return { start_date: fmt(start), end_date: fmt(today), granularity: 'daily' };
        }
        default:
            return { start_date: fmt(new Date(today.setDate(today.getDate() - 29))), end_date: fmt(new Date()), granularity: 'daily' };
    }
}

function getTabSubtitle(tab) {
    switch (tab) {
        case 'DAILY':   return 'Last 7 days';
        case 'WEEKLY':  return 'Last 4 weeks';
        case 'MONTHLY': return 'Last 6 months';
        case 'YEARLY':  return 'Last 4 years';
        default:        return '';
    }
}

function formatTimeseries(timeseries, tab) {
    if (!timeseries || timeseries.length === 0) return [];

    if (tab === 'DAILY') {
        // Show actual dates like "Mar 20", "Mar 21", etc.
        return timeseries.map(p => ({
            label: new Date(p.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            Sent: p.sent,
            Opened: p.opened,
        }));
    }

    if (tab === 'WEEKLY') {
        // Already aggregated weekly by backend — show date range like "Feb 27 – Mar 5"
        return timeseries.map((p, i) => {
            const start = new Date(p.date + 'T00:00:00');
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            const fmtShort = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return {
                label: `${fmtShort(start)} – ${fmtShort(end)}`,
                Sent: p.sent,
                Opened: p.opened,
            };
        });
    }

    if (tab === 'MONTHLY') {
        // Aggregate daily points into months
        const monthMap = {};
        timeseries.forEach(p => {
            const d = new Date(p.date + 'T00:00:00');
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!monthMap[key]) monthMap[key] = { sent: 0, opened: 0, date: d };
            monthMap[key].sent += p.sent;
            monthMap[key].opened += p.opened;
        });
        return Object.entries(monthMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, v]) => ({
                label: v.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                Sent: v.sent,
                Opened: v.opened,
            }));
    }

    if (tab === 'YEARLY') {
        // Aggregate daily points into years
        const yearMap = {};
        timeseries.forEach(p => {
            const y = p.date.slice(0, 4);
            if (!yearMap[y]) yearMap[y] = { sent: 0, opened: 0 };
            yearMap[y].sent += p.sent;
            yearMap[y].opened += p.opened;
        });
        return Object.entries(yearMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([year, v]) => ({
                label: year,
                Sent: v.sent,
                Opened: v.opened,
            }));
    }

    return [];
}

// ─── Tiny inline SVG sparklines for gradient cards ───────────────────────────
// ─── Custom Area Tooltip ──────────────────────────────────────────────────────
function AreaTooltip({ active, payload, label }) {
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

// ─── Custom Donut Label ───────────────────────────────────────────────────────
function DonutLabel({ cx, cy, total }) {
    return (
        <>
            <text x={cx} y={cy - 8} textAnchor="middle" className="text-3xl font-bold" fill="#111827"
                style={{ fontSize: 26, fontWeight: 700 }}>{total}</text>
            <text x={cx} y={cy + 16} textAnchor="middle" fill="#9ca3af"
                style={{ fontSize: 11 }}>campaigns</text>
        </>
    );
}

// ─── Gradient Card with hover-replay sparkline ───────────────────────────────
function GradientCard(props) {
    return <KpiTile {...props} />;
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const DASHBOARD_SEEN_ALERTS_KEY = 'dashboard_seen_alert_ids_v2';

function readSeenAlertIds() {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(DASHBOARD_SEEN_ALERTS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeSeenAlertIds(alertIds) {
    if (typeof window === 'undefined') return;
    try {
        const uniqueIds = [...new Set(alertIds)].slice(-200);
        window.localStorage.setItem(DASHBOARD_SEEN_ALERTS_KEY, JSON.stringify(uniqueIds));
    } catch {
        // Ignore storage failures and keep the dashboard usable.
    }
}

function alertSeverityRank(severity) {
    switch ((severity || '').toUpperCase()) {
        case 'CRITICAL':
            return 0;
        case 'WARNING':
            return 1;
        default:
            return 2;
    }
}

function humanizeAlertType(alertType) {
    if (!alertType) return 'Alert';
    return alertType
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function formatAlertTime(dateValue) {
    if (!dateValue) return 'Just now';
    const diffMs = Date.now() - new Date(dateValue).getTime();
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

function normalizeApiTimestamp(dateValue) {
    if (!dateValue || typeof dateValue !== 'string') return dateValue;
    // If backend sends naive UTC (no timezone), treat it explicitly as UTC.
    const hasZone = /[zZ]|[+\-]\d{2}:\d{2}$/.test(dateValue);
    if (hasZone) return dateValue;
    const isoLike = dateValue.includes('T') ? dateValue : dateValue.replace(' ', 'T');
    return `${isoLike}Z`;
}

function getAlertVisual(alert) {
    const severity = (alert.severity || 'INFO').toUpperCase();

    if (alert.source === 'EMAIL') {
        return {
            Icon: PauseCircle,
            badge: 'Email',
            border: severity === 'CRITICAL' ? 'border-red-200' : 'border-amber-200',
            iconBg: severity === 'CRITICAL' ? 'bg-red-100' : 'bg-amber-100',
            iconColor: severity === 'CRITICAL' ? 'text-red-600' : 'text-amber-600',
            badgeClass: severity === 'CRITICAL' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700',
        };
    }

    if (alert.source === 'CAMPAIGN') {
        return {
            Icon: PauseCircle,
            badge: 'Campaign',
            border: 'border-blue-200',
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-700',
            badgeClass: 'bg-blue-50 text-blue-700',
        };
    }

    if (alert.source === 'SYNC') {
        return {
            Icon: ServerCrash,
            badge: 'Sync',
            border: 'border-orange-200',
            iconBg: 'bg-orange-100',
            iconColor: 'text-orange-600',
            badgeClass: 'bg-orange-50 text-orange-700',
        };
    }

    return {
        Icon: ShieldAlert,
        badge: 'Domain',
        border: severity === 'CRITICAL' ? 'border-red-200' : 'border-amber-200',
        iconBg: severity === 'CRITICAL' ? 'bg-red-100' : 'bg-amber-100',
        iconColor: severity === 'CRITICAL' ? 'text-red-600' : 'text-amber-700',
        badgeClass: severity === 'CRITICAL' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700',
    };
}

function buildDashboardAlerts(deliverabilityAlerts = [], inboxes = [], campaigns = []) {
    const alerts = [];

    deliverabilityAlerts.forEach((alert) => {
        alerts.push({
            id: `deliverability:${alert.alert_id}`,
            source: 'DOMAIN',
            severity: (alert.severity || 'WARNING').toUpperCase(),
            title: `${humanizeAlertType(alert.alert_type)} on ${alert.domain_name}`,
            message: alert.details || 'Deliverability issue detected on this sending domain.',
            createdAt: alert.created_at,
            route: '/app/domain-health',
            actionLabel: 'Open Domain Health',
        });
    });

    inboxes.forEach((inbox) => {
        if ((inbox.status || '').toUpperCase() === 'PAUSED') {
            alerts.push({
                id: `email-paused:${inbox.inbox_id}:${inbox.status}`,
                source: 'EMAIL',
                severity: 'WARNING',
                title: 'Suspended Alerts (Email)',
                message: `${inbox.email_address} is paused and will not send campaign emails until resumed.`,
                createdAt: inbox.last_sent_at || inbox.last_sync_at || new Date().toISOString(),
                route: '/app/inboxes',
                actionLabel: 'Open Email Accounts',
            });
        }

        if (inbox.last_sync_at) {
            const staleHours = (Date.now() - new Date(inbox.last_sync_at).getTime()) / 36e5;
            if (staleHours >= 48) {
                alerts.push({
                    id: `email-sync:${inbox.inbox_id}:${new Date(inbox.last_sync_at).toISOString()}`,
                    source: 'SYNC',
                    severity: staleHours >= 96 ? 'CRITICAL' : 'WARNING',
                    title: 'Inbox sync is stale',
                    message: `${inbox.email_address} has not synced replies for ${Math.floor(staleHours)} hours.`,
                    createdAt: inbox.last_sync_at,
                    route: '/app/inboxes',
                    actionLabel: 'Review inbox sync',
                });
            }
        }
    });

    campaigns.forEach((campaign) => {
        if ((campaign.status || '').toUpperCase() === 'PAUSED') {
            alerts.push({
                id: `campaign-paused:${campaign.campaign_id}:${campaign.updated_at}`,
                source: 'CAMPAIGN',
                severity: 'INFO',
                title: 'Campaign activity is paused',
                message: `${campaign.campaign_name} is paused and not progressing until it is resumed.`,
                createdAt: campaign.updated_at,
                route: `/app/campaigns/${campaign.campaign_id}`,
                actionLabel: 'Open campaign',
            });
        }
    });

    return alerts.sort((a, b) => {
        const severityDiff = alertSeverityRank(a.severity) - alertSeverityRank(b.severity);
        if (severityDiff !== 0) return severityDiff;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
}

export default function Dashboard() {
    const navigate = useNavigate();
    const [activeTab,  setActiveTab]  = useState('MONTHLY');
    const [chartTab,   setChartTab]   = useState('MONTHLY'); // lags behind for fade
    const [chartFade,  setChartFade]  = useState(true);      // true = visible
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [unseenAlertIds, setUnseenAlertIds] = useState([]);
    const fadeTimer = useRef(null);
    const alertPopupRef = useRef(null);

    const handleTabChange = (t) => {
        if (t === activeTab) return;
        clearTimeout(fadeTimer.current);
        setActiveTab(t);
        setChartFade(false);                          // 1. fade out
        fadeTimer.current = setTimeout(() => {
            setChartTab(t);                           // 2. swap data while invisible
            setChartFade(true);                       // 3. fade in with new data
        }, 180);
    };

    // cleanup on unmount
    useEffect(() => () => clearTimeout(fadeTimer.current), []);

    // Close alert popup on outside click
    useEffect(() => {
        if (!isAlertOpen) return;
        function handleOutsideClick(e) {
            if (alertPopupRef.current && !alertPopupRef.current.contains(e.target)) {
                setIsAlertOpen(false);
            }
        }
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isAlertOpen]);

    // Fetch real timeseries data based on active tab
    const tabParams = getTabParams(activeTab);
    const { data: chartApiData } = useQuery({
        queryKey: ['dashboard-chart', activeTab, tabParams.start_date, tabParams.end_date],
        queryFn: () => reportsApi.globalAnalytics(tabParams),
        staleTime: 60_000,
    });

    const { data: campaignsData, isLoading } = useQuery({
        queryKey: ['campaigns'],
        queryFn: () => campaignApi.list({ page_size: 20 }),
    });

    const { data: dashboardAlerts = [] } = useQuery({
        queryKey: ['dashboard-alerts-v2'],
        queryFn: async () => {
            try {
                const alerts = await deliverabilityApi.getDashboardAlerts();
                return alerts.map((alert) => ({
                    ...alert,
                    createdAt: normalizeApiTimestamp(alert.created_at),
                    actionLabel: alert.action_label,
                }));
            } catch {
                return [];
            }
        },
        staleTime: 30_000,
        refetchInterval: 60_000,
    });

    const campaigns = campaignsData?.items || [];
    const dashboardAlertSignature = dashboardAlerts.map((alert) => `${alert.id}:${alert.createdAt || ''}:${alert.severity}`).join('|');

    const totals = campaigns.reduce((acc, c) => ({
        sent: acc.sent + (c.sent_count || 0),
        opened: acc.opened + (c.opened_count || 0),
        replied: acc.replied + (c.replied_count || 0),
        bounced: acc.bounced + (c.bounced_count || 0),
        unsubscribed: acc.unsubscribed + (c.unsubscribed_count || 0),
    }), { sent: 0, opened: 0, replied: 0, bounced: 0, unsubscribed: 0 });

    const openRate         = totals.sent > 0 ? ((totals.opened       / totals.sent) * 100).toFixed(1) : '0.0';
    const replyRate        = totals.sent > 0 ? ((totals.replied      / totals.sent) * 100).toFixed(1) : '0.0';
    const bounceRate       = totals.sent > 0 ? ((totals.bounced      / totals.sent) * 100).toFixed(1) : '0.0';
    const unsubscribeRate  = totals.sent > 0 ? ((totals.unsubscribed / totals.sent) * 100).toFixed(1) : '0.0';

    const statusCounts = {
        active:    campaigns.filter(c => c.status === 'ACTIVE').length,
        paused:    campaigns.filter(c => c.status === 'PAUSED').length,
        draft:     campaigns.filter(c => c.status === 'DRAFT').length,
        completed: campaigns.filter(c => c.status === 'COMPLETED').length,
        total:     campaigns.length,
    };

    const areaData   = formatTimeseries(chartApiData?.timeseries || [], chartTab);
    const tabSubtitle = getTabSubtitle(activeTab);
    const donutData  = [
        { name: 'Active',    value: Math.max(statusCounts.active, 0), color: '#0046FF' },
        { name: 'Paused',    value: Math.max(statusCounts.paused, 0), color: '#73C8D2' },
        { name: 'Draft',     value: Math.max(statusCounts.draft, 0), color: '#F5F1DC' },
        { name: 'Completed', value: Math.max(statusCounts.completed, 0), color: '#FF9013' },
    ].filter(d => d.value > 0);

    // Recent 5 campaigns sorted by updated_at
    const recent = [...campaigns]
        .sort((a, b) => new Date(normalizeApiTimestamp(b.updated_at)) - new Date(normalizeApiTimestamp(a.updated_at)))
        .slice(0, 5);

    // Top campaigns for table
    const topCampaigns = [...campaigns]
        .sort((a, b) => (b.sent_count || 0) - (a.sent_count || 0))
        .slice(0, 6);

    function relTime(dateStr) {
        const normalized = normalizeApiTimestamp(dateStr);
        const diff = Date.now() - new Date(normalized).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1)   return 'Just now';
        if (m < 60)  return `${m} min${m !== 1 ? 's' : ''} ago`;
        const h = Math.floor(m / 60);
        if (h < 24)  return `${h} hr${h !== 1 ? 's' : ''} ago`;
        const d = Math.floor(h / 24);
        return `${d} day${d !== 1 ? 's' : ''} ago`;
    }

    const statusColors = {
        ACTIVE: 'bg-emerald-100 text-emerald-700',
        PAUSED: 'bg-amber-100 text-amber-700',
        DRAFT:  'bg-gray-100 text-gray-500',
        COMPLETED: 'bg-blue-100 text-blue-700',
    };

    const activityIconStyles = [
        { bg: '#0046FF', Icon: Send },
        { bg: '#73C8D2', Icon: MailOpen },
        { bg: '#FF9013', Icon: MessageSquare },
        { bg: '#e6a830', Icon: AlertCircle },
        { bg: '#4db0bb', Icon: TrendingUp },
    ];

    useEffect(() => {
        if (dashboardAlerts.length === 0) {
            setUnseenAlertIds([]);
            setIsAlertOpen(false);
            return;
        }

        const currentIds = dashboardAlerts.map((alert) => alert.id);
        const rawSeenIds = readSeenAlertIds();
        const seenIds = rawSeenIds.filter((id) => currentIds.includes(id));
        if (seenIds.length !== rawSeenIds.length) {
            writeSeenAlertIds(seenIds);
        }

        const unseenIds = currentIds.filter((alertId) => !seenIds.includes(alertId));
        setUnseenAlertIds(unseenIds);
    }, [dashboardAlertSignature]);

    const bellShouldRing = unseenAlertIds.length > 0;
    const unreadAlertSet = new Set(unseenAlertIds);

    const markAlertsAsRead = (alertIds) => {
        if (!alertIds || alertIds.length === 0) return;
        const seenIds = readSeenAlertIds();
        writeSeenAlertIds([...seenIds, ...alertIds]);
        setUnseenAlertIds((prev) => prev.filter((id) => !alertIds.includes(id)));
    };

    const markAllAsRead = () => {
        markAlertsAsRead(unseenAlertIds);
    };

    const toggleAlertPanel = () => {
        if (dashboardAlerts.length === 0) return;
        setIsAlertOpen((open) => !open);
    };

    const dashboardSidebar = (
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

    if (isLoading) return <Loading text="Loading dashboard..." size="lg" fullScreen />;

    return (
        <div className="space-y-6">
            <Header
                actionSlot={
                    <div className="relative" ref={alertPopupRef}>
                        <button
                            type="button"
                            onClick={toggleAlertPanel}
                            className={`relative inline-flex items-center justify-center rounded-2xl border w-10 h-10 text-sm font-semibold transition-all ${
                                dashboardAlerts.length > 0
                                    ? 'border-amber-200 bg-white text-slate-700 hover:border-amber-300 hover:shadow-sm'
                                    : 'border-slate-200 bg-white/75 text-slate-400'
                            } ${bellShouldRing ? 'dashboard-bell-ring' : ''}`}
                            aria-label="Open alerts"
                        >
                            <BellRing className={`h-4 w-4 ${dashboardAlerts.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                            {dashboardAlerts.length > 0 && (
                                <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                                    {unseenAlertIds.length}
                                </span>
                            )}
                        </button>

                        {/* Alert Center Popup */}
                        <AnimatePresence>
                            {isAlertOpen && dashboardAlerts.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                    transition={{ duration: 0.18, ease: 'easeOut' }}
                                    className="absolute right-0 top-12 z-50 w-[380px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">Alert Center</p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {unseenAlertIds.length} unread · {dashboardAlerts.length} active alert{dashboardAlerts.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={markAllAsRead}
                                                disabled={unseenAlertIds.length === 0}
                                                className={`text-[10px] font-semibold ${
                                                    unseenAlertIds.length === 0
                                                        ? 'text-gray-300 cursor-not-allowed'
                                                        : 'text-[#0046FF] hover:underline'
                                                }`}
                                            >
                                                Mark all read
                                            </button>
                                            <button
                                                onClick={() => setIsAlertOpen(false)}
                                                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                                                aria-label="Close alerts"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Alert list */}
                                    <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
                                        {dashboardAlerts.map((alert) => {
                                            const { Icon, badge, border, iconBg, iconColor, badgeClass } = getAlertVisual(alert);
                                            return (
                                                <div
                                                    key={alert.id}
                                                    className={`flex items-start gap-3 px-5 py-4 border-l-2 ${border} hover:bg-gray-50/60 transition-colors`}
                                                >
                                                    <span className={`w-8 h-8 flex items-center justify-center rounded-xl shrink-0 mt-0.5 ${iconBg}`}>
                                                        <Icon size={15} className={iconColor} />
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                            <p className="text-xs font-semibold text-gray-800 truncate">{alert.title}</p>
                                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badgeClass}`}>{badge}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{alert.message}</p>
                                                        <div className="flex items-center justify-between mt-2">
                                                            <span className="text-[10px] text-gray-400">{formatAlertTime(alert.createdAt)}</span>
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    onClick={() => markAlertsAsRead([alert.id])}
                                                                    disabled={!unreadAlertSet.has(alert.id)}
                                                                    className={`text-[10px] font-semibold ${
                                                                        unreadAlertSet.has(alert.id)
                                                                            ? 'text-gray-500 hover:underline'
                                                                            : 'text-gray-300 cursor-not-allowed'
                                                                    }`}
                                                                >
                                                                    {unreadAlertSet.has(alert.id) ? 'Mark read' : 'Read'}
                                                                </button>
                                                                {alert.route && (
                                                                    <button
                                                                        onClick={() => {
                                                                            markAlertsAsRead([alert.id]);
                                                                            navigate(alert.route);
                                                                            setIsAlertOpen(false);
                                                                        }}
                                                                        className="text-[10px] font-semibold text-[#0046FF] hover:underline"
                                                                    >
                                                                        {alert.actionLabel || 'View'} →
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                }
            />

            {/* ── Row 1: Main Chart + Sidebar ────────────────────────────── */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2.1fr)_minmax(320px,1fr)] xl:items-stretch">

                {/* Left — Chart card */}
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

                {/* Right — Sidebar */}
                <div className="min-w-0">
                    {dashboardSidebar}
                </div>
            </div>

            {/* ── Row 2: 5 Mini Stat Cards ───────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Total Sent',   value: totals.sent,         icon: Send,          iconBg: '#d6e0ff', iconColor: '#0046FF', textColor: '#0035cc' },
                    { label: 'Opens',        value: totals.opened,       icon: MailOpen,      iconBg: '#d8f1f4', iconColor: '#73C8D2', textColor: '#4aabb5' },
                    { label: 'Replies',      value: totals.replied,      icon: MessageSquare, iconBg: '#fff4dc', iconColor: '#e6a830', textColor: '#b07d10' },
                    { label: 'Bounces',      value: totals.bounced,      icon: AlertCircle,   iconBg: '#fff0d9', iconColor: '#FF9013', textColor: '#cc6f00' },
                    { label: 'Unsubscribes', value: totals.unsubscribed, icon: UserX,         iconBg: '#f4e1e6', iconColor: '#c2436b', textColor: '#a02f54' },
                ].map(({ label, value, icon: Icon, iconBg, iconColor, textColor }, i) => (
                    <div
                        key={label}
                        className="card-anim bg-white/80 rounded-2xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
                        style={{ animationDelay: `${160 + i * 80}ms` }}
                    >
                        <span className="w-11 h-11 flex items-center justify-center rounded-xl shrink-0" style={{ backgroundColor: iconBg }}>
                            <Icon size={20} style={{ color: iconColor }} />
                        </span>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">{label}</p>
                            <p className="text-xl font-bold mt-0.5" style={{ color: textColor }}>{value.toLocaleString()}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Row 3: 5 Gradient Cards ────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <GradientCard label="Open Rate"        value={`${openRate}%`}        sub="Of total sent"                   from="#2d6bbf" to="#1f56aa" dark={false} chart="bar"  trend={parseFloat(openRate) >= 20}         animDelay="480ms" />
                <GradientCard label="Reply Rate"       value={`${replyRate}%`}       sub="Of total sent"                   from="#F5F1DC" to="#e8e3c0" dark={true}  chart="wave" trend={parseFloat(replyRate) >= 5}        animDelay="560ms" />
                <GradientCard label="Campaigns"        value={statusCounts.total}    sub={`${statusCounts.active} active`} from="#FF9013" to="#cc6f00" dark={false} chart="wave" trend={statusCounts.active > 0}          animDelay="640ms" />
                <GradientCard label="Bounce Rate"      value={`${bounceRate}%`}      sub="Of total sent"                   from="#73C8D2" to="#4db0bb" dark={false} chart="bar"  trend={parseFloat(bounceRate) < 5}        animDelay="720ms" />
                <GradientCard label="Unsubscribe Rate" value={`${unsubscribeRate}%`} sub="Of total sent"                   from="#a5406b" to="#832f54" dark={false} chart="bar"  trend={parseFloat(unsubscribeRate) < 2}   animDelay="800ms" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Recent Activity */}
                <div className="card-anim bg-white/80 rounded-2xl shadow-sm p-6" style={{ animationDelay: '720ms' }}>
                    <p className="text-sm font-semibold text-gray-800 mb-1">Recent Activities</p>
                    <p className="text-xs text-gray-400 mb-5">Latest campaign updates</p>
                    <div className="space-y-4">
                        {recent.length === 0 ? (
                            <p className="text-sm text-gray-300 text-center py-6">No recent activity</p>
                        ) : recent.map((c, i) => {
                            const { bg, Icon } = activityIconStyles[i % activityIconStyles.length];
                            return (
                                <div key={c.campaign_id} className="flex items-start gap-3">
                                    <span className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 mt-0.5" style={{ background: bg }}>
                                        <Icon size={14} className="text-white" />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-700 truncate">{c.campaign_name}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            <span className="capitalize">{c.status.toLowerCase()}</span> · {relTime(c.updated_at)}
                                        </p>
                                    </div>
                                    <span className="text-xs text-gray-300 shrink-0 mt-0.5">{relTime(c.updated_at)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Campaigns Table — xl: 2/3 */}
                <div className="card-anim xl:col-span-2 bg-white/80 rounded-2xl shadow-sm overflow-hidden" style={{ animationDelay: '800ms' }}>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                        <div>
                            <p className="text-sm font-semibold text-gray-800">Campaign Status</p>
                            <p className="text-xs text-gray-400 mt-0.5">Overview of all campaigns</p>
                        </div>
                        {hasPermission('manage_campaigns') && (
                            <button
                                onClick={() => navigate('/app/campaigns/new')}
                                className="flex items-center gap-1.5 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-sm hover:opacity-90 transition-opacity"
                                style={{ background: 'linear-gradient(135deg, #0046FF, #73C8D2)' }}
                            >
                                <Plus size={13}/> New
                            </button>
                        )}
                    </div>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="py-3 px-5 text-xs font-semibold text-slate-500/90 uppercase tracking-wider">Campaign</th>
                                <th className="py-3 px-5 text-xs font-semibold text-slate-500/90 uppercase tracking-wider text-center">Sent</th>
                                <th className="py-3 px-5 text-xs font-semibold text-slate-500/90 uppercase tracking-wider text-center">Open %</th>
                                <th className="py-3 px-5 text-xs font-semibold text-slate-500/90 uppercase tracking-wider text-center">Reply %</th>
                                <th className="py-3 px-5 text-xs font-semibold text-slate-500/90 uppercase tracking-wider text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {topCampaigns.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-10 text-center text-gray-300 text-sm">No campaigns yet</td>
                                </tr>
                            ) : topCampaigns.map((c) => {
                                const oRate = c.sent_count > 0 ? ((c.opened_count / c.sent_count) * 100).toFixed(1) : '0.0';
                                const rRate = c.sent_count > 0 ? ((c.replied_count / c.sent_count) * 100).toFixed(1) : '0.0';
                                return (
                                    <tr key={c.campaign_id}
                                        className="hover:bg-gray-50/60 cursor-pointer transition-colors group"
                                        onClick={() => navigate(`/app/campaigns/${c.campaign_id}`)}>
                                        <td className="py-3.5 px-5">
                                            <span className="text-sm font-medium text-gray-700 transition-colors truncate block max-w-[180px] group-hover:text-[#0046FF]">{c.campaign_name}</span>
                                        </td>
                                        <td className="py-3.5 px-5 text-center text-sm font-semibold text-gray-700">{(c.sent_count || 0).toLocaleString()}</td>
                                        <td className="py-3.5 px-5 text-center">
                                            <span className={`text-sm font-semibold ${parseFloat(oRate) >= 20 ? 'text-emerald-500' : parseFloat(oRate) > 0 ? 'text-amber-500' : 'text-gray-400'}`}>{oRate}%</span>
                                        </td>
                                        <td className="py-3.5 px-5 text-center">
                                            <span className={`text-sm font-semibold ${parseFloat(rRate) >= 5 ? 'text-emerald-500' : parseFloat(rRate) > 0 ? 'text-blue-500' : 'text-gray-400'}`}>{rRate}%</span>
                                        </td>
                                        <td className="py-3.5 px-5 text-right">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColors[c.status] || 'bg-gray-100 text-gray-500'}`}>{c.status.toLowerCase()}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

