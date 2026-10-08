import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Activity, AlertTriangle, CheckCircle2, Flame, Loader2,
    Mail, Pencil, Plus, RefreshCcw, Search, ShieldCheck,
    Sparkles, Trash2, X, Zap, TrendingUp, Send, MailOpen, BellRing,
    MessageSquare, ArrowRight, Settings2, Clock, KeyRound,
} from 'lucide-react';
import PageTransition from '../components/layout/PageTransition';
import ConnectionWizard from '../components/inbox/ConnectionWizard';
import AlertPreferencesModal from '../components/inbox/AlertPreferencesModal';
import Loading from '../components/common/Loading';
import { apiClient as api } from '../api/http';
import deliverabilityApi from '../api/deliverability';
import KpiTile from '../components/ui/KpiTile';

// ─── API helpers ──────────────────────────────────────────────────────────────
const getInboxes       = async ()     => (await api.get('/inboxes')).data;
const getWarmupOverview = async ()    => (await api.get('/inboxes/warmup/overview')).data;
const getWarmupDetail  = async (id)   => (await api.get(`/inboxes/${id}/warmup`)).data;
const createInbox      = async (d)    => (await api.post('/inboxes', d)).data;
const updateInbox      = async ({id, data}) => (await api.put(`/inboxes/${id}`, data)).data;
const deleteInbox      = async (id)   => api.delete(`/inboxes/${id}`);
const testSmtp         = async (id)   => (await api.post(`/inboxes/${id}/test-smtp`)).data;
const testImap         = async (id)   => (await api.get(`/inboxes/${id}/test-imap`)).data;
const runWarmupCycle   = async ()     => (await api.post('/inboxes/warmup/run')).data;
// Microsoft 365 blocks password sign-in; connect with OAuth instead (BR-DF-05)
const startMs365       = async (id)   => (await api.post(`/inboxes/${id}/oauth/microsoft/start`)).data;
const getAlertPreferences = async ()  => await deliverabilityApi.getAlertPreferences();
const saveAlertPreferences = async (preferences) => await deliverabilityApi.updateAlertPreferences(preferences);

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_OVERVIEW = {
    total_accounts: 0, warmup_enabled: 0, accounts_with_issues: 0,
    average_reputation: 0, current_pool: 'FOUNDATION', pool_growth_score: 0,
    planned_today: 0, warmup_sent_today: 0, warmup_replied_today: 0, saved_today: 0,
};

const POOL_STYLES = {
    ULTRA_PREMIUM: { bg: '#ecfdf5', border: '#6ee7b7', color: '#065f46', label: 'Ultra Premium' },
    PREMIUM:       { bg: '#eff3ff', border: '#c7d2fe', color: '#0046FF', label: 'Premium' },
    GROWTH:        { bg: '#e0f7fa', border: '#67e8f9', color: '#0e7490', label: 'Growth' },
    FOUNDATION:    { bg: '#f8fafc', border: '#cbd5e1', color: '#64748b', label: 'Foundation' },
};

const PROVIDER_COLORS = {
    gmail:     { bg: '#fce8e8', color: '#d93025', initial: 'G' },
    google:    { bg: '#fce8e8', color: '#d93025', initial: 'G' },
    outlook:   { bg: '#e8f0fe', color: '#0072c6', initial: 'O' },
    sendgrid:  { bg: '#e8f5e9', color: '#1a73e8', initial: 'S' },
    ses:       { bg: '#fff3e0', color: '#f57c00', initial: 'A' },
    smtp:      { bg: '#eff3ff', border: '#c7d2fe', color: '#0046FF', initial: '#' },
};

function providerStyle(provider) {
    return PROVIDER_COLORS[(provider || '').toLowerCase()] || PROVIDER_COLORS.smtp;
}

// ─── Tiny sub-components ──────────────────────────────────────────────────────

function ReputationRing({ value, size = 56 }) {
    const pct = Math.min(Math.max(Number(value || 0), 0), 100);
    const r   = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    const color = pct >= 92 ? '#0046FF' : pct >= 75 ? '#FF9013' : '#ef4444';
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="5"/>
            <circle cx={size/2} cy={size/2} r={r}
                fill="none" stroke={color} strokeWidth="5"
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                transform={`rotate(-90 ${size/2} ${size/2})`}
                style={{ transition: 'stroke-dasharray 0.6s ease' }}/>
            <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: size * 0.21, fontWeight: 700, fill: color }}>
                {pct}
            </text>
        </svg>
    );
}

function Toggle({ checked, onChange, disabled = false }) {
    return (
        <button type="button" onClick={onChange} disabled={disabled}
            style={checked ? { backgroundColor: '#0046FF' } : {}}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0
                ${!checked ? 'bg-gray-200' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform
                ${checked ? 'translate-x-[18px]' : 'translate-x-[2px]'}`}/>
        </button>
    );
}

// Dashboard-style gradient KPI card with sparkline
function GradientKpi(props) {
    return <KpiTile {...props} />;
}

function PoolBadge({ pool }) {
    const s = POOL_STYLES[pool] || POOL_STYLES.FOUNDATION;
    return (
        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: s.bg, borderColor: s.border, color: s.color }}>
            {s.label}
        </span>
    );
}

function IssueBadge({ code, warmupEnabled = true }) {
    if (!warmupEnabled) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"/>Warmup Disabled
            </span>
        );
    }
    if (!code) return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Healthy
        </span>
    );
    const critical = ['POOL_TOO_SMALL','SEND_FAILED','MAILBOX_PAUSED'].includes(code);
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold
            ${critical ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${critical ? 'bg-red-500' : 'bg-amber-500'}`}/>
            {code.replaceAll('_',' ')}
        </span>
    );
}

function EventRow({ event }) {
    const typeColors = {
        SENT:           { bg: '#eff3ff', color: '#0046FF', border: '#c7d2fe' },
        RECEIVED:       { bg: '#e0f7fa', color: '#0e7490', border: '#67e8f9' },
        OPENED:         { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
        REPLIED:        { bg: '#eff3ff', color: '#0046FF', border: '#c7d2fe' },
        SAVED_FROM_SPAM:{ bg: '#fff7ed', color: '#FF9013', border: '#fdba74' },
        ISSUE:          { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
    };
    const s = typeColors[event.event_type] || typeColors.SENT;
    const failed = event.status === 'FAILED';
    const ts = new Date(event.event_time);
    const timeStr = ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <div className={`flex gap-3 rounded-xl border p-3 ${failed ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white'}`}>
            <span className="mt-0.5 rounded-lg border px-2 py-0.5 text-[10px] font-bold shrink-0"
                  style={failed ? { bg:'#fef2f2', color:'#dc2626', borderColor:'#fca5a5' } : { backgroundColor: s.bg, color: s.color, borderColor: s.border }}>
                {event.event_type.replace('_',' ')}
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-800">{event.subject || 'Warmup event'}</p>
                <p className="mt-0.5 text-[11px] text-gray-500 line-clamp-1">{event.detail}</p>
            </div>
            <div className="shrink-0 text-right">
                <p className="text-[11px] font-medium text-gray-400">{timeStr}</p>
                <p className="text-[10px] text-gray-300">{dateStr}</p>
            </div>
        </div>
    );
}

// ─── Inbox Row (table-style, matching dashboard card patterns) ────────────────
function InboxRow({ inbox, isSelected, onSelect, onEdit, onDelete, onToggleWarmup, isUpdating, onConnectMs365 }) {
    const ps = providerStyle(inbox.provider);
    const sentPct = inbox.current_daily_limit
        ? Math.min(Math.round(((inbox.emails_sent_today || 0) / inbox.current_daily_limit) * 100), 100)
        : 0;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => onSelect(inbox.inbox_id)}
            className={`grid grid-cols-[minmax(200px,1fr)_165px_110px_180px_90px_130px] gap-3 items-center px-5 py-3.5 cursor-pointer transition-all border-b border-gray-50 min-w-[980px]
                ${isSelected
                    ? 'bg-[#eff3ff]/60'
                    : 'hover:bg-gray-50/60'
                }`}
        >
            {/* Account */}
            <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                     style={{ backgroundColor: ps.bg, color: ps.color }}>
                    {ps.initial}
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{inbox.email_address}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <PoolBadge pool={inbox.warmup_pool || 'FOUNDATION'}/>
                        <span className="text-[10px] text-gray-400">Day {inbox.warmup_day || 0}</span>
                        {inbox.auth_type === 'OAUTH_MS365' && <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 rounded">Microsoft 365</span>}
                    </div>
                    {(inbox.oauth_error || inbox.imap_last_error) && (
                        <p className="text-[10px] text-red-600 truncate max-w-[260px]" title={inbox.oauth_error || inbox.imap_last_error}>
                            {inbox.oauth_error ? 'Sign-in problem: ' : 'Reply sync failing: '}{inbox.oauth_error || inbox.imap_last_error}
                        </p>
                    )}
                </div>
            </div>

            {/* Status */}
            <IssueBadge code={inbox.warmup_issue_code} warmupEnabled={Boolean(inbox.warmup_enabled)}/>

            {/* Provider */}
            <span className="text-xs font-medium text-gray-500 capitalize">{inbox.provider || 'SMTP'}</span>

            {/* Sent progress */}
            <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                    <span>Sent</span>
                    <span className="font-medium text-gray-600">
                        {inbox.emails_sent_today || 0} / {inbox.current_daily_limit || inbox.daily_limit || 0}
                    </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                         style={{
                             width: `${sentPct}%`,
                             background: sentPct > 85 ? '#ef4444' : 'linear-gradient(90deg,#0046FF,#73C8D2)',
                         }}/>
                </div>
            </div>

            {/* Reputation */}
            <div className="flex justify-center">
                <ReputationRing value={inbox.warmup_reputation} size={38}/>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                <Toggle
                    checked={Boolean(inbox.warmup_enabled)}
                    onChange={() => onToggleWarmup(inbox)}
                    disabled={isUpdating}
                />
                <button onClick={() => onConnectMs365(inbox)} title={inbox.auth_type === 'OAUTH_MS365' ? 'Reconnect Microsoft 365' : 'Connect with Microsoft 365 (OAuth)'}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-sky-50 hover:text-sky-700">
                    <KeyRound size={13}/>
                </button>
                <button onClick={() => onEdit(inbox)} title="Edit sending & receiving settings" aria-label="Edit sending and receiving settings"
                <button onClick={() => onEdit(inbox)}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-[#eff3ff] hover:text-[#0046FF]">
                    <Pencil size={13}/>
                </button>
                <button onClick={() => onDelete(inbox)}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={13}/>
                </button>
            </div>
        </motion.div>
    );
}

// ─── Detail panel tabs ────────────────────────────────────────────────────────
const TABS = ['Overview', 'Connection', 'Settings', 'Activity'];

const errorText = (err, fallback) => {
    const d = err?.response?.data?.detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) return d.map(x => x.msg).filter(Boolean).join('; ') || fallback;
    return fallback;
};

// Sending (SMTP) and receiving (IMAP) settings for one inbox, with edit and live sign-in tests.
function ConnectionPanel({ inbox, onEdit }) {
    const [results, setResults] = useState({});
    const [testing, setTesting] = useState(null);
    useEffect(() => { setResults({}); }, [inbox?.inbox_id]);
    if (!inbox) return null;
    const oauth = inbox.auth_type === 'OAUTH_MS365';

    const runTest = async (kind) => {
        setTesting(kind);
        try {
            const r = kind === 'smtp' ? await testSmtp(inbox.inbox_id) : await testImap(inbox.inbox_id);
            setResults(p => ({ ...p, [kind]: r }));
        } catch (err) {
            setResults(p => ({ ...p, [kind]: { status: 'error', error: errorText(err, 'Test failed') } }));
        } finally {
            setTesting(null);
        }
    };

    const Section = ({ kind, title, sub, host, port, user, hasPassword, extra }) => {
        const r = results[kind];
        const ok = r?.status === 'connected';
        const configured = Boolean(host) && (hasPassword || oauth);
        return (
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {configured ? 'Configured' : 'Incomplete'}
                    </span>
                </div>
                <dl className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-1.5 text-xs">
                    <dt className="text-gray-400">Server</dt>
                    <dd className="font-medium text-gray-800 break-all">{host ? `${host}:${port}` : <span className="text-amber-700">Not set</span>}</dd>
                    <dt className="text-gray-400">Username</dt>
                    <dd className="font-medium text-gray-800 break-all">{user || inbox.email_address}</dd>
                    <dt className="text-gray-400">Sign-in</dt>
                    <dd className="font-medium text-gray-800">{oauth ? 'Microsoft 365 (OAuth)' : hasPassword ? 'Password saved' : <span className="text-amber-700">No password</span>}</dd>
                    {extra}
                </dl>
                <button type="button" onClick={() => runTest(kind)} disabled={testing !== null || !host}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#0046FF] hover:text-[#0046FF] disabled:opacity-50">
                    {testing === kind ? <Loader2 size={13} className="animate-spin"/> : <Zap size={13}/>}
                    Test {kind === 'smtp' ? 'sending' : 'receiving'} sign-in
                </button>
                {r && (
                    <p role="status" className={`rounded-lg px-3 py-2 text-xs font-medium ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {ok
                            ? (kind === 'smtp' ? 'Signed in to the SMTP server. Sending credentials work.' : `Signed in to the mailbox. ${r.inbox_message_count_last_7d ?? 0} emails in the inbox from the last 7 days.`)
                            : (r.error || 'Could not connect.')}
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className="p-5 space-y-4">
            <button type="button" onClick={() => onEdit(inbox)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm"
                style={{ background: 'linear-gradient(135deg,#0046FF,#73C8D2)' }}>
                <Pencil size={15}/> Edit sending &amp; receiving settings
            </button>
            <Section kind="smtp" title="Sending (SMTP)" sub="Used for warmup emails from this mailbox. Campaign emails go through Amazon SES."
                host={inbox.smtp_host} port={inbox.smtp_port || 587} user={inbox.smtp_username} hasPassword={inbox.has_smtp_password}
                extra={<><dt className="text-gray-400">Security</dt><dd className="font-medium text-gray-800">{inbox.smtp_use_ssl ? 'SSL' : 'STARTTLS'}</dd></>}/>
            <Section kind="imap" title="Receiving (IMAP)" sub="Used to find replies and for warmup engagement."
                host={inbox.imap_host} port={inbox.imap_port || 993} user={inbox.imap_username} hasPassword={inbox.has_imap_password}
                extra={<>
                    <dt className="text-gray-400">Last sync</dt>
                    <dd className="font-medium text-gray-800">{inbox.last_sync_at ? new Date(inbox.last_sync_at).toLocaleString() : 'Never'}</dd>
                    {inbox.imap_last_error && <><dt className="text-gray-400">Last error</dt><dd className="font-medium text-red-600 break-words">{inbox.imap_last_error}</dd></>}
                </>}/>
            <p className="text-[11px] text-gray-400">Tests sign in with the saved settings and send nothing. Save your changes first, then test.</p>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function EmailAccounts() {
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
    const { data: inboxes = [], isLoading, error } = useQuery({ queryKey: ['inboxes'], queryFn: getInboxes });
    const { data: overview = DEFAULT_OVERVIEW } = useQuery({ queryKey: ['warmup-overview'], queryFn: getWarmupOverview });
    const { data: alertPreferences, isLoading: alertPrefsLoading } = useQuery({
        queryKey: ['alert-preferences'],
        queryFn: getAlertPreferences,
    });
    const { data: warmupDetail, isFetching: detailLoading } = useQuery({
        queryKey: ['inbox-warmup', selectedInboxId],
        queryFn: () => getWarmupDetail(selectedInboxId),
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
        mutationFn: createInbox,
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
        mutationFn: updateInbox,
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
        mutationFn: deleteInbox,
        onSuccess: (_, deletedId) => {
            if (selectedInboxId === deletedId) { setSelectedInboxId(null); setSelectedInbox(null); }
            queryClient.invalidateQueries({ queryKey: ['inboxes'] });
            queryClient.invalidateQueries({ queryKey: ['warmup-overview'] });
            setInboxToDelete(null);
        },
    });

    const runWarmupMutation = useMutation({
        mutationFn: runWarmupCycle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inboxes'] });
            queryClient.invalidateQueries({ queryKey: ['warmup-overview'] });
            if (selectedInboxId) queryClient.invalidateQueries({ queryKey: ['inbox-warmup', selectedInboxId] });
        },
    });

    const saveAlertPrefsMutation = useMutation({
        mutationFn: saveAlertPreferences,
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

    const FILTERS = [
        { key: 'all',      label: 'All' },
        { key: 'healthy',  label: 'Healthy' },
        { key: 'issues',   label: 'Issues' },
        { key: 'enabled',  label: 'Warmup On' },
        { key: 'disabled', label: 'Warmup Off' },
    ];

    const connectMs365 = async (inbox) => {
        try {
            const { authorize_url } = await startMs365(inbox.inbox_id);
            window.location.href = authorize_url;
        } catch (err) {
            setMs365Notice({ ok: false, text: err?.response?.data?.detail || 'Could not start Microsoft 365 sign-in.' });
        }
    };

    const poolStyle = POOL_STYLES[overview.current_pool] || POOL_STYLES.FOUNDATION;
    const repColor  = overview.average_reputation >= 92 ? '#0046FF'
                    : overview.average_reputation >= 75 ? '#FF9013' : '#ef4444';

    return (
        <PageTransition>
            <div className="space-y-6">

                {ms365Notice && (
                    <div className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${ms365Notice.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                        {ms365Notice.text}
                        <button onClick={() => setMs365Notice(null)} aria-label="Dismiss"><X size={14}/></button>
                    </div>
                )}

                {/* ── Header ─────────────────────────────────────────────────── */}
                <header className="w-full flex items-center justify-between mb-2">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 leading-tight">Email Accounts</h2>
                        <p className="text-sm text-gray-400 mt-1">Manage inboxes, warmup scheduling, and sender reputation.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => runWarmupMutation.mutate()}
                            disabled={runWarmupMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#0046FF]/30 hover:text-[#0046FF] disabled:opacity-50"
                        >
                            {runWarmupMutation.isPending
                                ? <Loader2 size={15} className="animate-spin"/>
                                : <RefreshCcw size={15}/>}
                            Run Warmup
                        </button>
                        <button
                            onClick={() => { setFormError(''); setIsAlertPrefsOpen(true); }}
                            disabled={alertPrefsLoading}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#0046FF]/30 hover:text-[#0046FF] disabled:opacity-50"
                        >
                            {alertPrefsLoading ? <Loader2 size={15} className="animate-spin" /> : <BellRing size={15} />}
                            Alert Preferences
                        </button>
                        <button
                            onClick={() => { setFormError(''); setIsEditMode(false); setSelectedInbox(null); setIsModalOpen(true); }}
                            className="flex items-center gap-2 text-white h-9 px-4 rounded-lg text-sm font-semibold hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                            style={{ background: 'linear-gradient(135deg, #0046FF, #73C8D2)' }}
                        >
                            <Plus size={15}/> Connect Mailbox
                        </button>
                    </div>
                </header>

                {/* ── Row 1: Gradient KPI cards (Dashboard-style) ─────────────── */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                    <GradientKpi label="Accounts"      value={overview.total_accounts}
                        from="#0046FF" to="#73C8D2" chart="bar" animDelay="0ms"
                        sub={`${overview.warmup_enabled} with warmup`}/>
                    <GradientKpi label="Warmup Active"  value={overview.warmup_enabled}
                        from="#FF9013" to="#FFB84D" chart="wave" animDelay="60ms"
                        sub="sending warmup today"/>
                    <GradientKpi label="Planned Today"  value={overview.planned_today}
                        from="#0046FF" to="#4B8BFF" chart="bar" animDelay="120ms"
                        sub="emails scheduled"/>
                    <GradientKpi label="Sent Today"     value={overview.warmup_sent_today}
                        from="#73C8D2" to="#A8E6CF" dark chart="wave" animDelay="180ms"
                        sub={`${overview.warmup_replied_today} replies`}/>
                    <GradientKpi label="Issues"         value={overview.accounts_with_issues}
                        from={overview.accounts_with_issues ? '#ef4444' : '#10b981'}
                        to={overview.accounts_with_issues ? '#f87171' : '#34d399'}
                        chart="bar" animDelay="240ms"
                        sub={overview.accounts_with_issues ? 'need attention' : 'all healthy'}/>
                </div>

                {/* ── Row 2: Pool summary + Reputation (Dashboard-style white card) ── */}
                <div className="card-anim bg-white/80 rounded-2xl shadow-sm p-6" style={{ animationDelay: '100ms' }}>
                    <div className="flex flex-wrap items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Warmup Pool</p>
                                <div className="flex items-center gap-3">
                                    <Sparkles size={16} style={{ color: poolStyle.color }}/>
                                    <span className="text-xl font-bold text-gray-900">{poolStyle.label}</span>
                                    <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold"
                                          style={{ backgroundColor: poolStyle.bg, borderColor: poolStyle.border, color: poolStyle.color }}>
                                        <Zap size={11}/> Score {overview.pool_growth_score}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <ReputationRing value={overview.average_reputation} size={56}/>
                            <div>
                                <p className="text-xs text-gray-400 font-medium">Avg Reputation</p>
                                <p className="text-2xl font-bold" style={{ color: repColor }}>{overview.average_reputation}%</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Row 3: Main content — table + detail panel ──────────────── */}
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2.1fr)_minmax(340px,1fr)] xl:items-start">

                    {/* Left: Search + table */}
                    <div className="space-y-4">

                        {/* Search + filter bar */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative flex-1 min-w-[220px]">
                                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                <input
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Search by email or provider…"
                                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-700 outline-none transition focus:border-[#0046FF]/40 focus:ring-2 focus:ring-[#0046FF]/10"
                                />
                            </div>
                            <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1">
                                {FILTERS.map(f => (
                                    <button key={f.key} onClick={() => setFilterKey(f.key)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                            filterKey === f.key
                                                ? 'bg-white shadow-sm border border-gray-100 text-[#0046FF]'
                                                : 'text-gray-400 hover:text-gray-600'
                                        }`}>
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Table card */}
                        {error ? (
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
                                Failed to load inboxes: {error.message}
                            </div>
                        ) : isLoading ? (
                            <div className="flex items-center justify-center py-16"><Loading/></div>
                        ) : filteredInboxes.length === 0 ? (
                            <div className="card-anim flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/60 py-20 text-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                                    <Mail size={24} className="text-gray-400"/>
                                </div>
                                <p className="mt-4 text-sm font-semibold text-gray-700">No mailboxes match</p>
                                <p className="mt-1 text-xs text-gray-400">Try a different filter or connect a new inbox.</p>
                                <button
                                    onClick={() => { setFormError(''); setIsEditMode(false); setSelectedInbox(null); setIsModalOpen(true); }}
                                    className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
                                    style={{ background: 'linear-gradient(135deg,#0046FF,#73C8D2)' }}>
                                    <Plus size={14}/> Connect Mailbox
                                </button>
                            </div>
                        ) : (
                            <div className="card-anim bg-white/80 rounded-2xl shadow-sm overflow-hidden" style={{ animationDelay: '120ms' }}>
                                <div className="overflow-x-auto">
                                    {/* Table header */}
                                    <div className="grid grid-cols-[minmax(210px,1fr)_160px_110px_180px_90px_130px] gap-3 items-center px-5 py-3 border-b border-gray-100 bg-gray-50/50 min-w-980px]">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Account</span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Provider</span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sent Today</span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">Score</span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Actions</span>
                                    </div>

                                    <AnimatePresence mode="popLayout">
                                        {filteredInboxes.map(inbox => (
                                            <InboxRow
                                                key={inbox.inbox_id}
                                                inbox={inbox}
                                                isSelected={selectedInboxId === inbox.inbox_id}
                                                onSelect={id => { setSelectedInboxId(id); setDetailTab('Overview'); }}
                                                onEdit={inbox => { setFormError(''); setSelectedInbox(inbox); setIsEditMode(true); setIsModalOpen(true); }}
                                                onDelete={setInboxToDelete}
                                                onToggleWarmup={inbox => updateMutation.mutate({
                                                    id: inbox.inbox_id,
                                                    data: { warmup_enabled: !inbox.warmup_enabled },
                                                })}
                                                isUpdating={updateMutation.isPending}
                                                onConnectMs365={connectMs365}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: detail panel */}
                    <div className="min-w-0">
                        <div className="card-anim sticky top-6 rounded-2xl bg-white/80 shadow-sm overflow-hidden" style={{ animationDelay: '160ms' }}>

                            {/* Panel header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50"
                                 style={{ background: 'linear-gradient(135deg,rgba(0,70,255,0.04),rgba(115,200,210,0.06),#fff)' }}>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={16} style={{ color: '#0046FF' }}/>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {selectedInboxSummary ? 'Inbox Detail' : 'Warmup Control'}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {selectedInboxSummary ? selectedInboxSummary.email_address : 'Select a mailbox to inspect'}
                                        </p>
                                    </div>
                                </div>
                                {selectedInboxId && (
                                    <button onClick={() => setSelectedInboxId(null)}
                                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
                                        <X size={14}/>
                                    </button>
                                )}
                            </div>

                            {/* Empty state */}
                            {!selectedInboxId ? (
                                <div className="flex min-h-[520px] flex-col items-center justify-center px-6 py-12 text-center">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
                                         style={{ background: 'linear-gradient(135deg,#eff3ff,#e0f7fa)' }}>
                                        <ShieldCheck size={28} style={{ color: '#0046FF' }}/>
                                    </div>
                                    <h4 className="mt-5 text-base font-semibold text-gray-900">Select a mailbox</h4>
                                    <p className="mt-2 max-w-[240px] text-xs text-gray-400">
                                        Click any inbox row to see its reputation, connection settings (sending &amp; receiving), warmup activity and settings.
                                    </p>
                                </div>
                            ) : detailLoading ? (
                                <div className="flex min-h-[520px] items-center justify-center"><Loading/></div>
                            ) : !selectedInboxSummary ? (
                                <div className="p-6 text-sm text-red-500">Failed to load inbox detail.</div>
                            ) : (
                                <>
                                    {/* Tabs */}
                                    <div className="flex border-b border-gray-100 px-4">
                                        {TABS.map(tab => (
                                            <button key={tab} onClick={() => setDetailTab(tab)}
                                                className={`px-3 py-3 text-xs font-semibold transition-all border-b-2 -mb-px ${
                                                    detailTab === tab
                                                        ? 'border-[#0046FF] text-[#0046FF]'
                                                        : 'border-transparent text-gray-400 hover:text-gray-600'
                                                }`}>
                                                {tab}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="max-h-[calc(100vh-300px)] overflow-y-auto">

                                        {/* Overview */}
                                        {detailTab === 'Overview' && (
                                            <div className="p-5 space-y-5">
                                                <div className="flex items-center gap-4 rounded-2xl border border-gray-100 p-4">
                                                    <ReputationRing value={selectedInboxSummary.warmup_reputation} size={72}/>
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Reputation Score</p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            <PoolBadge pool={selectedInboxSummary.warmup_pool || 'FOUNDATION'}/>
                                                    <IssueBadge
                                                        code={selectedInboxSummary.warmup_issue_code}
                                                        warmupEnabled={Boolean(selectedInboxSummary.warmup_enabled)}
                                                    />
                                                        </div>
                                                        <p className="text-xs text-gray-400">
                                                            {selectedInboxSummary.provider || 'SMTP'} &middot; Day {selectedInboxSummary.warmup_day || 0}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Today</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {[
                                                            { label: 'Target',  value: todayMetric?.planned_sends  || 0, icon: Clock,        c: '#0046FF' },
                                                            { label: 'Sent',    value: todayMetric?.actual_sends   || 0, icon: Send,          c: '#73C8D2' },
                                                            { label: 'Replies', value: todayMetric?.reply_count    || 0, icon: MessageSquare, c: '#16a34a' },
                                                            { label: 'Saved',   value: todayMetric?.saved_from_spam_count || 0, icon: ShieldCheck, c: '#FF9013' },
                                                        ].map(({ label, value, icon: Icon, c }) => (
                                                            <div key={label} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 flex items-center gap-2">
                                                                <span className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                                                                      style={{ backgroundColor: c + '18' }}>
                                                                    <Icon size={14} style={{ color: c }}/>
                                                                </span>
                                                                <div>
                                                                    <p className="text-[10px] text-gray-400 font-medium">{label}</p>
                                                                    <p className="text-base font-bold text-gray-900">{value}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">14-Day Reputation Trend</p>
                                                    {history.length === 0 ? (
                                                        <p className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-center text-xs text-gray-400">
                                                            No history yet — comes after first warmup cycle.
                                                        </p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {history.map(item => {
                                                                const pct = Math.min(Number(item.reputation_score || 0), 100);
                                                                const c = pct >= 92 ? '#0046FF' : pct >= 75 ? '#FF9013' : '#ef4444';
                                                                return (
                                                                    <div key={item.metric_id} className="grid grid-cols-[80px_1fr_42px] items-center gap-3">
                                                                        <span className="text-[11px] font-medium text-gray-400">{item.metric_date}</span>
                                                                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                                                            <div className="h-full rounded-full"
                                                                                 style={{ width: `${pct}%`, backgroundColor: c, transition: 'width 0.4s ease' }}/>
                                                                        </div>
                                                                        <span className="text-right text-[11px] font-bold" style={{ color: c }}>{pct}%</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Connection */}
                                        {detailTab === 'Connection' && (
                                            <ConnectionPanel
                                                inbox={inboxes.find(i => i.inbox_id === selectedInboxId)}
                                                onEdit={inbox => { setFormError(''); setSelectedInbox(inbox); setIsEditMode(true); setIsModalOpen(true); }}/>
                                        )}

                                        {/* Settings */}
                                        {detailTab === 'Settings' && (
                                            <div className="p-5 space-y-4">
                                                {[
                                                    { key: 'warmup_enabled',    label: 'Warmup Enabled',      sub: 'Allow warmup traffic from this mailbox.' },
                                                    { key: 'warmup_auto_adjust', label: 'Auto Adjust Volume',  sub: 'Reduce warmup when campaign traffic is busy.' },
                                                    { key: 'warmup_randomize',   label: 'Randomize Daily Count', sub: 'Add variance to avoid bot-like patterns.' },
                                                ].map(({ key, label, sub }) => (
                                                    <div key={key} className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900">{label}</p>
                                                            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                                                        </div>
                                                        <Toggle checked={drawerForm[key]}
                                                            onChange={() => setDrawerForm(p => ({ ...p, [key]: !p[key] }))}/>
                                                    </div>
                                                ))}

                                                <div className="grid grid-cols-2 gap-3">
                                                    {[
                                                        { key: 'warmup_reply_rate_target', label: 'Reply Rate %',    min: 0, max: 100, placeholder: '' },
                                                        { key: 'warmup_max_target',        label: 'Max Target',      min: 0, placeholder: 'Auto' },
                                                        { key: 'delay_between_emails',     label: 'Delay (sec)',     min: 15, placeholder: '' },
                                                        { key: 'daily_limit',              label: 'Daily Limit (post-warmup)', min: 1, placeholder: '' },
                                                    ].map(({ key, label, min, max, placeholder }) => (
                                                        <label key={key} className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5 block">
                                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
                                                            <input type="number" min={min} max={max}
                                                                value={drawerForm[key]} placeholder={placeholder}
                                                                onChange={e => setDrawerForm(p => ({ ...p, [key]: e.target.value }))}
                                                                className="mt-1 w-full bg-transparent text-sm font-bold text-gray-900 outline-none"/>
                                                        </label>
                                                    ))}
                                                </div>

                                                <label className="block rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5">
                                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                                                        Max Emails/Day Override (bypasses warmup ramp)
                                                    </span>
                                                    <input type="number" min={1}
                                                        value={drawerForm.max_emails_per_day}
                                                        placeholder="Off — follow warmup ramp / Daily Limit"
                                                        onChange={e => setDrawerForm(p => ({ ...p, max_emails_per_day: e.target.value }))}
                                                        className="mt-1 w-full bg-transparent text-sm font-bold text-gray-900 outline-none"/>
                                                    <p className="text-[11px] text-amber-700/80 mt-1">
                                                        Only set this for an already-established mailbox/domain with prior
                                                        sending history. It skips the day-by-day warmup ramp entirely —
                                                        new mailboxes should leave this blank and let warmup graduate
                                                        (day 10+) to the Daily Limit above instead.
                                                    </p>
                                                </label>

                                                <label className="block rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5">
                                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Warmup Identifier</span>
                                                    <input value={drawerForm.warmup_identifier}
                                                        onChange={e => setDrawerForm(p => ({ ...p, warmup_identifier: e.target.value }))}
                                                        placeholder="Optional routing tag"
                                                        className="mt-1 w-full bg-transparent text-sm font-bold text-gray-900 outline-none"/>
                                                </label>

                                                {formError && (
                                                    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{formError}</p>
                                                )}

                                                <button onClick={handleSaveSettings}
                                                    disabled={updateMutation.isPending}
                                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60"
                                                    style={{ background: saveSuccess
                                                        ? 'linear-gradient(135deg,#059669,#34d399)'
                                                        : 'linear-gradient(135deg,#0046FF,#73C8D2)' }}>
                                                    {updateMutation.isPending
                                                        ? <Loader2 size={15} className="animate-spin"/>
                                                        : <CheckCircle2 size={15}/>}
                                                    {saveSuccess ? 'Saved!' : 'Save Settings'}
                                                </button>
                                            </div>
                                        )}

                                        {/* Activity */}
                                        {detailTab === 'Activity' && (
                                            <div className="p-5 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Recent Events</p>
                                                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                                                        {events.length}
                                                    </span>
                                                </div>
                                                {events.length === 0 ? (
                                                    <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-xs text-gray-400">
                                                        No warmup activity yet for this mailbox.
                                                    </div>
                                                ) : events.map(event => (
                                                    <EventRow key={event.event_id} event={event}/>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── ConnectionWizard modal ─────────────────────────────────────── */}
            <ConnectionWizard
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={(formData) => {
                    setFormError('');
                    if (isEditMode && selectedInbox?.inbox_id) {
                        updateMutation.mutate({ id: selectedInbox.inbox_id, data: formData }, {
                            onSuccess: () => { setIsModalOpen(false); setIsEditMode(false); setSelectedInbox(null); },
                        });
                        return;
                    }
                    createMutation.mutate(formData);
                }}
                isSubmitting={createMutation.isPending || updateMutation.isPending}
                error={formError}
                initialData={isEditMode ? selectedInbox : null}
            />

            <AlertPreferencesModal
                isOpen={isAlertPrefsOpen}
                onClose={() => setIsAlertPrefsOpen(false)}
                data={alertPreferences}
                isSaving={saveAlertPrefsMutation.isPending}
                onSave={(preferences) => saveAlertPrefsMutation.mutate(preferences)}
            />

            {/* ── DNS verification modal ─────────────────────────────────────── */}
            <AnimatePresence>
                {verificationData && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                            <div className="flex items-start justify-between p-5 text-white"
                                 style={{ background: 'linear-gradient(135deg,#0046FF,#73C8D2)' }}>
                                <div>
                                    <h2 className="flex items-center gap-2 text-lg font-bold">
                                        <ShieldCheck size={18}/> Verify Domain Ownership
                                    </h2>
                                    <p className="mt-1 text-sm text-white/80">
                                        Add these DNS records to activate sending for <strong>{verificationData.domain}</strong>.
                                    </p>
                                </div>
                                <button onClick={() => setVerificationData(null)} className="text-white/70 hover:text-white transition">
                                    <X size={20}/>
                                </button>
                            </div>
                            <div className="max-h-[55vh] space-y-3 overflow-y-auto p-5">
                                {verificationData.dns_records.map((record, idx) => (
                                    <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{record.type} Record</span>
                                            <span className="rounded-full bg-[#eff3ff] px-2.5 py-0.5 text-xs font-semibold text-[#0046FF]">Required</span>
                                        </div>
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Host</p>
                                                <code className="block rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 overflow-x-auto">{record.host}</code>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Value</p>
                                                <code className="block rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 overflow-x-auto">{record.value}</code>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-4">
                                <p className="text-xs text-gray-400">You can reopen these from Domain Health later.</p>
                                <button onClick={() => setVerificationData(null)}
                                    className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                                    style={{ background: 'linear-gradient(135deg,#0046FF,#73C8D2)' }}>
                                    Done
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Delete confirm ─────────────────────────────────────────────── */}
            <AnimatePresence>
                {inboxToDelete && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                                <AlertTriangle size={22} className="text-red-600"/>
                            </div>
                            <h3 className="text-base font-bold text-gray-900">Delete Mailbox?</h3>
                            <p className="mt-2 text-sm text-gray-500">
                                Remove <strong>{inboxToDelete.email_address}</strong>? This also removes it from the warmup pool.
                            </p>
                            <div className="mt-5 flex justify-center gap-3">
                                <button onClick={() => setInboxToDelete(null)}
                                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                                    Cancel
                                </button>
                                <button
                                    onClick={() => deleteMutation.mutate(inboxToDelete.inbox_id)}
                                    disabled={deleteMutation.isPending}
                                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-60">
                                    {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin"/> : 'Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </PageTransition>
    );
}

