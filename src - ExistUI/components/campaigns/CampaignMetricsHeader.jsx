import React from 'react';

const MetricItem = ({ label, value, valueColor = "text-slate-900", isLast }) => (
    <div className="flex items-baseline gap-2.5">
        <span className="text-sm font-medium text-slate-500">{label}:</span>
        <span className={`text-lg font-bold ${valueColor}`}>{value}</span>
        {!isLast && <span className="text-slate-300 mx-1.5">•</span>}
    </div>
);

export default function CampaignMetricsHeader({ campaigns = [] }) {
    const activeInfo = campaigns.filter(c => c.status === 'ACTIVE').length;

    // Calculate aggregate volume and rates
    const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
    const totalOpened = campaigns.reduce((acc, c) => acc + (c.opened_count || 0), 0);
    const totalReplied = campaigns.reduce((acc, c) => acc + (c.replied_count || 0), 0);

    const avgOpenRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "—";
    const avgReplyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : "—";

    const formattedOpen = avgOpenRate !== "—" ? `${avgOpenRate}%` : "—";
    const formattedReply = avgReplyRate !== "—" ? `${avgReplyRate}%` : "—";

    // Color Logic
    const activeColor = activeInfo > 0 ? "text-emerald-600" : "text-slate-600";
    const openColor = parseFloat(avgOpenRate) > 30 ? "text-emerald-600" : parseFloat(avgOpenRate) > 0 ? "text-blue-600" : "text-slate-600";
    const replyColor = parseFloat(avgReplyRate) > 10 ? "text-emerald-600" : parseFloat(avgReplyRate) > 0 ? "text-blue-600" : "text-slate-600";

    return (
        <div className="flex items-center gap-2">
            <MetricItem
                label="Active"
                value={activeInfo}
                valueColor={activeColor}
            />
            <MetricItem
                label="Today"
                value={`${totalSent} sent`}
            />
            <MetricItem
                label="Open"
                value={formattedOpen}
                valueColor={openColor}
            />
            <MetricItem
                label="Reply"
                value={formattedReply}
                valueColor={replyColor}
                isLast
            />
        </div>
    );
}
