import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { reportsApi } from '../../api/reports';
import { formatDateRange } from './reportWidgets';

// Data and actions of the Analytics & Reports page: the dashboard summary for the date range and
// (optionally) one user, the team-member filter, and the CSV / Word exports.
export function useReportsDashboard() {
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


    return {
        range, setRange, selectedUserId, setSelectedUserId, userDropdownOpen, setUserDropdownOpen, userDropdownRef,
        exportingGlobal, exportingDocx, exportingCampaign, exportingDeliverability,
        isFetching, error, refetch, loading,
        kpis, timeseries, leadStats, campaignStats, mailboxStats, providers, mailboxHealth, topCampaigns, optimization,
        cachedTeamMembers, canFilterUsers, selectedUser,
        handleExportGlobal, handleExportDocx, handleExportCampaign, handleExportDeliverability,
        openRate, replyRate, bounceRate,
    };
}
