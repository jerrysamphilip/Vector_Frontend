import { Link } from 'react-router-dom';
import { Network, Shield, UserPlus, X } from 'lucide-react';
import { useTeamManagement } from '../components/team/useTeamManagement';
import { GradientCard } from '../components/team/teamShared';
import InviteResultBanner from '../components/team/InviteResultBanner';
import TeamMembersTable from '../components/team/TeamMembersTable';
import InviteMemberModal from '../components/team/InviteMemberModal';
import HierarchyModal from '../components/team/HierarchyModal';
import PermissionsModal from '../components/team/PermissionsModal';

// Team Management (/app/team): workspace members, invitations, roles, status, permissions and sales hierarchy.
// State and actions: useTeamManagement; table, rows and dialogs: components/team/.
export default function TeamManagement() {
    const team = useTeamManagement();
    const {
        canManageUsers, setIsInviteOpen, actionError, setActionError, users, activeUsers, invitedUsers, inactiveUsers,
        inviteResult, isInviteOpen, hierarchyUser, setHierarchyUser, hierarchy, hierarchyMutation, hierarchyErr,
        permissionsUser, setPermissionsUser, updatePermsMutation, resetPermsMutation,
    } = team;


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
                <InviteResultBanner team={team} />
            )}

            {/* ── Members table ────────────────────────────────── */}
            <TeamMembersTable team={team} />

            {/* ── Invite Modal ─────────────────────────────────── */}
            {isInviteOpen && (
                <InviteMemberModal team={team} />
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

