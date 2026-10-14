import { Clock, MessageSquare, Send, ShieldCheck } from 'lucide-react';
import { ReputationRing, PoolBadge, IssueBadge } from './shared';

// Inbox detail "Overview" tab: reputation, pool / issue badges, today's numbers and the 14-day trend.
export default function InboxOverviewTab({ accounts }) {
    const {
        history, selectedInboxSummary, todayMetric
    } = accounts;
    return (
        <div className="p-5 space-y-5">
            <div className="flex items-center gap-4 rounded-2xl border border-gray-100 p-4">
                <ReputationRing value={selectedInboxSummary.warmup_reputation} size={72}/>
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Reputation Score</p>
                    <div className="flex flex-wrap gap-1.5">
                        <PoolBadge pool={selectedInboxSummary.warmup_pool || 'FOUNDATION'}/>
                <IssueBadge
                    code={selectedInboxSummary.warmup_issue_code}
                    warmupEnabled={Boolean(selectedInboxSummary.warmup_enabled)}
                />
                    </div>
                    <p className="text-xs text-gray-400">
                        {selectedInboxSummary.provider || 'SMTP'} &middot; Day {selectedInboxSummary.warmup_day || 0}
                    </p>
                </div>
            </div>

            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Today</p>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: 'Target',  value: todayMetric?.planned_sends  || 0, icon: Clock,        c: '#0046FF' },
                        { label: 'Sent',    value: todayMetric?.actual_sends   || 0, icon: Send,          c: '#73C8D2' },
                        { label: 'Replies', value: todayMetric?.reply_count    || 0, icon: MessageSquare, c: '#16a34a' },
                        { label: 'Saved',   value: todayMetric?.saved_from_spam_count || 0, icon: ShieldCheck, c: '#FF9013' },
                    ].map(({ label, value, icon: Icon, c }) => (
                        <div key={label} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                                  style={{ backgroundColor: c + '18' }}>
                                <Icon size={14} style={{ color: c }}/>
                            </span>
                            <div>
                                <p className="text-[10px] text-gray-400 font-medium">{label}</p>
                                <p className="text-base font-bold text-gray-900">{value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">14-Day Reputation Trend</p>
                {history.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-center text-xs text-gray-400">
                        No history yet — comes after first warmup cycle.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {history.map(item => {
                            const pct = Math.min(Number(item.reputation_score || 0), 100);
                            const c = pct >= 92 ? '#0046FF' : pct >= 75 ? '#FF9013' : '#ef4444';
                            return (
                                <div key={item.metric_id} className="grid grid-cols-[80px_1fr_42px] items-center gap-3">
                                    <span className="text-[11px] font-medium text-gray-400">{item.metric_date}</span>
                                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                        <div className="h-full rounded-full"
                                             style={{ width: `${pct}%`, backgroundColor: c, transition: 'width 0.4s ease' }}/>
                                    </div>
                                    <span className="text-right text-[11px] font-bold" style={{ color: c }}>{pct}%</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
