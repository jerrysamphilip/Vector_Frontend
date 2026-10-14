import { ChevronDown, Mail, Network, Send, Settings2, Trash2, UserCheck, UserX } from 'lucide-react';
import { RoleBadge, Avatar, StatusBadge, formatDate } from './teamShared';

// One team member: avatar, role (editable by super admins), reports-to, status, last active and actions.
export default function TeamMemberRow({ u, i, team }) {
    const {
        canChangeRole, canSetPerms, canToggleStatus, changeRoleMutation, currentRole, currentUser,
        deactivateMutation, handleRoleSave, hierarchyById, permanentDeleteMutation, reactivateMutation,
        resendMutation, roleDrafts, setHierarchyErr, setHierarchyUser, setPermissionsUser, setRoleDrafts
    } = team;
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
        <tr
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
}
