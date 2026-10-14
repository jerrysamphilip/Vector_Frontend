import Header from '../components/layout/Header';
import Loading from '../components/common/Loading';
import { useDashboard } from '../components/dashboard/useDashboard';
import AlertCenter from '../components/dashboard/AlertCenter';
import EngagementChartCard from '../components/dashboard/EngagementChartCard';
import CampaignStatusDonut from '../components/dashboard/CampaignStatusDonut';
import StatTilesRow from '../components/dashboard/StatTilesRow';
import RateCardsRow from '../components/dashboard/RateCardsRow';
import RecentActivity from '../components/dashboard/RecentActivity';
import CampaignStatusTable from '../components/dashboard/CampaignStatusTable';

// Dashboard (/app): outreach chart, campaign status, totals and rates, recent activity, top campaigns
// and the alert center in the header. Data/state: useDashboard; widgets: components/dashboard/.
export default function Dashboard() {
    const dashboard = useDashboard();

    if (dashboard.isLoading) return <Loading text="Loading dashboard..." size="lg" fullScreen />;

    return (
        <div className="space-y-6">
            <Header
                actionSlot={
                    <AlertCenter dashboard={dashboard} />
                }
            />

            {/* ── Row 1: Main Chart + Sidebar ────────────────────────────── */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2.1fr)_minmax(320px,1fr)] xl:items-stretch">

                {/* Left — Chart card */}
                <EngagementChartCard dashboard={dashboard} />

                {/* Right — Sidebar */}
                <div className="min-w-0">
                    <CampaignStatusDonut dashboard={dashboard} />
                </div>
            </div>

            {/* ── Row 2: 5 Mini Stat Cards ───────────────────────────────── */}
            <StatTilesRow dashboard={dashboard} />

            {/* ── Row 3: 5 Gradient Cards ────────────────────────────────── */}
            <RateCardsRow dashboard={dashboard} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Recent Activity */}
                <RecentActivity dashboard={dashboard} />

                {/* Campaigns Table — xl: 2/3 */}
                <CampaignStatusTable dashboard={dashboard} />
            </div>
        </div>
    );
}
