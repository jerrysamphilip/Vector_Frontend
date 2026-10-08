import React from 'react';
import EditorialMetricBlock from '../ui/EditorialMetricBlock';

/**
 * CampaignPipelineMetrics (Editorial SaaS Style)
 * 
 * Displays key campaign text metrics using the Editorial Design System.
 * No cards, no shadows, no icons. Just large serif typography and whitespace.
 */
export default function CampaignPipelineMetrics({ sent = 0, opened = 0, replied = 0, bounced = 0 }) {
    // Determine percentages
    const showPercent = sent > 0;
    const openRate = showPercent ? Math.min(100, (opened / sent) * 100).toFixed(1) : 0;
    const replyRate = showPercent ? Math.min(100, (replied / sent) * 100).toFixed(1) : 0;
    const bounceRate = showPercent ? Math.min(100, (bounced / sent) * 100).toFixed(1) : 0;

    const fmt = (n) => (n || 0).toLocaleString();

    return (
        <div className="space-y-6">
            {/* 
              Editorial Grid 
              Rules: 3 columns max, whitespace spacing 
            */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <EditorialMetricBlock
                    label="Total Sent"
                    value={fmt(sent)}
                    subtext="Outreach volume"
                />

                <EditorialMetricBlock
                    label="Open Rate"
                    value={`${openRate}%`}
                    subtext={`${fmt(opened)} emails opened`}
                />

                <EditorialMetricBlock
                    label="Replies"
                    value={`${replyRate}%`}
                    subtext={`${fmt(replied)} responses`}
                    accentColor="bg-[var(--accent-lime)]" // Editoral highlight for the goal
                />
            </div>

            {/* Subtle Footer for negative metrics (Bounced) */}
            <div className="px-8 text-xs text-[var(--text-muted)] tracking-wide">
                Delivery Health: <span className="text-[var(--text-primary)]">{bounceRate}% Bounce Rate</span> ({fmt(bounced)} failed delivery)
            </div>
        </div>
    );
}
