import { MessageSquare, Users, Target } from 'lucide-react';
import { formatHours, Skeleton } from './reportWidgets';

// Reports: optimization metrics (reply time, best send hour, ...).

// ── Optimization metrics ────────────────────────────────────────
export default function OptimizationRow({ optimization, loading }) {
    const items = [
        {
            value:  loading ? null : (optimization?.avg_leads_before_first_reply ?? 0),
            label:  'Avg. Leads Before First Reply',
            sub:    'Per campaign average',
            color:  '#0046FF',
            icon:   Users,
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
        },
        {
            value:  loading ? null : `${optimization?.follow_up_reply_rate ?? 0}%`,
            label:  'Follow-up Reply Rate',
            sub:    'Replies from follow-up sequences',
            color:  '#10b981',
            icon:   MessageSquare,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
        },
        {
            value:  loading ? null : formatHours(optimization?.median_time_to_first_reply_hours),
            label:  'Median Time to First Reply',
            sub:    'From send to first response',
            color:  '#FF9013',
            icon:   Target,
            iconBg: 'bg-orange-50',
            iconColor: 'text-orange-500',
        },
    ];

    return (
        <>
            {items.map((item, i) => {
                const Icon = item.icon;
                return (
                    <div key={i} className="card-anim bg-white/80 rounded-2xl shadow-sm p-5"
                        style={{ animationDelay: `${400 + i * 60}ms` }}>
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.iconBg}`}>
                                <Icon style={{ width: 18, height: 18 }} className={item.iconColor} />
                            </div>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{item.label}</span>
                        </div>
                        {loading ? (
                            <><Skeleton className="h-8 w-20 mb-1" /><Skeleton className="h-3 w-32" /></>
                        ) : (
                            <>
                                <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                            </>
                        )}
                    </div>
                );
            })}
        </>
    );
}
