import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Plus,
    Search,
    Mail
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { campaignApi } from '../api/campaigns';
import { campaignDraftsApi } from '../api/campaignDrafts';
import Loading from '../components/common/Loading';
import PageTransition, { containerVariants, itemVariants } from '../components/layout/PageTransition';
import CampaignsTable from '../components/campaigns/CampaignsTable';
import { Input, FormGroup } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ColumnPicker } from '../components/campaigns/CampaignsTable';
import { ALL_COLUMNS, loadVisibleCols, LS_KEY } from '../components/campaigns/campaignColumns';
import BulkActionBar from '../components/campaigns/BulkActionBar';
import { AnimatePresence } from 'framer-motion';
import { Settings2 } from 'lucide-react';

const Campaigns = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [performingActionId, setPerformingActionId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const debounceRef = useRef(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [visibleCols, setVisibleCols] = useState(loadVisibleCols);
    const [pickerOpen, setPickerOpen] = useState(false);

    // Debounce: update debouncedSearch 300ms after user stops typing
    useEffect(() => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [searchTerm]);

    function handleColChange(next) {
        setVisibleCols(next);
        try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch (_) { }
    }

    const { data, isLoading, isFetching, error } = useQuery({
        queryKey: ['campaigns', debouncedSearch],
        queryFn: () => campaignApi.list({
            campaign_name: debouncedSearch || undefined,
        }),
        staleTime: 0,
        refetchOnMount: 'always',
        placeholderData: (prev) => prev,  // keep showing previous results while new fetch is in-flight
    });

    const onMutationSettled = () => {
        // queryClient.invalidateQueries(['campaigns']);
        queryClient.invalidateQueries({ queryKey: ['campaigns'], exact: false });
        setPerformingActionId(null);
    };

    // Mutations
    const launchMutation = useMutation({
        mutationFn: (id) => campaignApi.launch(id),
        onSuccess: onMutationSettled,
        onError: () => setPerformingActionId(null)
    });

    const pauseMutation = useMutation({
        mutationFn: (id) => campaignApi.pause(id),
        onSuccess: onMutationSettled,
        onError: () => setPerformingActionId(null)
    });

    const resumeMutation = useMutation({
        mutationFn: (id) => campaignApi.resume(id),
        onSuccess: onMutationSettled,
        onError: () => setPerformingActionId(null)
    });

    // const deleteMutation = useMutation({
    //     mutationFn: (id) => campaignApi.delete(id),
    //     onSuccess: () => {
    //         // Also clear any associated campaign drafts so stale data doesn't persist
    //         campaignDraftsApi.clearAllDrafts().catch(err =>
    //             console.warn('[DRAFT] Failed to clear drafts after campaign delete:', err)
    //         );
    //         onMutationSettled();
    //     },
    //     onError: () => setPerformingActionId(null)
    // });
    const deleteMutation = useMutation({
        mutationFn: (id) => campaignApi.delete(id),

        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['campaigns'] });

            const previousData = queryClient.getQueryData(['campaigns', searchTerm]);

            queryClient.setQueryData(['campaigns', debouncedSearch], old => {
                if (!old) return old;
                return {
                    ...old,
                    items: old.items.filter(c => c.campaign_id !== id)
                };
            });

            return { previousData };
        },

        onError: (err, id, context) => {
            queryClient.setQueryData(['campaigns', debouncedSearch], context.previousData);
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            setPerformingActionId(null);
        }
    });

    const campaigns = data?.items || [];

    // Calculate stats
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;
    const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
    const avgOpenRate = totalSent > 0
        ? (campaigns.reduce((acc, c) => acc + (c.opened_count || 0), 0) / totalSent * 100).toFixed(1)
        : '0.0';

    const handleAction = (action, campaign, e) => {
        e.stopPropagation();
        if (performingActionId) return; // Prevent double clicks

        switch (action) {
            case 'launch':
                setPerformingActionId(campaign.campaign_id);
                launchMutation.mutate(campaign.campaign_id);
                break;
            case 'pause':
                setPerformingActionId(campaign.campaign_id);
                pauseMutation.mutate(campaign.campaign_id);
                break;
            case 'resume':
                setPerformingActionId(campaign.campaign_id);
                resumeMutation.mutate(campaign.campaign_id);
                break;
            case 'delete':
                if (confirm(`Delete "${campaign.campaign_name}"?`)) {
                    setPerformingActionId(campaign.campaign_id);
                    deleteMutation.mutate(campaign.campaign_id);
                }
                break;
            case 'view': navigate(`/app/campaigns/${campaign.campaign_id}`); break;
        }
    };

    const handleToggleSelect = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBulkAction = async (action) => {
        if (!confirm(`Are you sure you want to ${action} ${selectedIds.length} campaigns?`)) return;

        // Optimistic UI updates or parallel requests could be done here.
        // For now, we'll just loop and execute sequentially to be safe.
        // ideally backend supports bulk ops.

        for (const id of selectedIds) {
            if (action === 'pause') pauseMutation.mutate(id);
            if (action === 'resume') resumeMutation.mutate(id);
            if (action === 'delete') deleteMutation.mutate(id);
        }
        setSelectedIds([]);
    };

    // Only show full-screen loader on the very first load (no data yet)
    if (isLoading && !data) return <Loading text="Loading campaigns..." size="lg" fullScreen/>;
    if (error) return <div className="p-10 text-center text-red-500">Failed to load: {error.message}</div>;

    return (
        <PageTransition>
            <motion.div variants={containerVariants} className="flex flex-col h-full">
                {/* 1. Header Section - Sticky */}
                <div className="sticky top-14 z-20 bg-[#F7F9FC] pt-1 pb-4 -mx-7 px-7 mb-2">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="flex flex-col gap-2">
                                <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Campaigns</h1>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button onClick={() => navigate('/app/campaigns/new?fresh=true')} className="text-white w-full sm:w-auto font-semibold shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create New Campaign
                                    </Button>

                                    <div className="relative">
                                        <button
                                            id="column-picker-btn"
                                            onClick={() => setPickerOpen(p => !p)}
                                            className="flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
                                            title="Column Settings"
                                        >
                                            <Settings2 className="w-4 h-4" />
                                        </button>
                                        <AnimatePresence>
                                            {pickerOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="relative z-[70]"
                                                >
                                                    <ColumnPicker
                                                        visible={visibleCols}
                                                        onChange={handleColChange}
                                                        onClose={() => setPickerOpen(false)}
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Campaign List Section */}
                <motion.div variants={itemVariants} className="flex-1 min-h-0 pt-2 pb-0">
                    {/* Campaigns List */}
                    <CampaignsTable
                        campaigns={campaigns}
                        isLoading={isLoading}
                        onAction={handleAction}
                        performingActionId={performingActionId}
                        selectedIds={selectedIds}
                        onToggleSelect={handleToggleSelect}
                        visibleCols={visibleCols}
                        onToggleAll={() => {
                            if (selectedIds.length === campaigns.length) setSelectedIds([]);
                            else setSelectedIds(campaigns.map(c => c.campaign_id));
                        }}
                    />

                </motion.div>

                <BulkActionBar
                    selectedCount={selectedIds.length}
                    onClear={() => setSelectedIds([])}
                    onAction={handleBulkAction}
                />
            </motion.div>
        </PageTransition >
    );
}

export default Campaigns;
