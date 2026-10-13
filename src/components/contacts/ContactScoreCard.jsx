import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Gauge, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { scoringApi } from '../../api/contactScoring';
import { errorMessage } from '../../api/contacts';
import { ErrorNote, relativeDate } from './shared';
import ScoreBadge from './ScoreBadge';

function Bar({ value, tone }) {
    return (
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} />
        </div>
    );
}

/** "Score" card on the contact record: score, grade, fit and engagement with the rules that contributed (BR-CM-43). */
export default function ContactScoreCard({ contactId, card, cardShadow }) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState(null);
    const { data, isLoading } = useQuery({ queryKey: ['contact-score', contactId], queryFn: () => scoringApi.contactScore(contactId), retry: false });
    const recompute = useMutation({
        mutationFn: () => scoringApi.recomputeContact(contactId),
        onSuccess: (res) => {
            setError(null);
            queryClient.setQueryData(['contact-score', contactId], res);
            queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
        },
        onError: err => setError(errorMessage(err)),
    });

    const matched = (data?.fit_rules || []).filter(r => r.matched);
    const signals = (data?.engagement_signals || []).filter(s => s.count > 0);
    const stored = data?.stored || {};

    return (
        <div className={card} style={cardShadow} data-testid="contact-score-card">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Gauge className="w-4 h-4 text-indigo-500" /> Score</h3>
                <button onClick={() => recompute.mutate()} disabled={recompute.isPending} title="Recalculate now"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 disabled:opacity-50" data-testid="score-recompute">
                    {recompute.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Recalculate
                </button>
            </div>
            {isLoading ? <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div> : !data ? (
                <p className="text-sm text-slate-400">Score unavailable.</p>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <ScoreBadge score={data.score} grade={data.grade} fit={data.fit} engagement={data.engagement} size="lg" />
                        <p className="text-[11px] text-slate-400 text-right">
                            {stored.scored_at ? `Saved ${relativeDate(stored.scored_at)}` : 'Not saved yet'}
                            {stored.score !== null && stored.score !== undefined && stored.score !== data.score && <><br />Saved score {stored.score} ({stored.grade})</>}
                        </p>
                    </div>
                    <div className="space-y-2">
                        <div>
                            <div className="flex justify-between text-xs text-slate-600 mb-1"><span>Fit ({data.fit_weight}%)</span><span className="font-semibold" data-testid="score-fit">{data.fit}</span></div>
                            <Bar value={data.fit} tone="bg-indigo-500" />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-slate-600 mb-1"><span>Engagement ({data.engagement_weight}%)</span><span className="font-semibold" data-testid="score-engagement">{data.engagement}</span></div>
                            <Bar value={data.engagement} tone="bg-teal-500" />
                        </div>
                    </div>
                    <button onClick={() => setOpen(o => !o)} className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1" data-testid="score-breakdown-toggle">
                        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} Why this score
                    </button>
                    {open && (
                        <div className="space-y-3 text-xs" data-testid="score-breakdown">
                            <div>
                                <p className="font-bold text-slate-500 uppercase tracking-wide mb-1">Fit rules matched</p>
                                {matched.length === 0 ? <p className="text-slate-400">No fit rule matched.</p> : (
                                    <ul className="space-y-1">
                                        {matched.map(r => (
                                            <li key={r.id} className="flex justify-between gap-2" data-testid="score-fit-rule">
                                                <span className="text-slate-700 truncate" title={`${r.field} ${r.operator} ${r.value}`}>{r.label}</span>
                                                <span className={`font-semibold tabular-nums ${r.points < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{r.points > 0 ? '+' : ''}{r.points}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div>
                                <p className="font-bold text-slate-500 uppercase tracking-wide mb-1">Engagement (last {data.lookback_days} days)</p>
                                {signals.length === 0 ? <p className="text-slate-400">No recent activity.</p> : (
                                    <ul className="space-y-1">
                                        {signals.map(s => (
                                            <li key={s.signal} className="flex justify-between gap-2" data-testid="score-signal">
                                                <span className="text-slate-700">{s.label} × {s.count}</span>
                                                <span className="font-semibold tabular-nums text-emerald-700" title={`${s.points} each, decayed count ${s.weighted_count}, capped at ${s.max}`}>+{s.contributed}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {data.half_life_days > 0 && <p className="text-slate-400 mt-1">Older activity counts less: half as much every {data.half_life_days} days.</p>}
                            </div>
                        </div>
                    )}
                    <ErrorNote message={error} />
                </div>
            )}
        </div>
    );
}
