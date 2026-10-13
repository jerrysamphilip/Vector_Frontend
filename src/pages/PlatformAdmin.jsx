import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    Building2,
    CheckCircle2,
    Copy,
    Eye,
    PauseCircle,
    PlayCircle,
    Plus,
    RefreshCw,
    Search,
    Send,
    ShieldCheck,
    Users,
    X,
    XCircle,
} from 'lucide-react';
import { platformAdminApi } from '../api/platformAdmin';
import KpiTile from '../components/ui/KpiTile';
import { useDialog } from '../components/common/useDialog';

function Skeleton({ className = '' }) {
    return <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />;
}

function GradientCard(props) {
    return <KpiTile {...props} />;
}

function SectionCard({ title, subtitle, icon: Icon, children, delay = '0ms', action = null }) {
    return (
        <div className="card-anim overflow-hidden rounded-[24px] bg-white/85 shadow-sm ring-1 ring-slate-100" style={{ animationDelay: delay }}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                    <span
                        className="flex h-10 w-10 items-center justify-center rounded-2xl"
                        style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.12), rgba(115,200,210,0.18))' }}
                    >
                        <Icon className="h-5 w-5 text-[#2d6bbf]" />
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-slate-800">{title}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
                    </div>
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}

function StatusBadge({ status }) {
    const normalized = (status || '').toUpperCase();
    const cls = normalized === 'ACTIVE'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : normalized === 'SUSPENDED'
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : normalized === 'INVITED'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-slate-50 text-slate-600 border-slate-200';

    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${cls}`}>
            {normalized === 'ACTIVE' && <CheckCircle2 className="h-3 w-3" />}
            {normalized === 'SUSPENDED' && <XCircle className="h-3 w-3" />}
            {normalized === 'INVITED' && <AlertTriangle className="h-3 w-3" />}
            {normalized}
        </span>
    );
}

function RoleBadge({ role }) {
    const tones = {
        SUPER_ADMIN: 'bg-violet-50 text-violet-700',
        ADMIN: 'bg-blue-50 text-blue-700',
        MANAGER: 'bg-emerald-50 text-emerald-700',
        AGENT: 'bg-slate-100 text-slate-700',
        VIEWER: 'bg-amber-50 text-amber-700',
    };

    return (
        <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${tones[role] || 'bg-slate-100 text-slate-700'}`}>
            {role?.replace('_', ' ')}
        </span>
    );
}

function StatPill({ label, value }) {
    return (
        <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
    );
}

function formatDate(dateValue) {
    if (!dateValue) return '—';
    return new Date(dateValue).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function TenantDetailModal({ tenantId, onClose }) {
    const { data, isLoading } = useQuery({
        queryKey: ['admin-tenant-detail', tenantId],
        queryFn: () => platformAdminApi.getTenantDetail(tenantId),
        enabled: !!tenantId,
    });
    const { titleId, dialogProps } = useDialog({ onClose });

    if (!tenantId) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[70] flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={onClose} />
                <motion.div
                    {...dialogProps}
                    aria-label={isLoading ? 'Tenant detail' : undefined}
                    className="relative flex max-h-[84vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl outline-none"
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 12 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                    <div
                        className="flex items-start justify-between px-7 py-6 text-white"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                    >
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Tenant Detail
                            </div>
                            {isLoading ? (
                                <div className="mt-4 h-10 w-52 animate-pulse rounded-xl bg-white/25" />
                            ) : (
                                <h2
                                    id={titleId}
                                    className="mt-4 text-3xl font-bold tracking-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]"
                                    style={{ color: '#ffffff' }}
                                >
                                    {data?.tenant_name || 'Tenant'}
                                </h2>
                            )}
                            <p className="mt-1 text-sm text-white/90">Team, status, and account activity in one place.</p>
                        </div>
                        <button type="button" onClick={onClose} aria-label="Close tenant detail" className="rounded-2xl bg-white/10 p-2.5 text-white/85 transition hover:bg-white/20">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-7">
                        {isLoading ? (
                            <div className="grid gap-4 md:grid-cols-3">
                                <Skeleton className="h-24" />
                                <Skeleton className="h-24" />
                                <Skeleton className="h-24" />
                            </div>
                        ) : data ? (
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-4">
                                    <StatPill label="Status" value={<StatusBadge status={data.status} />} />
                                    <StatPill label="Users" value={data.users?.length || 0} />
                                    <StatPill label="Campaigns" value={data.campaign_count || 0} />
                                    <StatPill label="Created" value={formatDate(data.created_at)} />
                                </div>

                                <SectionCard
                                    title="Tenant Team"
                                    subtitle={`${data.users?.length || 0} team members`}
                                    icon={Users}
                                >
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[680px] text-left">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    {['Name', 'Email', 'Role', 'Status'].map((header) => (
                                                        <th key={header} className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500/90">
                                                            {header}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {data.users?.map((user, index) => (
                                                    <tr key={user.user_id} className={index % 2 ? 'bg-slate-50/50' : 'bg-white'}>
                                                        <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                                                            {user.first_name} {user.last_name}
                                                        </td>
                                                        <td className="px-5 py-4 text-sm text-slate-500">{user.email}</td>
                                                        <td className="px-5 py-4"><RoleBadge role={user.role} /></td>
                                                        <td className="px-5 py-4"><StatusBadge status={user.status} /></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </SectionCard>
                            </div>
                        ) : null}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

function CreateTenantModal({ onClose, onCreated }) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({ tenant_name: '', admin_first_name: '', admin_last_name: '', admin_email: '' });
    const [magicLink, setMagicLink] = useState(null);
    const [copied, setCopied] = useState(false);

    const mutation = useMutation({
        mutationFn: (data) => platformAdminApi.createTenant(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
            if (data.magic_login_link) {
                setMagicLink(data.magic_login_link);
            } else {
                onCreated?.();
                onClose();
            }
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate(form);
    };
    // Escape / backdrop do not dismiss the one-time activation link
    const { titleId, dialogProps } = useDialog({ onClose, closeOnEscape: !magicLink });

    const handleCopy = () => {
        navigator.clipboard.writeText(magicLink).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[80] flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={!magicLink ? onClose : undefined} />
                <motion.div
                    {...dialogProps}
                    className="relative w-full max-w-lg max-h-[90vh] max-h-[90dvh] overflow-x-hidden overflow-y-auto rounded-[28px] bg-white shadow-2xl outline-none"
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 12 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between px-7 py-6 text-white"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                                <Building2 className="h-3.5 w-3.5" />
                                New Tenant
                            </div>
                            <h2
                                id={titleId}
                                className="mt-3 text-2xl font-bold tracking-tight"
                                style={{ color: '#ffffff' }}
                            >
                                Create Tenant
                            </h2>
                            <p className="mt-1 text-sm text-white/85">Set up a new workspace and its Super Admin.</p>
                        </div>
                        <button type="button" onClick={onClose} aria-label="Close" className="rounded-2xl bg-white/10 p-2.5 text-white/85 transition hover:bg-white/20">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-7">
                        {magicLink ? (
                            /* ── Success: show magic link ── */
                            <div className="space-y-5">
                                <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                                    <div>
                                        <p className="text-sm font-semibold text-emerald-800">Tenant created successfully</p>
                                        <p className="mt-0.5 text-xs text-emerald-700">
                                            Email delivery failed — share this activation link with the admin manually.
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Activation Link</p>
                                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                        <p className="flex-1 truncate font-mono text-xs text-slate-700">{magicLink}</p>
                                        <button
                                            type="button"
                                            onClick={handleCopy}
                                            aria-label={copied ? 'Activation link copied' : 'Copy activation link'}
                                            title="Copy activation link"
                                            className="shrink-0 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-[#2d6bbf] shadow-sm transition hover:bg-blue-50"
                                        >
                                            {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { onCreated?.(); onClose(); }}
                                    className="w-full rounded-2xl py-3 text-sm font-semibold text-white transition hover:opacity-90"
                                    style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            /* ── Create form ── */
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {mutation.isError && (
                                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                        {mutation.error?.response?.data?.detail || 'Failed to create tenant.'}
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="ct-tenant-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Organization / Tenant Name
                                    </label>
                                    <input
                                        id="ct-tenant-name"
                                        required
                                        value={form.tenant_name}
                                        onChange={e => setForm(f => ({ ...f, tenant_name: e.target.value }))}
                                        placeholder="e.g. Acme Corp"
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="ct-first-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            First Name
                                        </label>
                                        <input
                                        id="ct-first-name"
                                            required
                                            value={form.admin_first_name}
                                            onChange={e => setForm(f => ({ ...f, admin_first_name: e.target.value }))}
                                            placeholder="John"
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="ct-last-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            Last Name
                                        </label>
                                        <input
                                        id="ct-last-name"
                                            required
                                            value={form.admin_last_name}
                                            onChange={e => setForm(f => ({ ...f, admin_last_name: e.target.value }))}
                                            placeholder="Doe"
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="ct-admin-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Admin Email
                                    </label>
                                    <input
                                        id="ct-admin-email"
                                        required
                                        type="email"
                                        value={form.admin_email}
                                        onChange={e => setForm(f => ({ ...f, admin_email: e.target.value }))}
                                        placeholder="admin@acme.com"
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={mutation.isPending}
                                        className="flex-1 rounded-2xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                                        style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                                    >
                                        {mutation.isPending ? 'Creating…' : 'Create Tenant'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

function ErrorBanner({ message }) {
    if (!message) return null;
    return (
        <div role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {message}
        </div>
    );
}

const errDetail = (e, fallback) => {
    const d = e?.response?.data?.detail;
    return typeof d === 'string' ? d : fallback;
};

/** Platform-wide email scheduler pause switch (/scheduler/status|stop|start). */
function SchedulerCard() {
    const queryClient = useQueryClient();
    const { data, isLoading, isError } = useQuery({
        queryKey: ['admin-scheduler'],
        queryFn: platformAdminApi.getSchedulerStatus,
        staleTime: 15_000,
    });
    const running = data?.running;
    const toggle = useMutation({
        mutationFn: (pause) => (pause ? platformAdminApi.pauseScheduler() : platformAdminApi.resumeScheduler()),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin-scheduler'] }),
    });
    const onToggle = () => {
        const pause = Boolean(running);
        const question = pause
            ? 'Pause the email scheduler? No scheduled campaign email is sent for any tenant until it is resumed.'
            : 'Resume the email scheduler? Scheduled campaign emails start sending again for every tenant.';
        if (window.confirm(question)) toggle.mutate(pause);
    };

    return (
        <SectionCard
            title="Email scheduler"
            subtitle="Sends scheduled campaign emails for every tenant"
            icon={Send}
            delay="360ms"
            action={!isLoading && !isError && (
                <button
                    type="button"
                    onClick={onToggle}
                    disabled={toggle.isPending}
                    data-testid="scheduler-toggle"
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${running
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                >
                    {running ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
                    {running ? 'Pause scheduler' : 'Resume scheduler'}
                </button>
            )}
        >
            <div className="flex flex-wrap items-center gap-3 px-6 py-4 text-sm" data-testid="scheduler-status">
                {isLoading ? <Skeleton className="h-5 w-40" /> : isError ? (
                    <span className="text-rose-600">Could not read the scheduler status.</span>
                ) : (
                    <>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${running
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                            {running ? <CheckCircle2 className="h-3 w-3" /> : <PauseCircle className="h-3 w-3" />}
                            {running ? 'Running' : 'Paused'}
                        </span>
                        <span className="text-slate-500">
                            {running
                                ? 'Scheduled emails are being sent.'
                                : `Sending is paused for all tenants${data?.paused_by ? ` (paused by ${data.paused_by})` : ''}.`}
                        </span>
                    </>
                )}
                {toggle.isError && <span className="text-rose-600">{errDetail(toggle.error, 'Could not change the scheduler state.')}</span>}
            </div>
        </SectionCard>
    );
}

/** Read-only list of every tenant user (/api/admin/users, first 200 matches). */
function PlatformUsers() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const { data: users, isLoading, isError, error } = useQuery({
        queryKey: ['admin-users', search],
        queryFn: () => platformAdminApi.listAllUsers(search ? { search } : {}),
        staleTime: 30_000,
    });

    return (
        <div className="mx-auto max-w-[1480px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
            <div className="card-anim overflow-hidden rounded-[28px] bg-white/80 shadow-sm ring-1 ring-white/70">
                <div
                    className="flex flex-col gap-6 px-5 py-6 sm:px-7 sm:py-7 xl:flex-row xl:items-end xl:justify-between"
                    style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.12), rgba(115,200,210,0.14), rgba(255,255,255,0.92))' }}
                >
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2d6bbf] shadow-sm">
                            <Users className="h-3.5 w-3.5" />
                            All tenants
                        </div>
                        <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Users</h1>
                        <p className="mt-2 text-sm text-slate-500">Every tenant user across the platform (read-only).</p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative sm:min-w-[280px]">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search users..."
                                aria-label="Search users by name or email"
                                className="w-full rounded-2xl border border-slate-200 bg-white/90 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-[#2d6bbf]"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            <SectionCard
                title="User Directory"
                subtitle={`${users?.length ?? 0} users${users?.length === 200 ? ' (first 200 shown: refine the search)' : ''}`}
                icon={Users}
                delay="80ms"
            >
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                {['Name', 'Email', 'Tenant', 'Role', 'Status', 'Last login'].map((header) => (
                                    <th key={header} className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500/90">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                Array.from({ length: 4 }).map((_, index) => (
                                    <tr key={index}>
                                        {Array.from({ length: 6 }).map((__, cellIndex) => (
                                            <td key={cellIndex} className="px-5 py-4"><Skeleton className="h-4 w-full" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : isError ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-16 text-center text-sm text-rose-600">
                                        {errDetail(error, 'Could not load users.')}
                                    </td>
                                </tr>
                            ) : users?.length ? (
                                users.map((user, index) => (
                                    <tr key={user.user_id} className={index % 2 ? 'bg-slate-50/45' : 'bg-white'}>
                                        <td className="px-5 py-4 text-sm font-semibold text-slate-800">{`${user.first_name} ${user.last_name}`.trim() || '—'}</td>
                                        <td className="px-5 py-4 text-sm text-slate-500">{user.email}</td>
                                        <td className="px-5 py-4 text-sm text-slate-700">{user.tenant_name || '—'}</td>
                                        <td className="px-5 py-4"><RoleBadge role={user.role} /></td>
                                        <td className="px-5 py-4"><StatusBadge status={user.status} /></td>
                                        <td className="px-5 py-4 text-sm text-slate-500">{formatDate(user.last_login_at)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-5 py-16 text-center text-sm text-slate-400">
                                        No users found for the current search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </div>
    );
}

/**
 * Platform admin console. view: 'dashboard' (/admin: stats, scheduler, tenant roster),
 * 'tenants' (/admin/tenants: the tenant list), 'users' (/admin/users: every tenant user).
 */
export default function PlatformAdmin({ view = 'dashboard' }) {
    if (view === 'users') return <PlatformUsers />;
    return <TenantsConsole dashboard={view !== 'tenants'} />;
}

function TenantsConsole({ dashboard }) {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: platformAdminApi.getStats,
        staleTime: 60_000,
        enabled: dashboard,
    });

    const { data: tenants, isLoading: tenantsLoading } = useQuery({
        queryKey: ['admin-tenants', search],
        queryFn: () => platformAdminApi.listTenants(search ? { search } : {}),
        staleTime: 30_000,
    });

    const statusMutation = useMutation({
        mutationFn: ({ tenantId, status }) => platformAdminApi.updateTenantStatus(tenantId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
            if (selectedTenant) {
                queryClient.invalidateQueries({ queryKey: ['admin-tenant-detail', selectedTenant] });
            }
        },
    });
    // Suspending cuts every user of the tenant off the API at once: confirm first (both ways)
    const changeStatus = (tenant, status) => {
        const question = status === 'SUSPENDED'
            ? `Suspend "${tenant.tenant_name}"? Its users lose access immediately and cannot sign in until the tenant is reactivated.`
            : `Reactivate "${tenant.tenant_name}"? Its users can sign in and use the workspace again.`;
        if (window.confirm(question)) statusMutation.mutate({ tenantId: tenant.tenant_id, status });
    };

    const summary = useMemo(() => ({
        activeTenants: stats?.active_tenants ?? 0,
        activeUsers: stats?.active_users ?? 0,
        totalCampaigns: stats?.total_campaigns ?? 0,
        suspendedTenants: stats?.suspended_tenants ?? 0,
    }), [stats]);

    return (
        <div className="mx-auto max-w-[1480px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
            <div className="card-anim overflow-hidden rounded-[28px] bg-white/80 shadow-sm ring-1 ring-white/70" style={{ animationDelay: '0ms' }}>
                <div
                    className="flex flex-col gap-6 px-5 py-6 sm:px-7 sm:py-7 xl:flex-row xl:items-end xl:justify-between"
                    style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.12), rgba(115,200,210,0.14), rgba(255,255,255,0.92))' }}
                >
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2d6bbf] shadow-sm">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Platform Control Center
                        </div>
                        <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">{dashboard ? 'Platform Administration' : 'Tenants'}</h1>
                        <p className="mt-2 text-sm text-slate-500">
                            {dashboard
                                ? 'Manage tenants, users, suspension state, and system-wide growth from one operational surface.'
                                : 'Every workspace on the platform: search, inspect, suspend or reactivate, and add tenants.'}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative sm:min-w-[280px]">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search tenants..."
                                aria-label="Search tenants"
                                className="w-full rounded-2xl border border-slate-200 bg-white/90 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15"
                            />
                        </div>
                        <button
                            onClick={() => {
                                queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                                queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
                                queryClient.invalidateQueries({ queryKey: ['admin-users'] });
                                queryClient.invalidateQueries({ queryKey: ['admin-scheduler'] });
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-[#2d6bbf]"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                        >
                            <Plus className="h-4 w-4" />
                            Add Tenant
                        </button>
                    </div>
                </div>
            </div>

            {dashboard && (<>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <GradientCard
                    label="Total Tenants"
                    value={statsLoading ? '—' : stats?.total_tenants ?? 0}
                    sub={`${summary.activeTenants} active workspaces`}
                    from="#2d6bbf"
                    to="#1f56aa"
                    chart="bar"
                    trend={summary.activeTenants > 0}
                    delay="80ms"
                />
                <GradientCard
                    label="Total Users"
                    value={statsLoading ? '—' : stats?.total_users ?? 0}
                    sub={`${summary.activeUsers} active members`}
                    from="#F5F1DC"
                    to="#e8e3c0"
                    dark
                    chart="wave"
                    trend={summary.activeUsers > 0}
                    delay="160ms"
                />
                <GradientCard
                    label="Total Campaigns"
                    value={statsLoading ? '—' : summary.totalCampaigns}
                    sub="Across all tenants"
                    from="#FF9013"
                    to="#cc6f00"
                    chart="wave"
                    trend={summary.totalCampaigns > 0}
                    delay="240ms"
                />
                <GradientCard
                    label="Suspended"
                    value={statsLoading ? '—' : summary.suspendedTenants}
                    sub="Tenants currently blocked"
                    from="#73C8D2"
                    to="#4db0bb"
                    chart="bar"
                    trend={summary.suspendedTenants === 0}
                    delay="320ms"
                />
            </div>

            <SchedulerCard />
            </>)}

            <ErrorBanner message={statusMutation.isError ? errDetail(statusMutation.error, 'Could not change the tenant status.') : ''} />

            <div className="grid gap-6">
                <SectionCard
                    title="Tenant Roster"
                    subtitle={`${tenants?.length ?? 0} visible tenants`}
                    icon={Building2}
                    delay="400ms"
                    action={
                        <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                            Live tenant status
                        </div>
                    }
                >
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    {['Tenant', 'Status', 'Users', 'Campaigns', 'Created', 'Actions'].map((header) => (
                                        <th key={header} className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500/90">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tenantsLoading ? (
                                    Array.from({ length: 4 }).map((_, index) => (
                                        <tr key={index}>
                                            {Array.from({ length: 6 }).map((__, cellIndex) => (
                                                <td key={cellIndex} className="px-5 py-4">
                                                    <Skeleton className="h-4 w-full" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : tenants?.length ? (
                                    tenants.map((tenant, index) => (
                                        <tr key={tenant.tenant_id} className={`transition-colors hover:bg-blue-50/40 ${index % 2 ? 'bg-slate-50/45' : 'bg-white'}`}>
                                            <td className="px-5 py-4">
                                                <p className="text-sm font-semibold text-slate-800">{tenant.tenant_name}</p>
                                                <p className="mt-1 text-[11px] font-mono text-slate-400">{tenant.tenant_id.slice(0, 8)}…</p>
                                            </td>
                                            <td className="px-5 py-4"><StatusBadge status={tenant.status} /></td>
                                            <td className="px-5 py-4 text-sm font-semibold text-[#2d6bbf]">{tenant.user_count}</td>
                                            <td className="px-5 py-4 text-sm font-semibold text-slate-700">{tenant.campaign_count}</td>
                                            <td className="px-5 py-4 text-sm text-slate-500">{formatDate(tenant.created_at)}</td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setSelectedTenant(tenant.tenant_id)}
                                                        className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-[#2d6bbf] transition hover:bg-blue-100"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        View
                                                    </button>
                                                    {tenant.status === 'ACTIVE' ? (
                                                        <button
                                                            onClick={() => changeStatus(tenant, 'SUSPENDED')}
                                                            disabled={statusMutation.isPending}
                                                            className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                                                        >
                                                            <PauseCircle className="h-3.5 w-3.5" />
                                                            Suspend
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => changeStatus(tenant, 'ACTIVE')}
                                                            disabled={statusMutation.isPending}
                                                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                                                        >
                                                            <PlayCircle className="h-3.5 w-3.5" />
                                                            Activate
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-16 text-center text-sm text-slate-400">
                                            No tenants found for the current search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            </div>

            {selectedTenant && (
                <TenantDetailModal tenantId={selectedTenant} onClose={() => setSelectedTenant(null)} />
            )}

            {showCreateModal && (
                <CreateTenantModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
                        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                    }}
                />
            )}
        </div>
    );
}

