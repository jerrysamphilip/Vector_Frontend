import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Users, UserPlus, Search, Shield, Copy,
    Clock, X, Mail, Crown, UserCheck, UserX, ChevronDown,
    CheckCircle, Settings2, RotateCcw, Trash2, TrendingUp, TrendingDown,
    Network, Send,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import Loading from '../components/common/Loading';
import usersApi from '../api/users';
import { hierarchyApi } from '../api/sales';
import { managerCandidates, hierarchyError } from '../lib/hierarchy';
import { getStoredUser } from '../lib/authStorage';
import KpiTile from '../components/ui/KpiTile';

// ── Constants ──────────────────────────────────────────────────
const ROLE_META = {
    PLATFORM_ADMIN: { label: 'Platform Admin', color: 'bg-indigo-100 text-indigo-700' },
    SUPER_ADMIN:    { label: 'Super Admin',    color: 'bg-violet-100 text-violet-700' },
    ADMIN:          { label: 'Admin',          color: 'bg-blue-100 text-blue-700'     },
    MANAGER:        { label: 'Manager',        color: 'bg-emerald-100 text-emerald-700' },
    AGENT:          { label: 'Agent',          color: 'bg-slate-100 text-slate-700'   },
};

const INVITE_ROLES = [
    { value: 'SUPER_ADMIN', label: 'Super Admin', desc: 'Full access — same as you. Can manage everything including users.', superAdminOnly: true },
    { value: 'ADMIN',       label: 'Admin',       desc: 'Can manage team members and all campaigns' },
    { value: 'MANAGER',     label: 'Manager',     desc: 'Can run campaigns but cannot manage users' },
    { value: 'AGENT',       label: 'Agent',        desc: 'Sales rep — can use assigned campaigns and inboxes' },
];

const PERMISSION_LIST = [
    { key: 'manage_campaigns',  label: 'Manage Campaigns',  desc: 'Create, edit and delete campaigns',      icon: '📧' },
    { key: 'manage_templates',  label: 'Manage Templates',  desc: 'Create and edit email templates',        icon: '📝' },
    { key: 'manage_inboxes',    label: 'Manage Inboxes',    desc: 'Connect and configure email inboxes',    icon: '📬' },
    { key: 'manage_prospects',  label: 'Manage Prospects',  desc: 'Import and manage prospect lists',       icon: '👥' },
    { key: 'view_analytics',    label: 'View Analytics',    desc: 'Access reports and analytics dashboard', icon: '📊' },
    { key: 'export_data',       label: 'Export Data',       desc: 'Export campaigns, contacts and reports', icon: '📤' },
    { key: 'manage_team',       label: 'Manage Team',       desc: 'Invite and manage team members',         icon: '🛡️' },
];

const AVATAR_COLORS = [
    'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
    'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-indigo-500',
];

// ── Helpers ────────────────────────────────────────────────────
function getAvatarColor(str) {
    let hash = 0;
    for (let i = 0; i < (str || '').length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(firstName, lastName, email) {
    if (firstName || lastName) return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
    return ((email || '')[0] || '?').toUpperCase();
}

function formatDate(value) {
    if (!value) return 'Never';
    try {
        const d = new Date(value);
        const diff = Date.now() - d;
        if (diff < 60000)          return 'Just now';
        if (diff < 3600000)        return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000)       return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 7 * 86400000)   return `${Math.floor(diff / 86400000)}d ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return '-'; }
}

// ── Gradient stat card (same as Dashboard) ─────────────────────
function GradientCard(props) {
    return <KpiTile {...props} />;
}

// ── Role badge ─────────────────────────────────────────────────
function RoleBadge({ role }) {
    const meta = ROLE_META[role] || { label: role, color: 'bg-slate-100 text-slate-600' };
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.color}`}>
            {role === 'SUPER_ADMIN' && <Crown className="w-3 h-3" />}
            {meta.label}
        </span>
    );
}

// ── Avatar ─────────────────────────────────────────────────────
function Avatar({ firstName, lastName, email, size = 'md' }) {
    const initials = getInitials(firstName, lastName, email);
    const color    = getAvatarColor(`${firstName}${lastName}${email}`);
    const sz       = size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm';
    return (
        <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
            {initials}
        </div>
    );
}

// ── Status badge ───────────────────────────────────────────────
function StatusBadge({ status }) {
    if (status === 'ACTIVE')   return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Active
        </span>
    );
    if (status === 'INVITED')  return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700">
            <Mail className="w-3 h-3" />Invite Sent
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Inactive
        </span>
    );
}

// ── Sales hierarchy fields (BRD 5.4): level + "Reports to" ───────────
const LEVEL_LABELS = { 1: 'CEO / COO / Sales Head', 2: 'Business Development', 3: 'Business Executive', 4: 'Market Research' };

function HierarchyFields({ hierarchy, userId, level, managerId, onChange }) {
    const users = hierarchy?.users || [];
    const levels = hierarchy?.levels?.length ? hierarchy.levels : Object.entries(LEVEL_LABELS).map(([k, v]) => ({ level: Number(k), label: v }));
    const candidates = managerCandidates(users, userId, level);
    const selectCls = 'w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-400';
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5" htmlFor="hier-level">Sales level</label>
                <select id="hier-level" className={selectCls} value={level || ''}
                    onChange={e => {
                        const next = e.target.value ? Number(e.target.value) : null;
                        const keep = managerCandidates(users, userId, next).some(u => u.user_id === managerId);
                        onChange(next, keep ? managerId : (managerCandidates(users, userId, next).slice(-1)[0]?.user_id || null));
                    }}>
                    <option value="">Not in sales hierarchy</option>
                    {levels.map(l => <option key={l.level} value={l.level}>L{l.level} · {l.label}</option>)}
                </select>
            </div>
            <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5" htmlFor="hier-manager">Reports to</label>
                <select id="hier-manager" className={selectCls} value={managerId || ''} disabled={!level || level <= 1}
                    onChange={e => onChange(level, e.target.value || null)}>
                    <option value="">{!level || level <= 1 ? 'No manager' : 'Choose a manager'}</option>
                    {candidates.map(m => <option key={m.user_id} value={m.user_id}>{m.name} (L{m.sales_level})</option>)}
                </select>
                {level > 1 && candidates.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">Nobody is at a higher level yet: set up their manager first.</p>
                )}
            </div>
        </div>
    );
}

function HierarchyModal({ user, hierarchy, onClose, onSave, isSaving, error }) {
    const current = (hierarchy?.users || []).find(u => u.user_id === user.user_id);
    const [level, setLevel] = useState(current?.sales_level || null);
    const [managerId, setManagerId] = useState(current?.manager_id || null);
    const problem = hierarchyError(hierarchy?.users || [], user.user_id, level, managerId);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div role="dialog" aria-label="Sales hierarchy" className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                    <div>
                        <h3 className="font-semibold !text-white">Sales hierarchy</h3>
                        <p className="text-xs text-white/70">{user.first_name} {user.last_name} · {user.email}</p>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10"><X className="w-4 h-4" /></button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <p className="text-xs text-gray-500">People in the hierarchy see their own records and their team's. A manager must sit at a higher level, and nobody can report to someone in their own team.</p>
                    {!current ? (
                        <p className="text-sm text-gray-500">This account is not active, so it is not part of the hierarchy.</p>
                    ) : (
                        <HierarchyFields hierarchy={hierarchy} userId={user.user_id} level={level} managerId={managerId}
                            onChange={(l, m) => { setLevel(l); setManagerId(m); }} />
                    )}
                    {(error || (current && problem)) && (
                        <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error || problem}</div>
                    )}
                    <div className="flex items-center gap-3 pt-1">
                        <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
                        <button type="button" disabled={!current || !!problem || isSaving}
                            onClick={() => onSave({ sales_level: level, manager_id: level > 1 ? managerId : null })}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                            {isSaving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Permissions Modal ──────────────────────────────────────────
function PermissionsModal({ user, onClose, onSave, onReset, isSaving, isResetting }) {
    const [draft, setDraft] = useState(new Set(user.permissions || []));
    const hasChanges = JSON.stringify([...draft].sort()) !== JSON.stringify([...(user.permissions || [])].sort());

    const toggle = (key) => {
        setDraft(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">

                {/* Gradient header */}
                <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Avatar firstName={user.first_name} lastName={user.last_name} email={user.email} size="lg" />
                            <div>
                                <h3 className="font-semibold !text-white text-base">
                                    {user.first_name} {user.last_name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <RoleBadge role={user.role} />
                                    <span className="text-xs text-white/70">{user.email}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 flex-shrink-0">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="mt-3 text-xs text-white/75 leading-relaxed">
                        Toggle which features this member can access. Changes override their default role permissions.
                    </p>
                </div>

                {/* Permission toggles */}
                <div className="px-6 py-4 space-y-2 max-h-[360px] overflow-y-auto">
                    {PERMISSION_LIST.map(p => {
                        const enabled = draft.has(p.key);
                        return (
                            <button key={p.key} onClick={() => toggle(p.key)}
                                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                                    enabled ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg leading-none">{p.icon}</span>
                                    <div>
                                        <p className={`text-sm font-semibold ${enabled ? 'text-blue-800' : 'text-slate-700'}`}>{p.label}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                                    </div>
                                </div>
                                <div className={`relative w-10 h-5 rounded-full flex-shrink-0 transition-colors ${enabled ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? 'left-5' : 'left-0.5'}`} />
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button onClick={onReset} disabled={isResetting}
                        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset to defaults
                    </button>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <button disabled={!hasChanges || isSaving}
                            onClick={() => onSave([...draft])}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                        >
                            {isSaving ? 'Saving…' : 'Save Permissions'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function TeamManagement() {
    const queryClient = useQueryClient();
    const currentUser = getStoredUser();
    const currentRole = currentUser?.role || '';
    const tenantLabel = currentUser?.tenant_name || (currentUser?.tenant_id ? 'Workspace' : 'Platform Scope');

    const [search,          setSearch]          = useState('');
    const [statusFilter,    setStatusFilter]    = useState('ALL');
    const [isInviteOpen,    setIsInviteOpen]    = useState(false);
    const [inviteEmail,     setInviteEmail]     = useState('');
    const [inviteRole,      setInviteRole]      = useState('ADMIN');
    const [inviteResult,    setInviteResult]    = useState(null);
    const [roleDrafts,      setRoleDrafts]      = useState({});
    const [permissionsUser, setPermissionsUser] = useState(null);
    const [actionError,     setActionError]     = useState(null);
    const [inviteLevel,     setInviteLevel]     = useState(null);
    const [inviteManager,   setInviteManager]   = useState(null);
    const [hierarchyUser,   setHierarchyUser]   = useState(null);
    const [hierarchyErr,    setHierarchyErr]    = useState(null);

    const canManageUsers  = currentRole === 'SUPER_ADMIN' || currentRole === 'ADMIN';
    const canChangeRole   = currentRole === 'SUPER_ADMIN';
    const canToggleStatus = currentRole === 'SUPER_ADMIN' || currentRole === 'ADMIN';
    const canSetPerms     = currentRole === 'SUPER_ADMIN';

    const usersQuery = useQuery({
        queryKey: ['team-users'],
        queryFn: usersApi.listUsers,
        enabled: canManageUsers,
    });

    const hierarchyQuery = useQuery({
        queryKey: ['hierarchy'],
        queryFn: hierarchyApi.get,
        enabled: canManageUsers,
    });
    const hierarchy = hierarchyQuery.data;
    const hierarchyById = useMemo(
        () => Object.fromEntries((hierarchy?.users || []).map(u => [u.user_id, u])),
        [hierarchy],
    );
    const refreshHierarchy = () => ['hierarchy', 'contact-owners', 'contacts'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));

    const onMutationError = (error) => {
        const msg = error?.response?.data?.detail || error?.message || 'Action failed. Please try again.';
        setActionError(msg);
        setTimeout(() => setActionError(null), 5000);
    };

    const inviteMutation = useMutation({
        // Invite, then place the new account in the sales hierarchy when a level was chosen
        mutationFn: async ({ hierarchy: place, ...payload }) => {
            const data = await usersApi.inviteUser(payload);
            if (place?.sales_level && data?.user_id) {
                try {
                    await hierarchyApi.set(data.user_id, place);
                } catch (err) {
                    data.hierarchyError = err?.response?.data?.detail || 'Could not set the sales level';
                }
            }
            return data;
        },
        onSuccess: (data) => {
            setInviteResult(data);
            setInviteEmail('');
            setInviteRole('ADMIN');
            setInviteLevel(null);
            setInviteManager(null);
            setIsInviteOpen(false);
            if (data?.hierarchyError) onMutationError({ message: `Invitation sent, but the hierarchy was not saved: ${data.hierarchyError}` });
            queryClient.invalidateQueries({ queryKey: ['team-users'] });
            refreshHierarchy();
        },
    });

    const resendMutation = useMutation({
        mutationFn: usersApi.resendInvite,
        onSuccess: (data) => { setInviteResult(data); queryClient.invalidateQueries({ queryKey: ['team-users'] }); },
        onError: onMutationError,
    });

    const hierarchyMutation = useMutation({
        mutationFn: ({ userId, payload }) => hierarchyApi.set(userId, payload),
        onSuccess: () => { setHierarchyUser(null); setHierarchyErr(null); refreshHierarchy(); },
        onError: (error) => setHierarchyErr(error?.response?.data?.detail || error?.message || 'Could not save'),
    });

    const changeRoleMutation    = useMutation({ mutationFn: ({ userId, role }) => usersApi.changeRole(userId, role),        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-users'] }), onError: onMutationError });
    const deactivateMutation    = useMutation({ mutationFn: usersApi.deactivateUser,                                         onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-users'] }), onError: onMutationError });
    const reactivateMutation    = useMutation({ mutationFn: usersApi.reactivateUser,                                         onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-users'] }), onError: onMutationError });
    const permanentDeleteMutation = useMutation({ mutationFn: usersApi.permanentDeleteUser,                                  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-users'] }), onError: onMutationError });
    const updatePermsMutation   = useMutation({ mutationFn: ({ userId, permissions }) => usersApi.updatePermissions(userId, permissions), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['team-users'] }); setPermissionsUser(null); }, onError: onMutationError });
    const resetPermsMutation    = useMutation({ mutationFn: (userId) => usersApi.resetPermissions(userId),                  onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['team-users'] }); setPermissionsUser(null); }, onError: onMutationError });

    const users = usersQuery.data || [];

    const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase();
        return users.filter(u => {
            if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
            if (!q) return true;
            const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
            return name.includes(q) || (u.email || '').toLowerCase().includes(q);
        });
    }, [users, search, statusFilter]);

    const activeUsers   = users.filter(u => u.status === 'ACTIVE').length;
    const invitedUsers  = users.filter(u => u.status === 'INVITED').length;
    const inactiveUsers = users.filter(u => u.status === 'INACTIVE').length;

    const handleInvite = (e) => {
        e.preventDefault();
        inviteMutation.mutate({
            email: inviteEmail.trim(), role: inviteRole,
            hierarchy: inviteLevel ? { sales_level: inviteLevel, manager_id: inviteLevel > 1 ? inviteManager : null } : null,
        });
    };

    const handleRoleSave = (user) => {
        const nextRole = roleDrafts[user.user_id] || user.role;
        if (nextRole === user.role) return;
        changeRoleMutation.mutate({ userId: user.user_id, role: nextRole });
    };

    const copyCredentials = async () => {
        const c = inviteResult?.manual_credentials;
        if (!c) return;
        await navigator.clipboard.writeText(`Email: ${c.email}\nPassword: ${c.password}\nLogin: ${c.magic_login_link}`);
    };

    // ── Access guard ───────────────────────────────────────────
    if (!canManageUsers) {
        return (
            <div className="p-6">
                <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="text-center max-w-sm card-anim">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Access Restricted</h2>
                        <p className="text-gray-500 mt-2 text-sm">Only Super Admins and Admins can access team management.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-5">

            {/* ── Page header ─────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 leading-tight">Team Management</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Manage users, roles and permissions for your workspace</p>
                </div>
                <div className="flex items-center gap-2">
                <Link to="/app/sales-team"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-gray-200 hover:bg-gray-50">
                    <Network className="w-4 h-4" />
                    Team tree
                </Link>
                <button
                    onClick={() => setIsInviteOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                    style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                >
                    <UserPlus className="w-4 h-4" />
                    Invite Member
                </button>
                </div>
            </div>

            {/* ── Error banner ────────────────────────────────── */}
            {actionError && (
                <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-700">
                    <span className="flex-1">{actionError}</span>
                    <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-2xl text-sm text-blue-800">
                <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Super Admin roles are locked and cannot be changed.</span>
            </div>

            {/* ── Gradient stat cards ──────────────────────────── */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <GradientCard
                    label="Total Members" value={users.length}
                    sub="across all roles"
                    from="#2d6bbf" to="#1f56aa" chart="bar"
                    trend={users.length > 1} animDelay="0ms"
                />
                <GradientCard
                    label="Active Members" value={activeUsers}
                    sub="currently active"
                    from="#F5F1DC" to="#e8e3c0" dark chart="wave"
                    trend={activeUsers > 0} animDelay="80ms"
                />
                <GradientCard
                    label="Invites Pending" value={invitedUsers}
                    sub="awaiting acceptance"
                    from="#FF9013" to="#cc6f00" chart="bar"
                    trend={invitedUsers === 0} animDelay="160ms"
                />
                <GradientCard
                    label="Inactive" value={inactiveUsers}
                    sub="deactivated accounts"
                    from="#73C8D2" to="#4db0bb" chart="wave"
                    trend={inactiveUsers === 0} animDelay="240ms"
                />
            </div>

            {/* ── Invite result banner ─────────────────────────── */}
            {inviteResult && (
                <div className={`rounded-2xl p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-3 card-anim ${
                    inviteResult?.email_delivery?.sent
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-amber-50 border border-amber-200'
                }`}>
                    <div className="flex items-start gap-3">
                        <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${inviteResult?.email_delivery?.sent ? 'text-emerald-600' : 'text-amber-600'}`} />
                        <div>
                            {inviteResult?.email_delivery?.sent ? (
                                <>
                                    <p className="font-semibold text-emerald-800 text-sm">Invitation sent to {inviteResult.email}</p>
                                    <p className="text-xs text-emerald-700 mt-0.5">Expires: {formatDate(inviteResult.expires_at)}</p>
                                </>
                            ) : (
                                <>
                                    <p className="font-semibold text-amber-800 text-sm">Account created — email delivery failed</p>
                                    <p className="text-xs text-amber-700 mt-0.5">Share credentials manually with {inviteResult.email}</p>
                                    {inviteResult?.manual_credentials?.password && (
                                        <p className="text-xs text-amber-800 mt-1 font-mono bg-amber-100 px-2 py-1 rounded-md inline-block">
                                            Password: {inviteResult.manual_credentials.password}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {inviteResult?.manual_credentials && (
                            <button onClick={copyCredentials}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg">
                                <Copy className="w-3.5 h-3.5" /> Copy Credentials
                            </button>
                        )}
                        <button onClick={() => setInviteResult(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/60">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Members table ────────────────────────────────── */}
            <div className="card-anim bg-white/80 rounded-2xl shadow-sm overflow-hidden" style={{ animationDelay: '320ms' }}>

                {/* Toolbar */}
                <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}>
                            <Users className="w-3.5 h-3.5" style={{ color: '#2d6bbf' }} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-800">Team Members</p>
                            <p className="text-xs text-gray-400">{filteredUsers.length} member{filteredUsers.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search members…"
                                className="pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-52"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none text-gray-700"
                        >
                            <option value="ALL">All Status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INVITED">Invited</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                    </div>
                </div>

                {usersQuery.isLoading ? (
                    <Loading text="Loading team members..." size="md" />
                ) : usersQuery.isError ? (
                    <div className="py-16 text-center">
                        <p className="text-sm text-rose-600">{usersQuery.error?.response?.data?.detail || 'Failed to load users'}</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf18, #73C8D218)' }}>
                            <Users className="w-6 h-6" style={{ color: '#2d6bbf' }} />
                        </div>
                        <p className="text-sm font-medium text-gray-500">No members found</p>
                        <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filter</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Member</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reports to</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Active</th>
                                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((u, i) => {
                                    const isSelf    = currentUser?.user_id === u.user_id;
                                    const isSuperAdmin = u.role === 'SUPER_ADMIN';
                                    const roleDraft = roleDrafts[u.user_id] || u.role;
                                    const canEdit   = canChangeRole && !isSelf && !isSuperAdmin;
                                    const canToggle = canToggleStatus && !isSelf && !isSuperAdmin && !(currentRole === 'ADMIN' && u.role === 'ADMIN');
                                    const canDelete = currentRole === 'SUPER_ADMIN' && !isSelf && !isSuperAdmin && u.status === 'INACTIVE';
                                    const isInvited = u.status === 'INVITED';
                                    const canResend = isInvited && !(currentRole !== 'SUPER_ADMIN' && isSuperAdmin);
                                    const place = hierarchyById[u.user_id];
                                    const boss = place?.manager_id ? hierarchyById[place.manager_id] : null;

                                    return (
                                        <tr key={u.user_id}
                                            className={`transition-colors hover:bg-blue-50/30 border-b border-gray-100 last:border-0 ${u.status === 'INACTIVE' ? 'opacity-50' : ''} ${i % 2 !== 0 ? 'bg-gray-50/30' : ''}`}
                                        >
                                            {/* Member */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar firstName={u.first_name} lastName={u.last_name} email={u.email} />
                                                    <div>
                                                        <p className="font-semibold text-gray-800 text-sm leading-tight">
                                                            {u.first_name} {u.last_name}
                                                            {isSelf && <span className="ml-1.5 text-xs text-gray-400 font-normal">(you)</span>}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                                            <Mail className="w-3 h-3 flex-shrink-0" />{u.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role */}
                                            <td className="px-4 py-4">
                                                {canEdit ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="relative">
                                                            <select
                                                                value={roleDraft}
                                                                onChange={e => setRoleDrafts(p => ({ ...p, [u.user_id]: e.target.value }))}
                                                                className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer"
                                                            >
                                                                {[
                                                                    ...(currentRole === 'SUPER_ADMIN' ? [{ value: 'SUPER_ADMIN', label: 'Super Admin' }] : []),
                                                                    { value: 'ADMIN',   label: 'Admin'   },
                                                                    { value: 'MANAGER', label: 'Manager' },
                                                                ].map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                                            </select>
                                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                                                        </div>
                                                        {roleDraft !== u.role && (
                                                            <button onClick={() => handleRoleSave(u)} disabled={changeRoleMutation.isPending}
                                                                className="px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
                                                                style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                                                                Save
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <RoleBadge role={u.role} />
                                                )}
                                            </td>

                                            {/* Sales hierarchy */}
                                            <td className="px-4 py-4 text-xs">
                                                {place?.sales_level ? (
                                                    <div>
                                                        <span className="inline-block px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700">L{place.sales_level} · {place.level_label}</span>
                                                        <p className="text-gray-500 mt-1">{boss ? `Reports to ${boss.name}` : 'Top of hierarchy'}</p>
                                                    </div>
                                                ) : <span className="text-gray-300">—</span>}
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-4">
                                                <StatusBadge status={u.status} />
                                            </td>

                                            {/* Last active */}
                                            <td className="px-4 py-4 text-xs text-gray-500">{formatDate(u.last_login_at)}</td>

                                            {/* Actions */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                                    {canSetPerms && !isSelf && !isSuperAdmin && (
                                                        <button onClick={() => setPermissionsUser(u)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors">
                                                            <Settings2 className="w-3.5 h-3.5" />Permissions
                                                        </button>
                                                    )}
                                                    {canResend && (
                                                        <button onClick={() => resendMutation.mutate(u.user_id)}
                                                            disabled={resendMutation.isPending && resendMutation.variables === u.user_id}
                                                            title="Send a new sign-in link and temporary password"
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50">
                                                            <Send className="w-3.5 h-3.5" />Resend invite
                                                        </button>
                                                    )}
                                                    {place && (
                                                        <button onClick={() => { setHierarchyErr(null); setHierarchyUser(u); }}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                                                            <Network className="w-3.5 h-3.5" />Hierarchy
                                                        </button>
                                                    )}
                                                    {canToggle && (u.status === 'ACTIVE' || isInvited) && (
                                                        <button onClick={() => deactivateMutation.mutate(u.user_id)} disabled={deactivateMutation.isPending}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors disabled:opacity-50">
                                                            <UserX className="w-3.5 h-3.5" />{isInvited ? 'Revoke' : 'Deactivate'}
                                                        </button>
                                                    )}
                                                    {canToggle && u.status === 'INACTIVE' && (
                                                        <button onClick={() => reactivateMutation.mutate(u.user_id)} disabled={reactivateMutation.isPending}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50">
                                                            <UserCheck className="w-3.5 h-3.5" />Reactivate
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => { if (window.confirm(`Permanently delete ${u.email}? This cannot be undone.`)) permanentDeleteMutation.mutate(u.user_id); }}
                                                            disabled={permanentDeleteMutation.isPending}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors disabled:opacity-50">
                                                            <Trash2 className="w-3.5 h-3.5" />Delete
                                                        </button>
                                                    )}
                                                    {!canToggle && !canEdit && !canSetPerms && !canDelete && !canResend && !place && (
                                                        <span className="text-xs text-gray-300">—</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Invite Modal ─────────────────────────────────── */}
            {isInviteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsInviteOpen(false)} />
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

                        {/* Gradient header */}
                        <div className="px-6 py-5 flex items-center justify-between"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                                    <UserPlus className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold !text-white">Invite Team Member</h3>
                                    <p className="text-xs text-white/70">They'll receive login credentials via email</p>
                                </div>
                            </div>
                            <button onClick={() => setIsInviteOpen(false)} className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleInvite} className="px-6 py-5 space-y-5">
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1.5">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="email" required
                                        value={inviteEmail}
                                        onChange={e => setInviteEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                                        placeholder="colleague@company.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-2">Role</label>
                                <div className="space-y-2">
                                    {INVITE_ROLES.filter(r => !r.superAdminOnly || currentRole === 'SUPER_ADMIN').map(r => (
                                        <label key={r.value}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                                                inviteRole === r.value
                                                    ? r.value === 'SUPER_ADMIN' ? 'border-violet-400 bg-violet-50' : 'border-blue-400 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <input type="radio" name="role" value={r.value}
                                                checked={inviteRole === r.value}
                                                onChange={() => setInviteRole(r.value)}
                                                className={r.value === 'SUPER_ADMIN' ? 'accent-violet-600' : 'accent-blue-600'}
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                                                    {r.value === 'SUPER_ADMIN' && <Crown className="w-3.5 h-3.5 text-violet-600" />}
                                                    {r.label}
                                                </p>
                                                <p className="text-xs text-gray-500">{r.desc}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Sales hierarchy <span className="text-xs font-normal text-gray-400">(optional)</span></p>
                                <HierarchyFields hierarchy={hierarchy} userId={null} level={inviteLevel} managerId={inviteManager}
                                    onChange={(l, m) => { setInviteLevel(l); setInviteManager(m); }} />
                            </div>

                            {inviteMutation.isError && (
                                <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
                                    {inviteMutation.error?.response?.data?.detail || 'Failed to invite user. Please try again.'}
                                </div>
                            )}

                            <div className="flex items-center gap-3 pt-1">
                                <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsInviteOpen(false)}>
                                    Cancel
                                </Button>
                                <button type="submit" disabled={inviteMutation.isPending || !!hierarchyError(hierarchy?.users || [], null, inviteLevel, inviteManager)}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
                                    style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                                    <UserPlus className="w-4 h-4" />
                                    {inviteMutation.isPending ? 'Sending…' : 'Send Invite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Sales hierarchy Modal ────────────────────────── */}
            {hierarchyUser && (
                <HierarchyModal
                    user={hierarchyUser}
                    hierarchy={hierarchy}
                    onClose={() => setHierarchyUser(null)}
                    onSave={payload => hierarchyMutation.mutate({ userId: hierarchyUser.user_id, payload })}
                    isSaving={hierarchyMutation.isPending}
                    error={hierarchyErr}
                />
            )}

            {/* ── Permissions Modal ────────────────────────────── */}
            {permissionsUser && (
                <PermissionsModal
                    user={permissionsUser}
                    onClose={() => setPermissionsUser(null)}
                    onSave={permissions => updatePermsMutation.mutate({ userId: permissionsUser.user_id, permissions })}
                    onReset={() => resetPermsMutation.mutate(permissionsUser.user_id)}
                    isSaving={updatePermsMutation.isPending}
                    isResetting={resetPermsMutation.isPending}
                />
            )}
        </div>
    );
}

