import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pause, Play, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { campaignApi } from '../api/campaigns';
import { isStaleVersion } from '../lib/staleVersion';
import StatusBadge from '../components/campaigns/StatusBadge';
import Loading from '../components/common/Loading';
import LoadError from '../components/ui/LoadError';
import { errorMessage, isNotFound } from '../lib/apiErrors';
import PageTransition, { containerVariants, itemVariants } from '../components/layout/PageTransition';

// Tab Components
import AnalyticsTab from '../components/campaigns/tabs/AnalyticsTab';
import LeadListTab from '../components/campaigns/tabs/LeadListTab';
import SubsequenceTab from '../components/campaigns/tabs/SubsequenceTab';
import TriggerLogsTab from '../components/campaigns/tabs/TriggerLogsTab';
import ScheduleTab from '../components/campaigns/tabs/ScheduleTab';
import SendingInboxesTab from '../components/campaigns/tabs/SendingInboxesTab';
import InboxTab from '../components/campaigns/tabs/InboxTab';
import SettingsTab from '../components/campaigns/tabs/SettingsTab';
import CampaignActionsMenu from '../components/campaigns/actions/CampaignActionsMenu';
import { useCampaignDialogs } from '../components/campaigns/actions/useCampaignDialogs';

export default function CampaignDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('Analytics');
    const [chartFilter, setChartFilter] = useState('Daily');

    // Queries
    // Fetch all in parallel for speed
    const { data: campaign, isLoading: campaignLoading, error: campaignError, refetch: refetchCampaign } = useQuery({
        queryKey: ['campaign', id],
        queryFn: () => campaignApi.get(id),
        staleTime: 60000,
        refetchOnWindowFocus: false,
    });

    // We no longer need a separate metrics fetch because the campaign object includes them
    // const { data: metrics, isLoading: metricsLoading } = useQuery(...)

    // NEW: Fetch real analytics data upfront with 180 days so tab switching is instant
    const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useQuery({
        queryKey: ['campaign-analytics', id],
        queryFn: () => campaignApi.getAnalytics(id, 180),
        // No longer waiting for campaign to start this - parallelize!
    });

    // Schedule data — same cache key as ScheduleTab so both stay in sync
    const { refetch: refetchSchedule } = useQuery({
        queryKey: ['campaign-schedule', id],
        queryFn: () => campaignApi.getSchedule(id),
        staleTime: 0,
        refetchOnWindowFocus: false,
    });

    // Send Now Mutation: the server sends a capped batch per request, so keep
    // calling until nothing is left, showing progress on the button.
    const [sendProgress, setSendProgress] = useState('');
    // In-page result / error banner for Send now, pause and resume (was window.alert)
    const [banner, setBanner] = useState(null); // { tone: 'success' | 'error', text }
    const sendNowMutation = useMutation({
        mutationFn: async (id) => {
            const totals = { sent: 0, failed: 0, skipped: 0 };
            let params = {};
            for (let batch = 0; batch < 1000; batch += 1) {
                const data = await campaignApi.sendNow(id, params);
                totals.sent += data.sent || 0;
                totals.failed += data.failed || 0;
                totals.skipped += data.skipped || 0;
                if (!data.has_more || !data.cursor) break;
                setSendProgress(`Sending... ${totals.sent} sent, ${data.remaining} left`);
                params = { cursor: data.cursor, since: data.started_at };
            }
            return totals;
        },
        onSettled: () => setSendProgress(''),
        onSuccess: (data) => {
            setBanner({
                tone: data.failed ? 'error' : 'success',
                text: `Send now finished: ${data.sent} sent, ${data.failed} failed${data.skipped ? `, ${data.skipped} skipped` : ''}. Check the Schedule tab for updates.`,
            });
            queryClient.invalidateQueries({ queryKey: ['campaign', id] });
            queryClient.invalidateQueries({ queryKey: ['campaign-analytics', id] });
            // Force refresh schedule
            refetchSchedule();
        },
        onError: (error) => {
            setBanner({ tone: 'error', text: `Error sending emails: ${errorMessage(error)}` });
        }
    });

    // Pause / Resume Mutations
    const pauseMutation = useMutation({
        // T-3: the version on screen; a campaign changed meanwhile gets 409 (StaleVersionBanner)
        mutationFn: (id) => campaignApi.pause(id, null, campaign?.row_version),
        onSuccess: () => {
            setBanner(null);
            queryClient.invalidateQueries({ queryKey: ['campaign', id] });
            queryClient.invalidateQueries({ queryKey: ['campaigns'], exact: false });
        },
        onError: (error) => {
            if (isStaleVersion(error)) return;
            setBanner({ tone: 'error', text: `Error pausing campaign: ${errorMessage(error)}` });
        }
    });

    const resumeMutation = useMutation({
        mutationFn: (id) => campaignApi.resume(id, campaign?.row_version),
        onSuccess: () => {
            setBanner(null);
            queryClient.invalidateQueries({ queryKey: ['campaign', id] });
            queryClient.invalidateQueries({ queryKey: ['campaigns'], exact: false });
        },
        onError: (error) => {
            if (isStaleVersion(error)) return;
            setBanner({ tone: 'error', text: `Error resuming campaign: ${errorMessage(error)}` });
        }
    });

    const launchMutation = useMutation({
        mutationFn: (id) => campaignApi.launch(id, campaign?.row_version),
        onSuccess: () => {
            setBanner(null);
            queryClient.invalidateQueries({ queryKey: ['campaign', id] });
            queryClient.invalidateQueries({ queryKey: ['campaigns'], exact: false });
        },
        onError: (error) => {
            if (isStaleVersion(error)) return;
            setBanner({ tone: 'error', text: `Error launching campaign: ${errorMessage(error)}` });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => campaignApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaigns'], exact: false });
            navigate('/app/campaigns');
        },
        onError: (error) => setBanner({ tone: 'error', text: `Error deleting campaign: ${errorMessage(error)}` }),
    });

    // ⋮ menu: Rename / Duplicate dialogs, Launch, Pause / Resume, Delete (confirmed)
    const { openDialog, dialogs } = useCampaignDialogs({
        onOpenCopy: (copy) => { setActiveTab('Analytics'); navigate(`/app/campaigns/${copy.campaign_id}`); },
    });
    const handleMenuAction = (action) => {
        switch (action) {
            case 'rename':
            case 'duplicate':
                openDialog(action, campaign);
                break;
            case 'launch': launchMutation.mutate(id); break;
            case 'pause': pauseMutation.mutate(id); break;
            case 'resume': resumeMutation.mutate(id); break;
            case 'delete':
                if (window.confirm(`Delete "${campaign.campaign_name}"? This removes the campaign and its data.`)) {
                    deleteMutation.mutate(id);
                }
                break;
            default: break;
        }
    };

    // Decoupled loading states for better UX
    // We only block the whole page if basic campaign info is missing
    const isInitialLoading = campaignLoading;

    // Transform analytics data for components
    const barData = analyticsData?.bar_data || [];
    const sequences = analyticsData?.sequences?.map(seq => ({
        step: seq.step,
        type: seq.type,
        sent: seq.sent,
        openedCount: seq.opened_count ?? Math.round((seq.sent || 0) * ((seq.open_rate || 0) / 100)),
        repliedCount: seq.replied_count ?? Math.round((seq.sent || 0) * ((seq.reply_rate || 0) / 100)),
        bouncedCount: seq.bounced_count ?? Math.round((seq.sent || 0) * ((seq.bounce_rate || 0) / 100)),
        openRate: seq.open_rate,
        replyRate: seq.reply_rate,
        bounceRate: seq.bounce_rate,
        positiveCount: seq.positive_replied_count || 0,
        oooCount: seq.ooo_count || 0,
        senderBounceRate: seq.sender_bounced_count || 0,
        unsubRate: 0
    })) || [];

    const leadStats = analyticsData?.lead_stats || {
        total: campaign?.metrics?.prospect_count || 0,
        data: [
            { name: 'Active', value: 0 },
            { name: 'Completed', value: 0 }
        ]
    };

    // Show fullscreen loading until basic campaign data is fetched
    if (isInitialLoading) return <Loading text="Loading campaign..." size="lg" fullScreen />;
    if (campaignError && !campaign && !isNotFound(campaignError)) {
        return <LoadError error={campaignError} onRetry={refetchCampaign} title="Couldn't load this campaign" />;
    }
    if (!campaign) return <div className="p-10 text-center text-slate-500">Campaign not found</div>;

    // Dynamic prospect count for tab label
    const prospectCount = campaign?.prospect_count || analyticsData?.lead_stats?.total || 0;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Analytics':
                return <AnalyticsTab
                    metrics={analyticsData?.metrics || campaign?.metrics}
                    barData={barData}
                    sequences={sequences}
                    leadStats={leadStats}
                    campaign={campaign}
                    totalMessagesSent={analyticsData?.total_messages_sent || 0}
                    // Show spinner if loading OR if data missing (and no error)
                    isLoading={analyticsLoading || (!analyticsData && !analyticsError)}
                    chartFilter={chartFilter}
                    setChartFilter={setChartFilter}
                    onTabChange={setActiveTab}
                />;

            case 'Prospects':
                return <LeadListTab campaignId={id} />;
            case 'Subsequence':
                return <SubsequenceTab campaignId={id} />;
            case 'Schedule':
                return <ScheduleTab campaignId={id} />;
            case 'Trigger logs':
                return <TriggerLogsTab campaignId={id} />;
            case 'Sending Accounts':
                return <SendingInboxesTab campaign={campaign} />;
            case 'Inbox':
                return <InboxTab campaignId={id} onTabChange={setActiveTab} />;
            case 'Settings':
                return <SettingsTab key={`${campaign.campaign_id}-${campaign.row_version}`} campaign={campaign} />;
            default:
                return <div>Tab not implemented</div>;
        }
    };

    // Build tabs dynamically with prospect count
    const tabs = ['Analytics', 'Inbox', 'Prospects', 'Subsequence', 'Schedule', 'Trigger logs', 'Sending Accounts', 'Settings'];

    return (
        <PageTransition>
            <motion.div variants={containerVariants} className="min-h-screen bg-slate-50 pb-20 font-inter">
                {/* Header - Redesigned */}
                <motion.header variants={itemVariants} className="bg-white border-b border-slate-200 sticky top-0 z-40 -mx-8 -mt-8 px-8">
                    <div>
                        {/* Top Row */}
                        <div className="py-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => navigate('/app/campaigns')}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-all"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>

                                <div>
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-xl font-bold text-slate-900">{campaign.campaign_name}</h1>
                                        <StatusBadge status={campaign.status} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Actions Area */}
                                {(campaign.status === 'ACTIVE' || campaign.status === 'PAUSED') && (
                                    <button
                                        onClick={() => {
                                            if (campaign.status === 'ACTIVE') {
                                                pauseMutation.mutate(id);
                                            } else {
                                                resumeMutation.mutate(id);
                                            }
                                        }}
                                        disabled={pauseMutation.isPending || resumeMutation.isPending}
                                        className="btn btn-secondary flex items-center gap-1.5"
                                    >
                                        {(pauseMutation.isPending || resumeMutation.isPending) ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : campaign.status === 'ACTIVE' ? (
                                            <Pause className="w-4 h-4" />
                                        ) : (
                                            <Play className="w-4 h-4" />
                                        )}
                                        {campaign.status === 'ACTIVE' ? 'Pause Campaign' : 'Resume Campaign'}
                                    </button>
                                )}
                                {campaign.status === 'ACTIVE' && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm("⚠️ Force Send Now?\n\nThis will bypass all schedules/office hours and immediately send the next email to all queued prospects.\n\nAre you sure?")) {
                                                sendNowMutation.mutate(id);
                                            }
                                        }}
                                        disabled={sendNowMutation.isPending}
                                        className="btn btn-secondary text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                        {sendNowMutation.isPending ? (sendProgress || 'Sending...') : '⚡ Send Now'}
                                    </button>
                                )}
                                <CampaignActionsMenu
                                    campaign={campaign}
                                    onAction={handleMenuAction}
                                    disabled={launchMutation.isPending || deleteMutation.isPending}
                                />
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <nav className="flex items-center gap-1 pt-2 pb-1">
                            {tabs.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`
                                        px-4 py-2 text-sm font-medium rounded-md transition-all
                                        ${activeTab === tab
                                            ? 'bg-slate-100 text-slate-900'
                                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                        }
                                    `}
                                >
                                    {tab === 'Prospects' ? `Prospects (${prospectCount})` : tab}
                                </button>
                            ))}
                        </nav>
                    </div>
                </motion.header>

                {dialogs}

                {banner && (
                    <div role={banner.tone === 'error' ? 'alert' : 'status'} className={`mt-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm ${banner.tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                        <span>{banner.text}</span>
                        <button onClick={() => setBanner(null)} aria-label="Dismiss" className="opacity-70 hover:opacity-100">x</button>
                    </div>
                )}

                {campaign.status === 'PAUSED' && campaign.paused_reason && (
                    <div className={`mt-4 px-4 py-3 rounded-xl border text-sm ${campaign.auto_paused ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                        <span className="font-semibold">{campaign.auto_paused ? 'Paused automatically to protect your sending reputation. ' : 'Paused. '}</span>
                        {campaign.paused_reason.replace(/^Paused automatically: /, '')}
                        {campaign.auto_paused && <span className="block text-xs mt-1 opacity-80">Fix the cause (for example remove bad addresses), then resume. After resuming, the check counts only new sends.</span>}
                    </div>
                )}

                {/* Main Content */}
                <AnimatePresence mode="wait">
                    <motion.main
                        key={activeTab}
                        variants={itemVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="py-6"
                    >
                        {renderTabContent()}
                    </motion.main>
                </AnimatePresence>
            </motion.div>
        </PageTransition>
    );
}

