import { GradientKpi } from './shared';

// Warm-up KPI tiles: accounts, warm-up active, planned / sent today, issues.
export default function WarmupKpiRow({ accounts }) {
    const {
        overview
    } = accounts;
    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            <GradientKpi label="Accounts"      value={overview.total_accounts}
                from="#0046FF" to="#73C8D2" chart="bar" animDelay="0ms"
                sub={`${overview.warmup_enabled} with warmup`}/>
            <GradientKpi label="Warmup Active"  value={overview.warmup_enabled}
                from="#FF9013" to="#FFB84D" chart="wave" animDelay="60ms"
                sub="sending warmup today"/>
            <GradientKpi label="Planned Today"  value={overview.planned_today}
                from="#0046FF" to="#4B8BFF" chart="bar" animDelay="120ms"
                sub="emails scheduled"/>
            <GradientKpi label="Sent Today"     value={overview.warmup_sent_today}
                from="#73C8D2" to="#A8E6CF" dark chart="wave" animDelay="180ms"
                sub={`${overview.warmup_replied_today} replies`}/>
            <GradientKpi label="Issues"         value={overview.accounts_with_issues}
                from={overview.accounts_with_issues ? '#ef4444' : '#10b981'}
                to={overview.accounts_with_issues ? '#f87171' : '#34d399'}
                chart="bar" animDelay="240ms"
                sub={overview.accounts_with_issues ? 'need attention' : 'all healthy'}/>
        </div>
    );
}
