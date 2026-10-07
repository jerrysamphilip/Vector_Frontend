import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
    ArrowLeft, Pause, Play, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { campaignApi } from '../api/campaigns';
import StatusBadge from '../components/campaigns/StatusBadge';
import Loading from '../components/common/Loading';
import PageTransition, { containerVariants, itemVariants } from '../components/layout/PageTransition';

// Tab Components
import AnalyticsTab from '../components/campaigns/tabs/AnalyticsTab';
import LeadListTab from '../components/campaigns/tabs/LeadListTab';
import SubsequenceTab from '../components/campaigns/tabs/SubsequenceTab';
import TriggerLogsTab from '../components/campaigns/tabs/TriggerLogsTab';
import ScheduleTab from '../components/campaigns/tabs/ScheduleTab';
import SendingInboxesTab from '../components/campaigns/tabs/SendingInboxesTab';
import InboxTab from '../components/campaigns/tabs/InboxTab';

export default function CampaignDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('Analytics');
    const [chartFilter, setChartFilter] = useState('Daily');

    // Mappings for the filter to number of days (used by AnalyticsTab slice logic now)
    const daysMap = { 'Daily': 7, 'Weekly': 30, 'Monthly': 180 };
    const selectedDays = daysMap[chartFilter] || 7;
    // Queries
    // Fetch all in parallel for speed
    const { data: campaign, isLoading: campaignLoading } = useQuery({
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
    const { data: scheduleData, isLoading: scheduleLoading, refetch: refetchSchedule } = useQuery({
        queryKey: ['campaign-schedule', id],
        queryFn: () => campaignApi.getSchedule(id),
        staleTime: 0,
        refetchOnWindowFocus: false,
    });

    // Send Now Mutation
    const sendNowMutation = useMutation({
        mutationFn: (id) => campaignApi.sendNow(id),
        onSuccess: (data) => {
            alert(`✅ Success!\n\nSent: ${data.sent}\nFailed: ${data.failed}\n\nCheck 'Schedule' tab for updates.`);
            queryClient.invalidateQueries(['campaign', id]);
            queryClient.invalidateQueries(['campaign-analytics', id]);
            // Force refresh schedule
            refetchSchedule();
        },
        onError: (error) => {
            alert(`❌ Error sending emails: ${error.response?.data?.detail || error.message}`);
        }
    });

    // Pause / Resume Mutations
    const pauseMutation = useMutation({
        mutationFn: (id) => campaignApi.pause(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['campaign', id]);
            queryClient.invalidateQueries({ queryKey: ['campaigns'], exact: false });
        },
        onError: (error) => {
            alert(`❌ Error pausing campaign: ${error.response?.data?.detail || error.message}`);
        }
    });

    const resumeMutation = useMutation({
        mutationFn: (id) => campaignApi.resume(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['campaign', id]);
            queryClient.invalidateQueries({ queryKey: ['campaigns'], exact: false });
        },
        onError: (error) => {
            alert(`❌ Error resuming campaign: ${error.response?.data?.detail || error.message}`);
        }
    });

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
            default:
                return <div>Tab not implemented</div>;
        }
    };

    // Build tabs dynamically with prospect count
    const tabs = ['Analytics', 'Inbox', 'Prospects', 'Subsequence', 'Schedule', 'Trigger logs', 'Sending Accounts'];

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
                                        {sendNowMutation.isPending ? 'Sending...' : '⚡ Send Now'}
                                    </button>
                                )}
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

