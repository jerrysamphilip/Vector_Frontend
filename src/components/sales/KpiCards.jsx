import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Info, Loader2 } from 'lucide-react';
import { errorMessage } from '../../api/contacts';
import { money, moneyShort, pct, salesReportsApi } from '../../api/sales';
import { ErrorNote, formatDateTime } from '../contacts/shared';
import { Seg, StatTile, card, cardShadow } from './shared';
import { useConfirm } from '../ui/ConfirmDialog';

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

/** Forecast accuracy is actual ÷ committed: 100% is on target, far either side is not. */
function accuracyTone(v) {
    if (v == null) return 'text-slate-400';
    const off = Math.abs(v - 100);
    if (off <= 10) return 'text-emerald-600';
    if (off <= 30) return 'text-amber-600';
    return 'text-red-600';
}

/** Forecast accuracy (BRD v2.0 section 8): revenue won in each period against the committed forecast stored at its start. */
export function ForecastAccuracyCard({ member }) {
    const confirm = useConfirm();
    const qc = useQueryClient();
    const [periodType, setPeriodType] = useState('QUARTER');
    const [error, setError] = useState(null);
    const { data } = useQuery({ queryKey: ['rep-forecast-accuracy', member, periodType], queryFn: () => salesReportsApi.forecastAccuracy({ member, period_type: periodType }) });
    const snapshot = useMutation({
        mutationFn: () => salesReportsApi.takeForecastSnapshot({ period_type: periodType, replace: !!data?.current_period?.has_snapshot }),
        onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ['rep-forecast-accuracy'] }); },
        onError: e => setError(errorMessage(e)),
    });
    const takeSnapshot = async () => {
        if (data?.current_period?.has_snapshot && !(await confirm({ title: `Replace the forecast stored for ${data.current_period.label}?`, message: 'The accuracy for this period will then be measured from now.', confirmLabel: 'Replace' }))) return;
        snapshot.mutate();
    };
    return (
        <div className={`${card} overflow-hidden`} style={cardShadow} data-testid="forecast-accuracy">
            <div className="flex items-start justify-between gap-3 flex-wrap px-5 pt-5 pb-3">
                <div>
                    <h2 className="text-sm font-bold text-slate-800">Forecast accuracy</h2>
                    <p className="text-xs text-slate-500" data-testid="forecast-accuracy-help">Committed forecast (won to date + open deals in the Commit category) stored at the start of each period, against revenue actually won by its end. Accuracy = actual ÷ committed × 100: 100% means the team won what it committed; above 100% it won more.</p>
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
                        <th className="pl-5 py-2.5">Period</th><th className={th}>Committed at start</th><th className={th}>Actual won</th><th className={th}>Variance</th><th className={th}>Accuracy</th><th className={th} title="Won + probability-weighted open pipeline at the start, and how close the actual came to it (1 − |actual − forecast| ÷ forecast)">Weighted forecast</th><th className={`${th} pr-5`}>Stored</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.periods.map(p => (
                                <tr key={p.period_start} data-testid="forecast-accuracy-row">
                                    <td className="pl-5 py-2.5"><p className="text-slate-800">{p.label}</p><p className="text-xs text-slate-400">{p.period_start} to {p.period_end}</p></td>
                                    <td className={td}>{p.legacy_snapshot ? <span className="text-xs text-slate-400" title="Stored before committed forecasts were recorded">not recorded</span> : money(p.committed)}</td>
                                    <td className={td}>{money(p.actual)}{!p.closed && <span className="block text-[11px] text-slate-400">so far</span>}</td>
                                    <td className={td}>{p.variance == null ? '—' : `${p.variance > 0 ? '+' : ''}${money(p.variance)}`}</td>
                                    <td className={`${td} font-semibold ${accuracyTone(p.closed ? p.accuracy : p.accuracy_to_date)}`} data-testid="forecast-accuracy-value">{p.closed ? pct(p.accuracy) : <span className="text-xs font-normal text-slate-400">{p.accuracy_to_date == null ? 'in progress' : `${pct(p.accuracy_to_date)} so far`}</span>}</td>
                                    <td className={`${td} text-slate-500`}>{money(p.forecast)}{p.weighted_accuracy != null && <span className="block text-[11px] text-slate-400">{pct(p.weighted_accuracy)} close</span>}</td>
                                    <td className={`${td} pr-5 text-xs text-slate-500`}>{p.taken_at ? formatDateTime(p.taken_at) : '—'}{p.source === 'MANUAL' ? ' · by hand' : ''}</td>
                                </tr>
                            ))}
                            {!data.periods.length && <tr><td colSpan={7} className="text-center text-slate-400 py-8">No forecast stored yet. One is stored automatically at the start of every {periodType === 'MONTH' ? 'month' : 'quarter'}.</td></tr>}
                        </tbody></table></div>
                    {data.amounts_hidden && <p className="text-xs text-slate-400 px-5 py-3">Amounts are hidden for your role; accuracy is shown as a percentage only.</p>}
                </>
            )}
        </div>
    );
}

function kpiValueTone(k) {
    if (!k.available || k.value == null) return 'text-slate-400';
    if (k.meets_target === true) return 'text-emerald-600';
    if (k.meets_target === false) return 'text-red-600';
    if (k.key === 'forecast_accuracy') return accuracyTone(k.value);
    return 'text-slate-900';
}

function kpiSub(k) {
    if (!k.available) return null;
    if (k.key === 'forecast_accuracy' && k.amounts_hidden) return `${k.period?.label || ''} · amounts hidden`;
    if (k.numerator == null || k.denominator == null) return k.period?.label || null;
    const n = k.key === 'forecast_accuracy' ? moneyShort(k.numerator) : Number(k.numerator).toLocaleString();
    const d = k.key === 'forecast_accuracy' ? moneyShort(k.denominator) : Number(k.denominator).toLocaleString();
    return `${n} ${k.numerator_label.toLowerCase()} ÷ ${d} ${k.denominator_label.toLowerCase()}`;
}

/** Weekly adoption bars (oldest → this week), with the values as text for screen readers. */
function AdoptionTrend({ weeks }) {
    return (
        <div className="mt-2" data-testid="kpi-adoption-trend">
            <div className="flex items-end gap-1 h-10" aria-hidden="true">
                {weeks.map(w => (
                    <span key={w.week_start} title={`Week of ${w.week_start}: ${w.active_users} of ${w.licensed_users} active (${pct(w.value)})${w.partial ? ', so far' : ''}`}
                        className={`flex-1 rounded-sm ${w.partial ? 'bg-indigo-300' : 'bg-indigo-500'}`} style={{ height: `${Math.max(w.value || 0, 3)}%` }} />
                ))}
            </div>
            <p className="sr-only">{weeks.map(w => `Week of ${w.week_start}: ${pct(w.value)}`).join('; ')}</p>
            <p className="text-[11px] text-slate-400 mt-1">Last {weeks.length} weeks</p>
        </div>
    );
}

function KpiTile({ k }) {
    const [open, setOpen] = useState(false);
    const id = `kpi-def-${k.key}`;
    return (
        <div className={`${card} px-4 py-3`} style={cardShadow} data-testid={`kpi-${k.key}`} data-available={k.available ? 'true' : 'false'}>
            <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{k.label}</p>
                <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={id} aria-label={`About ${k.label}`}
                    title={`${k.formula}. ${k.definition}`} className="text-slate-400 hover:text-indigo-600 -mt-0.5" data-testid="kpi-info">
                    <Info className="w-3.5 h-3.5" />
                </button>
            </div>
            <p className={`text-2xl font-bold tracking-tight mt-1 tabular-nums ${kpiValueTone(k)}`} data-testid="kpi-value">{k.available ? pct(k.value) : '—'}</p>
            {kpiSub(k) && <p className="text-xs text-slate-500 mt-0.5" data-testid="kpi-sub">{kpiSub(k)}</p>}
            {k.target && (
                <p className="text-xs mt-1" data-testid="kpi-target">
                    <span className="text-slate-500">Target {k.target.label}</span>
                    {k.meets_target != null && <span className={`ml-1.5 font-semibold ${k.meets_target ? 'text-emerald-600' : 'text-red-600'}`}>{k.meets_target ? 'on target' : 'off target'}</span>}
                </p>
            )}
            {k.key === 'crm_adoption' && k.available && k.trend && <AdoptionTrend weeks={k.trend} />}
            {k.note && <p className="text-[11px] text-slate-400 mt-1" data-testid="kpi-note">{k.note}</p>}
            {open && (
                <div id={id} className="mt-2 text-xs text-slate-600 border-t border-slate-100 pt-2" data-testid="kpi-definition">
                    <p className="font-semibold text-slate-700">{k.formula}</p>
                    <p className="mt-0.5">{k.definition}</p>
                </div>
            )}
        </div>
    );
}

/** The six CRM KPIs of BRD v2.0 section 8, with their targets and definitions. */
export function CrmKpisCard({ member, range, title = 'CRM KPIs' }) {
    const { data, error } = useQuery({ queryKey: ['crm-kpis', member, range], queryFn: () => salesReportsApi.kpis({ ...range, member }) });
    return (
        <div className={`${card} overflow-hidden`} style={cardShadow} data-testid="crm-kpis">
            <div className="px-5 pt-5 pb-3">
                <h2 className="text-sm font-bold text-slate-800">{title}</h2>
                <p className="text-xs text-slate-500">
                    {data ? `${data.period.from} to ${data.period.to}. ` : ''}Success measures from the requirements; use ⓘ for each definition.
                    {data && !data.workspace_view ? ' Duplicate rate and adoption are workspace-level: admins and the Sales Head see them.' : ''}
                </p>
            </div>
            {error ? <div className="px-5 pb-4"><ErrorNote message={errorMessage(error)} /></div> : !data ? <Spinner /> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 px-5 pb-5">
                    {data.kpis.map(k => <KpiTile key={k.key} k={k} />)}
                </div>
            )}
        </div>
    );
}
