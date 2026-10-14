
// Dashboard: the five most recently updated campaigns.
export default function RecentActivity({ dashboard }) {
    const {
        activityIconStyles, recent, relTime
    } = dashboard;
    return (
        <div className="card-anim bg-white/80 rounded-2xl shadow-sm p-6" style={{ animationDelay: '720ms' }}>
            <p className="text-sm font-semibold text-gray-800 mb-1">Recent Activities</p>
            <p className="text-xs text-gray-400 mb-5">Latest campaign updates</p>
            <div className="space-y-4">
                {recent.length === 0 ? (
                    <p className="text-sm text-gray-300 text-center py-6">No recent activity</p>
                ) : recent.map((c, i) => {
                    const { bg, Icon } = activityIconStyles[i % activityIconStyles.length];
                    return (
                        <div key={c.campaign_id} className="flex items-start gap-3">
                            <span className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 mt-0.5" style={{ background: bg }}>
                                <Icon size={14} className="text-white" />
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-700 truncate">{c.campaign_name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    <span className="capitalize">{c.status.toLowerCase()}</span> · {relTime(c.updated_at)}
                                </p>
                            </div>
                            <span className="text-xs text-gray-300 shrink-0 mt-0.5">{relTime(c.updated_at)}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
