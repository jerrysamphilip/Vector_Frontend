import { useTenantsConsole } from './useTenantsConsole';
import { ErrorBanner, errDetail } from './adminShared';
import TenantsConsoleHeader from './TenantsConsoleHeader';
import PlatformStatsGrid from './PlatformStatsGrid';
import SchedulerCard from './SchedulerCard';
import TenantRosterCard from './TenantRosterCard';
import TenantDetailModal from './TenantDetailModal';
import CreateTenantModal from './CreateTenantModal';

// Tenants console: /admin (dashboard: stats, scheduler and the roster) and /admin/tenants (roster only).
export default function TenantsConsole({ dashboard }) {
    const admin = useTenantsConsole({ dashboard });
    const { queryClient, selectedTenant, setSelectedTenant, showCreateModal, setShowCreateModal, statusMutation } = admin;

    return (
        <div className="mx-auto max-w-[1480px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
            <TenantsConsoleHeader admin={admin} />

            {dashboard && (<>
            <PlatformStatsGrid admin={admin} />

            <SchedulerCard />
            </>)}

            <ErrorBanner message={statusMutation.isError ? errDetail(statusMutation.error, 'Could not change the tenant status.') : ''} />

            <div className="grid gap-6">
                <TenantRosterCard admin={admin} />
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
