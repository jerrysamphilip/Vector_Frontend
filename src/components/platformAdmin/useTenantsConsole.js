import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformAdminApi } from '../../api/platformAdmin';

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

    return {
        dashboard, queryClient, search, setSearch, selectedTenant, setSelectedTenant, showCreateModal, setShowCreateModal,
        stats, statsLoading, tenants, tenantsLoading, statusMutation, changeStatus, summary,
    };
}
