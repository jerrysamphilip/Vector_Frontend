import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inboxesApi } from '../../../api/inboxes';
import deliverabilityApi from '../../../api/deliverability';
import { DEFAULT_OVERVIEW, POOL_STYLES, errorText } from './shared';

// State, queries and actions of the Email Accounts page: inbox list + warm-up overview, the selected
// inbox's warm-up detail and settings form, add/edit (ConnectionWizard), delete, run warm-up, alert
// preferences and the Microsoft 365 OAuth connect redirect.

export const INBOX_FILTERS = [
    { key: 'all',      label: 'All' },
    { key: 'healthy',  label: 'Healthy' },
    { key: 'issues',   label: 'Issues' },
    { key: 'enabled',  label: 'Warmup On' },
    { key: 'disabled', label: 'Warmup Off' },
];

export function useEmailAccounts() {
    const queryClient = useQueryClient();
    const [isModalOpen,   setIsModalOpen]   = useState(false);
    const [isEditMode,    setIsEditMode]    = useState(false);
    const [selectedInboxId, setSelectedInboxId] = useState(null);
    const [selectedInbox, setSelectedInbox] = useState(null);
    const [verificationData, setVerificationData] = useState(null);
    const [inboxToDelete, setInboxToDelete] = useState(null);
    const [formError,     setFormError]     = useState('');
    const [isAlertPrefsOpen, setIsAlertPrefsOpen] = useState(false);
    const [searchTerm,    setSearchTerm]    = useState('');
    const [filterKey,     setFilterKey]     = useState('all');
    const [detailTab,     setDetailTab]     = useState('Overview');
    const [saveSuccess,   setSaveSuccess]   = useState(false);
    const saveTimer = useRef(null);
    // Result of the Microsoft 365 sign-in redirect (?ms365=connected|error&message=…)
    const [ms365Notice, setMs365Notice] = useState(() => {
        const q = new URLSearchParams(window.location.search);
        if (!q.get('ms365')) return null;
        return q.get('ms365') === 'connected'
            ? { ok: true, text: 'Microsoft 365 mailbox connected. Replies will sync within a few minutes.' }
            : { ok: false, text: q.get('message') || 'Microsoft 365 sign-in failed.' };
    });

    const [drawerForm, setDrawerForm] = useState({
        warmup_enabled: false, warmup_auto_adjust: true, warmup_randomize: true,
        warmup_reply_rate_target: 35, warmup_max_target: '',
        warmup_identifier: '', delay_between_emails: 60, daily_limit: 500,
        max_emails_per_day: '',
    });

    // ── queries ────────────────────────────────────────────────────────────────
    const { data: inboxes = [], isLoading, error } = useQuery({ queryKey: ['inboxes'], queryFn: inboxesApi.list });
    const { data: overview = DEFAULT_OVERVIEW } = useQuery({ queryKey: ['warmup-overview'], queryFn: inboxesApi.getWarmupOverview });
    const { data: alertPreferences, isLoading: alertPrefsLoading } = useQuery({
        queryKey: ['alert-preferences'],
        queryFn: () => deliverabilityApi.getAlertPreferences(),
    });
    const { data: warmupDetail, isFetching: detailLoading } = useQuery({
        queryKey: ['inbox-warmup', selectedInboxId],
        queryFn: () => inboxesApi.getWarmupDetail(selectedInboxId),
        enabled: Boolean(selectedInboxId),
    });

    useEffect(() => {
        const inbox = warmupDetail?.inbox;
        if (!inbox) return;
        setDrawerForm({
            warmup_enabled:            Boolean(inbox.warmup_enabled),
            warmup_auto_adjust:        Boolean(inbox.warmup_auto_adjust),
            warmup_randomize:          Boolean(inbox.warmup_randomize),
            warmup_reply_rate_target:  inbox.warmup_reply_rate_target ?? 35,
            warmup_max_target:         inbox.warmup_max_target ?? '',
            warmup_identifier:         inbox.warmup_identifier ?? '',
            delay_between_emails:      inbox.delay_between_emails ?? 60,
            daily_limit:               inbox.daily_limit ?? 500,
            max_emails_per_day:        inbox.max_emails_per_day ?? '',
        });
        // Keyed on the saved values: a refetch that returns the same settings keeps unsaved edits
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        warmupDetail?.inbox?.inbox_id,
        warmupDetail?.inbox?.warmup_enabled,
        warmupDetail?.inbox?.warmup_auto_adjust,
        warmupDetail?.inbox?.warmup_randomize,
        warmupDetail?.inbox?.warmup_reply_rate_target,
        warmupDetail?.inbox?.warmup_max_target,
        warmupDetail?.inbox?.warmup_identifier,
        warmupDetail?.inbox?.delay_between_emails,
        warmupDetail?.inbox?.daily_limit,
        warmupDetail?.inbox?.max_emails_per_day,
    ]);

    // ── mutations ──────────────────────────────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: inboxesApi.create,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['inboxes'] });
            queryClient.invalidateQueries({ queryKey: ['warmup-overview'] });
            setFormError(''); setIsEditMode(false); setSelectedInbox(null);
            setIsModalOpen(false);
            if (data.domain_verification?.dns_records?.length > 0) setVerificationData(data.domain_verification);
        },
        onError: (err) => setFormError(errorText(err, 'Failed to add inbox')),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => inboxesApi.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['inboxes'] });
            queryClient.invalidateQueries({ queryKey: ['warmup-overview'] });
            if (variables?.id) queryClient.invalidateQueries({ queryKey: ['inbox-warmup', variables.id] });
            setFormError('');
            setSaveSuccess(true);
            clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => setSaveSuccess(false), 2500);
        },
        onError: (err) => setFormError(errorText(err, 'Failed to update inbox')),
    });

    const deleteMutation = useMutation({
        mutationFn: inboxesApi.delete,
        onSuccess: (_, deletedId) => {
            if (selectedInboxId === deletedId) { setSelectedInboxId(null); setSelectedInbox(null); }
            queryClient.invalidateQueries({ queryKey: ['inboxes'] });
            queryClient.invalidateQueries({ queryKey: ['warmup-overview'] });
            setInboxToDelete(null);
        },
    });

    const runWarmupMutation = useMutation({
        mutationFn: inboxesApi.runWarmupCycle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inboxes'] });
            queryClient.invalidateQueries({ queryKey: ['warmup-overview'] });
            if (selectedInboxId) queryClient.invalidateQueries({ queryKey: ['inbox-warmup', selectedInboxId] });
        },
    });

    const saveAlertPrefsMutation = useMutation({
        mutationFn: (preferences) => deliverabilityApi.updateAlertPreferences(preferences),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alert-preferences'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-alerts-v2'] });
            setIsAlertPrefsOpen(false);
        },
        onError: (err) => setFormError(err.response?.data?.detail || 'Failed to update alert preferences'),
    });

    // ── derived state ──────────────────────────────────────────────────────────
    const filteredInboxes = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return inboxes.filter(inbox => {
            if (q && !inbox.email_address.toLowerCase().includes(q) && !(inbox.provider||'').toLowerCase().includes(q)) return false;
            if (filterKey === 'issues')   return Boolean(inbox.warmup_issue_code);
            if (filterKey === 'healthy')  return !inbox.warmup_issue_code;
            if (filterKey === 'enabled')  return Boolean(inbox.warmup_enabled);
            if (filterKey === 'disabled') return !inbox.warmup_enabled;
            return true;
        });
    }, [inboxes, searchTerm, filterKey]);

    const selectedInboxSummary = warmupDetail?.inbox;
    const todayMetric = warmupDetail?.today_metric;
    const events  = warmupDetail?.events  || [];
    const history = warmupDetail?.history || [];

    const handleSaveSettings = () => {
        if (!selectedInboxSummary) return;
        updateMutation.mutate({
            id: selectedInboxSummary.inbox_id,
            data: {
                warmup_enabled:           drawerForm.warmup_enabled,
                warmup_auto_adjust:       drawerForm.warmup_auto_adjust,
                warmup_randomize:         drawerForm.warmup_randomize,
                warmup_reply_rate_target: drawerForm.warmup_reply_rate_target,
                warmup_max_target:        drawerForm.warmup_max_target === '' ? null : Number(drawerForm.warmup_max_target),
                warmup_identifier:        drawerForm.warmup_identifier || null,
                delay_between_emails:     drawerForm.delay_between_emails,
                daily_limit:              drawerForm.daily_limit,
                max_emails_per_day:       drawerForm.max_emails_per_day === '' ? null : Number(drawerForm.max_emails_per_day),
            },
        });
    };

    const connectMs365 = async (inbox) => {
        try {
            const { authorize_url } = await inboxesApi.startMicrosoftOAuth(inbox.inbox_id);
            window.location.href = authorize_url;
        } catch (err) {
            setMs365Notice({ ok: false, text: err?.response?.data?.detail || 'Could not start Microsoft 365 sign-in.' });
        }
    };

    const poolStyle = POOL_STYLES[overview.current_pool] || POOL_STYLES.FOUNDATION;
    const repColor  = overview.average_reputation >= 92 ? '#0046FF'
                    : overview.average_reputation >= 75 ? '#FF9013' : '#ef4444';

    /** Open the ConnectionWizard to add a mailbox (inbox null) or edit one. */
    const openConnectionWizard = (inbox = null) => {
        setFormError('');
        setSelectedInbox(inbox);
        setIsEditMode(Boolean(inbox));
        setIsModalOpen(true);
    };

    return {
        isModalOpen, setIsModalOpen, isEditMode, setIsEditMode,
        selectedInboxId, setSelectedInboxId, selectedInbox, setSelectedInbox,
        verificationData, setVerificationData, inboxToDelete, setInboxToDelete,
        formError, setFormError, isAlertPrefsOpen, setIsAlertPrefsOpen,
        searchTerm, setSearchTerm, filterKey, setFilterKey, detailTab, setDetailTab,
        saveSuccess, ms365Notice, setMs365Notice, drawerForm, setDrawerForm,
        inboxes, isLoading, error, overview, alertPreferences, alertPrefsLoading, detailLoading,
        createMutation, updateMutation, deleteMutation, runWarmupMutation, saveAlertPrefsMutation,
        filteredInboxes, selectedInboxSummary, todayMetric, events, history,
        handleSaveSettings, connectMs365, openConnectionWizard, poolStyle, repColor,
    };
}
