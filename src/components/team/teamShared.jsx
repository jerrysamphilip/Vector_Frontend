import { parseApiDate } from '../../lib/dates';
import { Mail, Crown } from 'lucide-react';
import KpiTile from '../ui/KpiTile';

// Team management (pages/TeamManagement.jsx): roles, permissions, avatar helpers and badges.

// ── Constants ──────────────────────────────────────────────────
export const ROLE_META = {
    PLATFORM_ADMIN: { label: 'Platform Admin', color: 'bg-indigo-100 text-indigo-700' },
    SUPER_ADMIN:    { label: 'Super Admin',    color: 'bg-violet-100 text-violet-700' },
    ADMIN:          { label: 'Admin',          color: 'bg-blue-100 text-blue-700'     },
    MANAGER:        { label: 'Manager',        color: 'bg-emerald-100 text-emerald-700' },
    AGENT:          { label: 'Agent',          color: 'bg-slate-100 text-slate-700'   },
};

export const INVITE_ROLES = [
    { value: 'SUPER_ADMIN', label: 'Super Admin', desc: 'Full access — same as you. Can manage everything including users.', superAdminOnly: true },
    { value: 'ADMIN',       label: 'Admin',       desc: 'Can manage team members and all campaigns' },
    { value: 'MANAGER',     label: 'Manager',     desc: 'Can run campaigns but cannot manage users' },
    { value: 'AGENT',       label: 'Agent',        desc: 'Sales rep — can use assigned campaigns and inboxes' },
];

export const PERMISSION_LIST = [
    { key: 'manage_campaigns',  label: 'Manage Campaigns',  desc: 'Create, edit and delete campaigns',      icon: '📧' },
    { key: 'manage_templates',  label: 'Manage Templates',  desc: 'Create and edit email templates',        icon: '📝' },
    { key: 'manage_inboxes',    label: 'Manage Inboxes',    desc: 'Connect and configure email inboxes',    icon: '📬' },
    { key: 'manage_prospects',  label: 'Manage Prospects',  desc: 'Import and manage prospect lists',       icon: '👥' },
    { key: 'view_analytics',    label: 'View Analytics',    desc: 'Access reports and analytics dashboard', icon: '📊' },
    { key: 'export_data',       label: 'Export Data',       desc: 'Export campaigns, contacts and reports', icon: '📤' },
    { key: 'manage_team',       label: 'Manage Team',       desc: 'Invite and manage team members',         icon: '🛡️' },
];

export const AVATAR_COLORS = [
    'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
    'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-indigo-500',
];

// ── Helpers ────────────────────────────────────────────────────
export function getAvatarColor(str) {
    let hash = 0;
    for (let i = 0; i < (str || '').length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getInitials(firstName, lastName, email) {
    if (firstName || lastName) return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
    return ((email || '')[0] || '?').toUpperCase();
}

export function formatDate(value) {
    if (!value) return 'Never';
    try {
        const d = parseApiDate(value);
        if (!d) return '-';
        const diff = Date.now() - d;
        if (diff < 60000)          return 'Just now';
        if (diff < 3600000)        return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000)       return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 7 * 86400000)   return `${Math.floor(diff / 86400000)}d ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return '-'; }
}

// ── Gradient stat card (same as Dashboard) ─────────────────────
export function GradientCard(props) {
    return <KpiTile {...props} />;
}

// ── Role badge ─────────────────────────────────────────────────
export function RoleBadge({ role }) {
    const meta = ROLE_META[role] || { label: role, color: 'bg-slate-100 text-slate-600' };
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.color}`}>
            {role === 'SUPER_ADMIN' && <Crown className="w-3 h-3" />}
            {meta.label}
        </span>
    );
}

// ── Avatar ─────────────────────────────────────────────────────
export function Avatar({ firstName, lastName, email, size = 'md' }) {
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
export function StatusBadge({ status }) {
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
