import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, MailOpen, MessageSquare, Send, TrendingUp } from 'lucide-react';
import { campaignApi } from '../../api/campaigns';
import deliverabilityApi from '../../api/deliverability';
import { reportsApi } from '../../api/reports';
import { formatTimeseries, getTabParams, getTabSubtitle } from './chartData';
import { normalizeApiTimestamp, readSeenAlertIds, writeSeenAlertIds } from './dashboardAlerts';

// Data and state of the Dashboard page: chart range tabs (with a fade between ranges), campaign totals
// and rates, recent / top campaigns, and the alert center (unread tracking in localStorage).
export function useDashboard() {
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
        // Keyed on the alerts' content signature, not the array (a new one on every refetch)
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    return {
        navigate, activeTab, chartTab, chartFade, isAlertOpen, setIsAlertOpen, unseenAlertIds, alertPopupRef,
        handleTabChange, isLoading, dashboardAlerts, totals, openRate, replyRate, bounceRate, unsubscribeRate,
        statusCounts, areaData, tabSubtitle, donutData, recent, topCampaigns, relTime, statusColors,
        activityIconStyles, bellShouldRing, unreadAlertSet, markAlertsAsRead, markAllAsRead, toggleAlertPanel,
    };
}
