import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2 } from 'lucide-react';
import { errorMessage } from '../../api/contacts';
import { money, moneyShort, pct, salesReportsApi } from '../../api/sales';
import { ErrorNote, formatDateTime } from '../contacts/shared';
import { Seg, StatTile, card, cardShadow } from './shared';

const th = 'px-3 py-2.5 text-right';
const td = 'px-3 py-2.5 text-right tabular-nums';
const Spinner = () => <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>;

/** SQL-to-win rate (BRD v2.0 section 8): of the leads that reached SQL in the period, how many became a won deal. */
export function SqlToWinCard({ member, range }) {
    const { data } = useQuery({ queryKey: ['rep-sql-to-win', member, range], queryFn: () => salesReportsApi.sqlToWin({ ...range, member }) });
    return (
        <div className={`${card} overflow-hidden`} style={cardShadow} data-testid="sql-to-win">
            <div className="px-5 pt-5 pb-3">
                <h2 className="text-sm font-bold text-slate-800">SQL to win</h2>
                <p className="text-xs text-slate-500">Leads that reached SQL in the period, and what became of their deals</p>
            </div>
            {!data ? <Spinner /> : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 px-5 pb-4">
                        <StatTile label="SQL → won" value={pct(data.sql_to_win_rate)} sub={`${data.won} of ${data.sqls} SQLs`} tone="text-emerald-600" />
                        <StatTile label="SQL → deal" value={pct(data.sql_to_deal_rate)} sub={`${data.with_deal} with a deal`} />
                        <StatTile label="Win rate (closed)" value={pct(data.closed_win_rate)} sub={`${data.won} won · ${data.lost} lost · ${data.open} open`} />
                        <StatTile label="Days SQL → won" value={data.average_days_sql_to_win ?? '—'} sub="Average" />
                        <StatTile label="Revenue won" value={moneyShort(data.won_amount)} sub={`${data.no_deal} SQLs without a deal`} />
                    </div>
                    <table className="w-full text-sm"><thead><tr className="bg-slate-50/80 text-xs font-semibold text-left text-slate-400 uppercase">
                        <th className="pl-5 py-2.5">Owner</th><th className={th}>SQLs</th><th className={th}>Won</th><th className={th}>Lost</th><th className={th}>Open</th><th className={th}>No deal</th><th className={th}>Won amount</th><th className={`${th} pr-5`}>SQL → won</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.by_owner.map(o => (
                                <tr key={o.owner_id}><td className="pl-5 py-2.5">{o.owner_name || '—'}</td><td className={td}>{o.sqls}</td><td className={td}>{o.won}</td><td className={td}>{o.lost}</td><td className={td}>{o.open}</td><td className={td}>{o.no_deal}</td>
                                    <td className={td}>{money(o.won_amount)}</td><td className={`${td} pr-5 font-semibold`}>{pct(o.sql_to_win_rate)}</td></tr>
                            ))}
                            {!data.by_owner.length && <tr><td colSpan={8} className="text-center text-slate-400 py-8">No leads reached SQL in this period.</td></tr>}
                        </tbody></table>
                </>
            )}
        </div>
    );
}

function accuracyTone(v) {
    if (v == null) return 'text-slate-400';
    if (v >= 90) return 'text-emerald-600';
    if (v >= 70) return 'text-amber-600';
    return 'text-red-600';
}

/** Forecast accuracy (BRD v2.0 section 8): the forecast stored at the start of each period against what was won by its end. */
export function ForecastAccuracyCard({ member }) {
    const qc = useQueryClient();
    const [periodType, setPeriodType] = useState('QUARTER');
    const [error, setError] = useState(null);
    const { data } = useQuery({ queryKey: ['rep-forecast-accuracy', member, periodType], queryFn: () => salesReportsApi.forecastAccuracy({ member, period_type: periodType }) });
    const snapshot = useMutation({
        mutationFn: () => salesReportsApi.takeForecastSnapshot({ period_type: periodType, replace: !!data?.current_period?.has_snapshot }),
        onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ['rep-forecast-accuracy'] }); },
        onError: e => setError(errorMessage(e)),
    });
    const takeSnapshot = () => {
        if (data?.current_period?.has_snapshot && !window.confirm(`Replace the forecast stored for ${data.current_period.label}? The accuracy for this period will then be measured from now.`)) return;
        snapshot.mutate();
    };
    return (
        <div className={`${card} overflow-hidden`} style={cardShadow} data-testid="forecast-accuracy">
            <div className="flex items-start justify-between gap-3 flex-wrap px-5 pt-5 pb-3">
                <div>
                    <h2 className="text-sm font-bold text-slate-800">Forecast accuracy</h2>
                    <p className="text-xs text-slate-500">Forecast (won + weighted open pipeline) stored at the start of each period, against revenue actually won by its end. Accuracy = 1 − |actual − forecast| ÷ forecast.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Seg value={periodType} onChange={setPeriodType} options={[['QUARTER', 'Quarterly'], ['MONTH', 'Monthly']]} />
                    {data?.can_take_snapshot && (
                        <button onClick={takeSnapshot} disabled={snapshot.isPending}
                            className="h-9 px-3 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 disabled:opacity-50">
                            {snapshot.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                            {data.current_period.has_snapshot ? 'Retake snapshot' : 'Take snapshot now'}
                        </button>
                    )}
                </div>
            </div>
            <div className="px-5"><ErrorNote message={error} /></div>
            {!data ? <Spinner /> : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 px-5 pb-4">
                        <StatTile label="Average accuracy" value={pct(data.average_accuracy)} sub={`${data.periods.filter(p => p.accuracy != null).length} finished periods`} tone={accuracyTone(data.average_accuracy)} />
                        <StatTile label="Last finished period" value={data.last_closed ? pct(data.last_closed.accuracy) : '—'} sub={data.last_closed ? data.last_closed.label : 'None yet'} tone={accuracyTone(data.last_closed?.accuracy)} />
                        <StatTile label="This period" value={data.current_period.label} sub={data.current_period.has_snapshot ? 'Forecast stored' : 'No forecast stored yet'} />
                    </div>
                    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50/80 text-xs font-semibold text-left text-slate-400 uppercase">
                        <th className="pl-5 py-2.5">Period</th><th className={th}>Forecast at start</th><th className={th}>Actual won</th><th className={th}>Variance</th><th className={th}>Accuracy</th><th className={`${th} pr-5`}>Stored</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.periods.map(p => (
                                <tr key={p.period_start}>
                                    <td className="pl-5 py-2.5"><p className="text-slate-800">{p.label}</p><p className="text-xs text-slate-400">{p.period_start} to {p.period_end}</p></td>
                                    <td className={td}>{money(p.forecast)}</td>
                                    <td className={td}>{money(p.actual)}{!p.closed && <span className="block text-[11px] text-slate-400">so far</span>}</td>
                                    <td className={td}>{p.variance == null ? '—' : `${p.variance > 0 ? '+' : ''}${money(p.variance)}`}</td>
                                    <td className={`${td} font-semibold ${accuracyTone(p.accuracy)}`}>{p.closed ? pct(p.accuracy) : <span className="text-xs font-normal text-slate-400">in progress</span>}</td>
                                    <td className={`${td} pr-5 text-xs text-slate-500`}>{p.taken_at ? formatDateTime(p.taken_at) : '—'}{p.source === 'MANUAL' ? ' · by hand' : ''}</td>
                                </tr>
                            ))}
                            {!data.periods.length && <tr><td colSpan={6} className="text-center text-slate-400 py-8">No forecast stored yet. One is stored automatically at the start of every {periodType === 'MONTH' ? 'month' : 'quarter'}.</td></tr>}
                        </tbody></table></div>
                    {data.amounts_hidden && <p className="text-xs text-slate-400 px-5 py-3">Amounts are hidden for your role; accuracy is shown as a percentage only.</p>}
                </>
            )}
        </div>
    );
}
