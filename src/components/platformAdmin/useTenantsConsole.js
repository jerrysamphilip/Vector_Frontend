import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformAdminApi } from '../../api/platformAdmin';
import { useConfirm } from '../ui/ConfirmDialog';
import { useApiQuery } from '../../lib/useApiQuery';

// State and actions of the tenants console: platform stats (dashboard view), tenant search, tenant
// suspend / reactivate (confirmed), the tenant detail and create-tenant dialogs.
export function useTenantsConsole({ dashboard }) {
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

    const { data: tenants, isLoading: tenantsLoading, error: tenantsError, refetch: refetchTenants } = useApiQuery(
        ['admin-tenants', search], () => platformAdminApi.listTenants(search ? { search } : {}), { staleTime: 30_000 });
    const confirm = useConfirm();

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
    const changeStatus = async (tenant, status) => {
        const suspend = status === 'SUSPENDED';
        const ok = await confirm(suspend
            ? { title: `Suspend "${tenant.tenant_name}"?`, message: 'Its users lose access immediately and cannot sign in until the tenant is reactivated.', confirmLabel: 'Suspend', danger: true }
            : { title: `Reactivate "${tenant.tenant_name}"?`, message: 'Its users can sign in and use the workspace again.', confirmLabel: 'Reactivate' });
        if (ok) statusMutation.mutate({ tenantId: tenant.tenant_id, status });
    };

    const summary = useMemo(() => ({
        activeTenants: stats?.active_tenants ?? 0,
        activeUsers: stats?.active_users ?? 0,
        totalCampaigns: stats?.total_campaigns ?? 0,
        suspendedTenants: stats?.suspended_tenants ?? 0,
    }), [stats]);

    return {
        dashboard, queryClient, search, setSearch, selectedTenant, setSelectedTenant, showCreateModal, setShowCreateModal,
        stats, statsLoading, tenants, tenantsLoading, tenantsError, refetchTenants, statusMutation, changeStatus, summary,
    };
}
