import React from 'react';
import { Mail, Zap, BarChart3, Activity } from 'lucide-react';

const StatCard = ({ label, value, subtext, type = 'neutral', icon: Icon }) => {
    const colors = {
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        amber: 'text-amber-600 bg-amber-50 border-amber-100',
        rose: 'text-rose-600 bg-rose-50 border-rose-100',
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        slate: 'text-slate-600 bg-slate-50 border-slate-100',
    };
    const colorClass = colors[type] || colors.slate;

    return (
        <div className="bg-slate-50 p-5 rounded-2xl border-2 border-slate-200 hover:border-blue-400 flex items-start justify-between transition-all">
            <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
                {subtext && <p className="text-xs text-slate-400 mt-1 font-medium">{subtext}</p>}
            </div>
            <div className={`p-2 rounded-lg ${colorClass}`}>
                <Icon className="w-5 h-5" />
            </div>
        </div>
    );
};

export default function InboxStatsHeader({ inboxes = [] }) {
    const totalInboxes = inboxes.length;
    const totalCapacity = inboxes.reduce((acc, i) => acc + (i.daily_limit || 0), 0);
    // Assuming 'today_sent' might exist in future or is 0 for now
    const totalUsed = inboxes.reduce((acc, i) => acc + (i.today_sent || 0), 0);
    const utilization = totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0;

    let utilizationColor = 'blue';
    if (utilization > 85) utilizationColor = 'amber';
    if (utilization >= 100) utilizationColor = 'rose';
    if (utilization < 60 && totalUsed > 0) utilizationColor = 'emerald';

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                label="Connected Inboxes"
                value={totalInboxes}
                subtext="Active sending accounts"
                icon={Mail}
                type="slate"
            />
            <StatCard
                label="Daily Capacity"
                value={totalCapacity.toLocaleString()}
                subtext="Max volume per day"
                icon={Zap}
                type="blue"
            />
            <StatCard
                label="Sent Today"
                value={totalUsed.toLocaleString()}
                subtext="Emails delivered so far"
                icon={Activity}
                type="emerald"
            />
            <StatCard
                label="Utilization"
                value={`${utilization}%`}
                subtext="Load on infrastructure"
                icon={BarChart3}
                type={utilizationColor}
            />
        </div>
    );
}
