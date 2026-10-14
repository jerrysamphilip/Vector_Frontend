import PlatformUsers from '../components/platformAdmin/PlatformUsers';
import TenantsConsole from '../components/platformAdmin/TenantsConsole';

/**
 * Platform admin console. view: 'dashboard' (/admin: stats, scheduler, tenant roster),
 * 'tenants' (/admin/tenants: the tenant list), 'users' (/admin/users: every tenant user).
 * Sections and dialogs live in components/platformAdmin/.
 */
export default function PlatformAdmin({ view = 'dashboard' }) {
    if (view === 'users') return <PlatformUsers />;
    return <TenantsConsole dashboard={view !== 'tenants'} />;
}
