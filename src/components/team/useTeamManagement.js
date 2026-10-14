import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import usersApi from '../../api/users';
import { hierarchyApi } from '../../api/sales';
import { getStoredUser } from '../../lib/authStorage';

// State, queries and actions of the Team page: members (search / status filter), invitations (with an
// optional sales-hierarchy placement), role / status / permission changes and the hierarchy dialog.
export function useTeamManagement() {
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

    return {
        currentUser, currentRole, tenantLabel,
        search, setSearch, statusFilter, setStatusFilter, isInviteOpen, setIsInviteOpen,
        inviteEmail, setInviteEmail, inviteRole, setInviteRole, inviteResult, setInviteResult,
        roleDrafts, setRoleDrafts, permissionsUser, setPermissionsUser, actionError, setActionError,
        inviteLevel, setInviteLevel, inviteManager, setInviteManager, hierarchyUser, setHierarchyUser,
        hierarchyErr, setHierarchyErr,
        canManageUsers, canChangeRole, canToggleStatus, canSetPerms,
        usersQuery, hierarchy, hierarchyById,
        inviteMutation, resendMutation, hierarchyMutation, changeRoleMutation, deactivateMutation,
        reactivateMutation, permanentDeleteMutation, updatePermsMutation, resetPermsMutation,
        users, filteredUsers, activeUsers, invitedUsers, inactiveUsers,
        handleInvite, handleRoleSave, copyCredentials,
    };
}
