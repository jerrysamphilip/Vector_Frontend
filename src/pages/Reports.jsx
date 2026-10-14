import { Mail, Eye, MessageSquare, AlertTriangle, Zap } from 'lucide-react';
import { useReportsDashboard } from '../components/reports/useReportsDashboard';
import ReportsHeader from '../components/reports/ReportsHeader';
import { GradientCard, StatCard } from '../components/reports/reportWidgets';
import EngagementChart from '../components/reports/EngagementChart';
import { CampaignDonut, LeadDonut } from '../components/reports/ReportDonuts';
import OptimizationRow from '../components/reports/OptimizationRow';
import { MailboxStatsCard, ProviderTable } from '../components/reports/ProviderStats';
import TopCampaignsTable from '../components/reports/TopCampaignsTable';
import MailboxHealthTable from '../components/reports/MailboxHealthTable';
import TeamPerformanceTable from '../components/reports/TeamPerformanceTable';

// Analytics & Reports (/app/reports): outreach KPIs, engagement over time, campaign / lead / provider /
// mailbox breakdowns and team performance for a date range, optionally for one user.
// Data: useReportsDashboard; widgets: components/reports/.
export default function Reports() {
    const report = useReportsDashboard();
    const {
        error, loading, kpis, timeseries, leadStats, campaignStats, mailboxStats, providers, mailboxHealth,
        topCampaigns, optimization, selectedUserId, cachedTeamMembers, openRate, replyRate, bounceRate,
        handleExportCampaign, exportingCampaign, handleExportDeliverability, exportingDeliverability,
    } = report;

    return (
        <div className="p-6 space-y-5">

            {/* ── Header ─────────────────────────────────── */}
            <ReportsHeader report={report} />

            {error && (
                <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-100 rounded-2xl text-sm text-orange-800">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-orange-500" />
                    <span>Could not load reports — showing last available data. <strong>{error.message}</strong></span>
                </div>
            )}

            {/* ── Row 1: Gradient KPI cards ──────────────── */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <GradientCard
                    label="Open Rate" value={loading ? '—' : `${openRate}%`}
                    sub={`${kpis.total_opened ?? 0} emails opened`}
                    from="#2d6bbf" to="#1f56aa" dark={false} chart="bar"
                    trend={openRate >= 20} animDelay="0ms"
                />
                <GradientCard
                    label="Reply Rate" value={loading ? '—' : `${replyRate}%`}
                    sub={`${kpis.total_replied ?? 0} replies received`}
                    from="#F5F1DC" to="#e8e3c0" dark={true} chart="wave"
                    trend={replyRate >= 5} animDelay="80ms"
                />
                <GradientCard
                    label="Emails Sent" value={loading ? '—' : (kpis.total_emails_sent ?? 0).toLocaleString()}
                    sub={`${kpis.total_leads_contacted ?? 0} leads contacted`}
                    from="#FF9013" to="#cc6f00" dark={false} chart="bar"
                    trend={(kpis.total_emails_sent ?? 0) > 0} animDelay="160ms"
                />
                <GradientCard
                    label="Bounce Rate" value={loading ? '—' : `${bounceRate}%`}
                    sub={`${kpis.total_bounced ?? 0} bounced`}
                    from="#73C8D2" to="#4db0bb" dark={false} chart="wave"
                    trend={bounceRate < 5} animDelay="240ms"
                />
            </div>

            {/* ── Row 2: Area chart + Campaign donut ─────── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2">
                    <EngagementChart timeseries={timeseries} loading={loading} kpis={kpis} />
                </div>
                <CampaignDonut stats={campaignStats} loading={loading} />
            </div>

            {/* ── Row 3: Mini stat cards ──────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                <StatCard icon={Mail}          label="Total Sent"    value={kpis.total_emails_sent}
                    sub={`${kpis.total_leads_contacted ?? 0} leads`}
                    iconBg="bg-blue-50"    iconColor="text-blue-600"   loading={loading} animDelay="300ms" />
                <StatCard icon={Eye}           label="Opened"        value={kpis.total_opened}
                    sub={`${openRate}% open rate`}
                    iconBg="bg-cyan-50"    iconColor="text-cyan-600"   loading={loading} animDelay="340ms" />
                <StatCard icon={MessageSquare} label="Replied"       value={kpis.total_replied}
                    sub={`${replyRate}% reply rate`}
                    iconBg="bg-emerald-50" iconColor="text-emerald-600" loading={loading} animDelay="380ms" />
                <StatCard icon={Zap}           label="Clicked"       value={kpis.total_clicked ?? 0}
                    sub="Link clicks tracked"
                    iconBg="bg-orange-50"  iconColor="text-orange-500" loading={loading} animDelay="420ms" />
                <StatCard icon={AlertTriangle} label="Bounced"       value={kpis.total_bounced}
                    sub={`${bounceRate}% bounce rate`}
                    iconBg="bg-red-50"     iconColor="text-red-500"    loading={loading} animDelay="460ms" />
            </div>

            {/* ── Row 4: Optimization + Lead donut ───────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <OptimizationRow optimization={optimization} loading={loading} />
                <LeadDonut leadStats={leadStats} loading={loading} />
            </div>

            {/* ── Row 5: Provider + Mailbox stats ────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                <div className="xl:col-span-3">
                    <ProviderTable providers={providers} loading={loading} />
                </div>
                <MailboxStatsCard stats={mailboxStats} loading={loading} />
            </div>

            {/* ── Row 6: Top campaigns ────────────────────── */}
            <TopCampaignsTable
                campaigns={topCampaigns} loading={loading}
                onExport={handleExportCampaign} exporting={exportingCampaign}
            />

            {/* ── Row 7: Mailbox health ───────────────────── */}
            <MailboxHealthTable
                mailboxHealth={mailboxHealth} loading={loading}
                onExport={handleExportDeliverability} exporting={exportingDeliverability}
            />

            {/* ── Row 8: Team Performance (org-wide only) ─── */}
            {!selectedUserId && cachedTeamMembers.length > 0 && (
                <TeamPerformanceTable users={cachedTeamMembers} loading={loading} />
            )}

        </div>
    );
}
