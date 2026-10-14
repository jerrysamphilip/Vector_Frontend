import { GradientCard } from './dashboardWidgets';

// Dashboard: open / reply / bounce / unsubscribe rates and the campaign count.
export default function RateCardsRow({ dashboard }) {
    const {
        bounceRate, openRate, replyRate, statusCounts, unsubscribeRate
    } = dashboard;
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <GradientCard label="Open Rate"        value={`${openRate}%`}        sub="Of total sent"                   from="#2d6bbf" to="#1f56aa" dark={false} chart="bar"  trend={parseFloat(openRate) >= 20}         animDelay="480ms" />
            <GradientCard label="Reply Rate"       value={`${replyRate}%`}       sub="Of total sent"                   from="#F5F1DC" to="#e8e3c0" dark={true}  chart="wave" trend={parseFloat(replyRate) >= 5}        animDelay="560ms" />
            <GradientCard label="Campaigns"        value={statusCounts.total}    sub={`${statusCounts.active} active`} from="#FF9013" to="#cc6f00" dark={false} chart="wave" trend={statusCounts.active > 0}          animDelay="640ms" />
            <GradientCard label="Bounce Rate"      value={`${bounceRate}%`}      sub="Of total sent"                   from="#73C8D2" to="#4db0bb" dark={false} chart="bar"  trend={parseFloat(bounceRate) < 5}        animDelay="720ms" />
            <GradientCard label="Unsubscribe Rate" value={`${unsubscribeRate}%`} sub="Of total sent"                   from="#a5406b" to="#832f54" dark={false} chart="bar"  trend={parseFloat(unsubscribeRate) < 2}   animDelay="800ms" />
        </div>
    );
}
