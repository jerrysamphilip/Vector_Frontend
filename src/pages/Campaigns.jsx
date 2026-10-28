import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { campaignApi } from '../api/campaigns';
import { reportStaleVersion } from '../lib/staleVersion';
import Loading from '../components/common/Loading';
import PageTransition, { containerVariants, itemVariants } from '../components/layout/PageTransition';
import CampaignsTable from '../components/campaigns/CampaignsTable';
import { Button } from '../components/ui/Button';
import Pagination from '../components/ui/Pagination';
import LoadError from '../components/ui/LoadError';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { errorText } from '../lib/apiErrors';
import { ColumnPicker } from '../components/campaigns/CampaignsTable';
import { loadVisibleCols, LS_KEY } from '../components/campaigns/campaignColumns';
import BulkActionBar from '../components/campaigns/BulkActionBar';
import { useCampaignDialogs } from '../components/campaigns/actions/useCampaignDialogs';
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
    const [actionError, setActionError] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const { openDialog, dialogs } = useCampaignDialogs({
        onOpenCopy: (copy) => navigate(`/app/campaigns/${copy.campaign_id}`),
    });
    const showErr = (err) => { setPerformingActionId(null); setActionError(errorText(err, 'Action failed')); };
    const confirm = useConfirm();

    // Debounce: update debouncedSearch 300ms after user stops typing
    useEffect(() => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1); // a new search starts on page 1
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [searchTerm]);

    function handleColChange(next) {
        setVisibleCols(next);
        try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch (_) { /* storage unavailable */ }
    }

    const listKey = ['campaigns', debouncedSearch, page, pageSize];
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: listKey,
        queryFn: () => campaignApi.list({
            campaign_name: debouncedSearch || undefined,
            page,
            page_size: pageSize,
        }),
        staleTime: 0,
        refetchOnMount: 'always',
        placeholderData: (prev) => prev,  // keep showing previous results while new fetch is in-flight
    });

    const onMutationSettled = () => {
        // queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        queryClient.invalidateQueries({ queryKey: ['campaigns'], exact: false });
        setPerformingActionId(null);
    };

    // Mutations: state changes send the row_version the list shows (T-3); a campaign changed
    // meanwhile gets 409 STALE_VERSION
    const launchMutation = useMutation({
        mutationFn: (c) => campaignApi.launch(c.campaign_id, c.row_version),
        onSuccess: onMutationSettled,
        onError: showErr
    });

    const pauseMutation = useMutation({
        mutationFn: (c) => campaignApi.pause(c.campaign_id, null, c.row_version),
        onSuccess: onMutationSettled,
        onError: showErr
    });

    const resumeMutation = useMutation({
        mutationFn: (c) => campaignApi.resume(c.campaign_id, c.row_version),
        onSuccess: onMutationSettled,
        onError: showErr
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

            const previousData = queryClient.getQueryData(listKey);

            queryClient.setQueryData(listKey, old => {
                if (!old) return old;
                return {
                    ...old,
                    items: old.items.filter(c => c.campaign_id !== id)
                };
            });

            return { previousData };
        },

        onError: (err, id, context) => {
            showErr(err);
            if (context) queryClient.setQueryData(listKey, context.previousData);
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            setPerformingActionId(null);
        }
    });

    const campaigns = data?.items || [];
    const total = data?.total ?? 0;

    // Deleting the last row of the last page: step back to the page that still exists
    useEffect(() => {
        const lastPage = Math.max(1, data?.total_pages || Math.ceil(total / pageSize) || 1);
        if (data && page > lastPage) setPage(lastPage);
    }, [data, total, page, pageSize]);


    const handleAction = (action, campaign, e) => {
        e.stopPropagation();
        if (performingActionId) return; // Prevent double clicks

        switch (action) {
            case 'launch':
                setPerformingActionId(campaign.campaign_id);
                launchMutation.mutate(campaign);
                break;
            case 'pause':
                setPerformingActionId(campaign.campaign_id);
                pauseMutation.mutate(campaign);
                break;
            case 'resume':
                setPerformingActionId(campaign.campaign_id);
                resumeMutation.mutate(campaign);
                break;
            case 'delete':
                confirm({ title: `Delete "${campaign.campaign_name}"?`, message: 'This removes the campaign and its data.', confirmLabel: 'Delete', danger: true })
                    .then((ok) => {
                        if (!ok) return;
                        setPerformingActionId(campaign.campaign_id);
                        deleteMutation.mutate(campaign.campaign_id);
                    });
                break;
            case 'rename':
            case 'duplicate':
                openDialog(action, campaign);
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
        const ok = await confirm({
            title: `${action[0].toUpperCase()}${action.slice(1)} ${selectedIds.length} campaign${selectedIds.length !== 1 ? 's' : ''}?`,
            message: action === 'delete' ? 'This removes the selected campaigns and their data.' : undefined,
            confirmLabel: `${action[0].toUpperCase()}${action.slice(1)}`,
            danger: action === 'delete',
        });
        if (!ok) return;

        // Optimistic UI updates or parallel requests could be done here.
        // For now, we'll just loop and execute sequentially to be safe.
        // ideally backend supports bulk ops.

        // One useMutation observer only tracks its latest mutate() call, so a loop of mutate() sent a single
        // request; call the API directly for every selected campaign.
        // Pause / resume send each campaign's row_version as listed (T-3)
        const version = id => campaigns.find(c => c.campaign_id === id)?.row_version;
        const fn = {
            pause: id => campaignApi.pause(id, null, version(id)),
            resume: id => campaignApi.resume(id, version(id)),
            delete: campaignApi.delete,
        }[action];
        if (!fn) return;
        const results = await Promise.allSettled(selectedIds.map(id => fn(id)));
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length) showErr(failed[0].reason);
        failed.some(r => reportStaleVersion(r.reason)); // these calls bypass the MutationCache
        queryClient.invalidateQueries({ queryKey: ['campaigns'], exact: false });
        setSelectedIds([]);
    };

    // Only show full-screen loader on the very first load (no data yet)
    if (isLoading && !data) return <Loading text="Loading campaigns..." size="lg" fullScreen/>;
    if (error && !data) return <LoadError error={error} onRetry={refetch} title="Couldn't load campaigns" />;

    return (
        <PageTransition>
            <motion.div variants={containerVariants} className="flex flex-col h-full">
                {/* 1. Header Section - Sticky */}
                <div className="sticky top-14 z-20 bg-[#F7F9FC] pt-1 pb-4 -mx-4 px-4 sm:-mx-5 sm:px-5 lg:-mx-7 lg:px-7 mb-2">
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

                {actionError && (
                    <div role="alert" className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                        <span>{typeof actionError === 'string' ? actionError : 'Action failed'}</span>
                        <button onClick={() => setActionError('')} aria-label="Dismiss" className="text-red-500 hover:text-red-700">x</button>
                    </div>
                )}
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
                        searchTerm={debouncedSearch.trim()}
                        onToggleAll={() => {
                            if (selectedIds.length === campaigns.length) setSelectedIds([]);
                            else setSelectedIds(campaigns.map(c => c.campaign_id));
                        }}
                    />
                    {total > 0 && (
                        <Pagination
                            page={page}
                            pageSize={pageSize}
                            total={total}
                            onPageChange={(p) => { setPage(p); setSelectedIds([]); }}
                            onPageSizeChange={(size) => { setPageSize(size); setPage(1); setSelectedIds([]); }}
                        />
                    )}
                </motion.div>

                {dialogs}

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
