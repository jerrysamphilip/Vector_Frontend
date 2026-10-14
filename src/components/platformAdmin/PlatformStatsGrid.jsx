import { GradientCard } from './adminShared';

// Platform KPI tiles: tenants, users, campaigns, suspended tenants.
export default function PlatformStatsGrid({ admin }) {
    const {
        stats, statsLoading, summary
    } = admin;
    return (
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
    );
}
