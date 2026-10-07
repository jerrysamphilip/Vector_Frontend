import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { money, moneyShort, pct, salesReportsApi } from '../api/sales';
import { ClientTypeFilter, HBar, MemberFilter, PERIODS, PageHeader, PeriodFilter, Seg, StatTile, card, cardShadow, periodRange, selectSm } from '../components/sales/shared';
import { Funnel } from './SalesDashboard';
import CustomReports from '../components/sales/CustomReports';

const WON = '#059669';
const WEIGHTED = '#4f46e5';
const Spinner = () => <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>;
const th = 'px-3 py-2.5 text-right';
const td = 'px-3 py-2.5 text-right tabular-nums';

function LeadsTab({ member, period }) {
    const range = periodRange(period);
    const { data } = useQuery({ queryKey: ['rep-leads', member, period], queryFn: () => salesReportsApi.leads({ ...range, member }) });
    const { data: funnel } = useQuery({ queryKey: ['rep-funnel', member, period], queryFn: () => salesReportsApi.funnel({ ...range, member }) });
    if (!data || !funnel) return <Spinner />;
    const maxStage = Math.max(...data.by_stage.map(s => s.count), 0);
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile label="Leads created" value={data.total} />
                <StatTile label="Became SQL" value={data.sqls} />
                <StatTile label="Lead → SQL" value={pct(data.lead_to_sql_rate)} />
                <StatTile label="Average days to SQL" value={data.average_days_to_sql ?? '—'} />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className={`${card} p-5`} style={cardShadow}>
                    <h2 className="text-sm font-bold text-slate-800 mb-3">Funnel</h2>
                    <Funnel stages={funnel.stages} />
                </div>
                <div className={`${card} p-5`} style={cardShadow}>
                    <h2 className="text-sm font-bold text-slate-800 mb-1">Where those leads are now</h2>
                    <p className="text-xs text-slate-500 mb-3">Leads created in the period, by current stage</p>
                    {data.by_stage.map(s => <HBar key={s.stage} label={s.label} value={s.count} max={maxStage} display={s.count} />)}
                </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className={`${card} overflow-hidden`} style={cardShadow}>
                    <h2 className="text-sm font-bold text-slate-800 px-5 pt-5 pb-3">By source</h2>
                    <table className="w-full text-sm"><thead><tr className="bg-slate-50/80 text-xs font-semibold text-left text-slate-400 uppercase"><th className="pl-5 py-2.5">Source</th><th className={th}>Leads</th><th className={th}>SQLs</th><th className={`${th} pr-5`}>SQL rate</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">{data.by_source.map(s => (
                            <tr key={s.source}><td className="pl-5 py-2.5">{s.source}</td><td className={td}>{s.leads}</td><td className={td}>{s.sqls}</td><td className={`${td} pr-5`}>{pct(s.sql_rate)}</td></tr>
                        ))}</tbody></table>
                </div>
                <div className={`${card} overflow-hidden`} style={cardShadow}>
                    <h2 className="text-sm font-bold text-slate-800 px-5 pt-5 pb-3">By owner</h2>
                    <table className="w-full text-sm"><thead><tr className="bg-slate-50/80 text-xs font-semibold text-left text-slate-400 uppercase"><th className="pl-5 py-2.5">Owner</th><th className={th}>Leads</th><th className={th}>SQLs</th><th className={th}>Converted</th><th className={th}>Disqualified</th><th className={`${th} pr-5`}>SQL rate</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">{data.by_owner.map(o => (
                            <tr key={o.owner_id}><td className="pl-5 py-2.5">{o.owner_name}</td><td className={td}>{o.leads}</td><td className={td}>{o.sqls}</td><td className={td}>{o.converted}</td><td className={td}>{o.disqualified}</td><td className={`${td} pr-5`}>{pct(o.sql_rate)}</td></tr>
                        ))}</tbody></table>
                </div>
            </div>
            {(data.disqualified_reasons || []).length > 0 && (
                <div className={`${card} p-5`} style={cardShadow}>
                    <h2 className="text-sm font-bold text-slate-800 mb-1">Why leads were disqualified</h2>
                    <p className="text-xs text-slate-500 mb-3">Leads created in the period; "recycling" ones reopen later</p>
                    {data.disqualified_reasons.map(r => <HBar key={r.reason} label={r.reason} value={r.count} max={data.disqualified_reasons[0].count} display={r.count} sub={r.recycling ? `${r.recycling} recycling` : undefined} tone="#64748b" />)}
                </div>
            )}
        </div>
    );
}

function PipelineTab({ member }) {
    const [clientType, setClientType] = useState('');
    const { data } = useQuery({ queryKey: ['rep-pipeline', member, clientType], queryFn: () => salesReportsApi.pipeline({ member, client_type: clientType }) });
    if (!data) return <Spinner />;
    const max = Math.max(...data.by_close_month.map(m => m.amount), 0);
    return (
        <div className="space-y-5">
            <ClientTypeFilter value={clientType} onChange={setClientType} />
            <div className={`${card} overflow-hidden`} style={cardShadow}>
                <h2 className="text-sm font-bold text-slate-800 px-5 pt-5 pb-3">By owner</h2>
                <table className="w-full text-sm"><thead><tr className="bg-slate-50/80 text-xs font-semibold text-left text-slate-400 uppercase">
                    <th className="pl-5 py-2.5">Owner</th><th className={th}>Open deals</th><th className={th}>Open amount</th><th className={th}>Weighted</th><th className={th}>Won</th><th className={th}>Lost</th><th className={`${th} pr-5`}>Win rate</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">{data.by_owner.map(o => (
                        <tr key={o.owner_id}><td className="pl-5 py-2.5">{o.owner_name}</td><td className={td}>{o.open_count}</td><td className={td}>{money(o.open_amount)}</td><td className={td}>{money(o.weighted)}</td>
                            <td className={td}>{money(o.won_amount)} ({o.won_count})</td><td className={td}>{o.lost_count}</td><td className={`${td} pr-5`}>{pct(o.win_rate)}</td></tr>
                    ))}</tbody></table>
            </div>
            <div className={`${card} p-5`} style={cardShadow}>
                <h2 className="text-sm font-bold text-slate-800 mb-3">Open pipeline by expected close month</h2>
                {data.by_close_month.map(m => <HBar key={m.month || 'none'} label={m.month || 'No close date'} value={m.amount} max={max} display={moneyShort(m.amount)} sub={`weighted ${moneyShort(m.weighted)} · ${m.count}`} />)}
                {!data.by_close_month.length && <p className="text-sm text-slate-400">No open deals.</p>}
            </div>
        </div>
    );
}

/** Stacked: won (closed) + weighted open = forecast. Two hues, legend, values as text. */
function ForecastBar({ bucket, max }) {
    const w = v => (max > 0 ? (v / max) * 100 : 0);
    return (
        <div className="flex h-4 rounded overflow-hidden bg-slate-100 gap-[2px]" title={`Won ${money(bucket.won)} + weighted open ${money(bucket.weighted)} = ${money(bucket.forecast)}`}>
            {bucket.won > 0 && <span style={{ width: `${w(bucket.won)}%`, background: WON }} />}
            {bucket.weighted > 0 && <span className="rounded-r" style={{ width: `${w(bucket.weighted)}%`, background: WEIGHTED }} />}
        </div>
    );
}

function ForecastTab({ member }) {
    const [fy, setFy] = useState('');
    const [clientType, setClientType] = useState('');
    const { data } = useQuery({ queryKey: ['rep-forecast', member, fy, clientType], queryFn: () => salesReportsApi.forecast({ member, fy, client_type: clientType }) });
    if (!data) return <Spinner />;
    const max = Math.max(...data.quarters.map(q => q.forecast), 0);
    const maxY = Math.max(...data.years.map(y => y.forecast), 0);
    const link = b => `/app/deals?mode=list&close_from=${b.close_from}&close_to=${b.close_to}${clientType ? `&client_type=${clientType}` : ''}`;
    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
                <select className={selectSm} value={fy || data.fy} onChange={e => setFy(e.target.value)} aria-label="Financial year">
                    {data.years.map(y => <option key={y.fy} value={y.fy}>{y.label}</option>)}
                </select>
                <ClientTypeFilter value={clientType} onChange={setClientType} />
                <span className="flex items-center gap-4 text-xs text-slate-600 ml-auto">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: WON }} />Won</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: WEIGHTED }} />Weighted open pipeline</span>
                </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile label={`${data.label} forecast`} value={moneyShort(data.total.forecast)} sub="Won + weighted open" />
                <StatTile label="Won" value={moneyShort(data.total.won)} sub={`${data.total.won_count} deals`} tone="text-emerald-600" />
                <StatTile label="Open pipeline" value={moneyShort(data.total.pipeline)} sub={`${data.total.open_count} deals · best case ${moneyShort(data.total.best_case)}`} />
                <StatTile label="Open, no close date" value={moneyShort(data.open_without_close_date.amount)} sub={`${data.open_without_close_date.count} deals not in the forecast`} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile label="Commit" value={moneyShort(data.total.commit)} sub="Won + deals reps committed" tone="text-indigo-700" />
                <StatTile label="Best case" value={moneyShort(data.total.best_case_category)} sub="Commit + best-case deals" />
                <StatTile label="Target" value={data.total.target ? moneyShort(data.total.target) : '—'} sub={data.total.target ? `${pct(data.total.attainment)} attained` : 'No targets set for this year'} />
                <StatTile label="Gap to target" value={data.total.target ? moneyShort(Math.max(data.total.target - data.total.won, 0)) : '—'} sub={data.total.target ? `commit covers ${pct(Math.round((data.total.commit / data.total.target) * 100))}` : ''} />
            </div>
            <div className={`${card} p-5`} style={cardShadow}>
                <h2 className="text-sm font-bold text-slate-800">Quarter-wise, {data.label} ({data.start} to {data.end})</h2>
                <p className="text-xs text-slate-500 mb-3">By expected close date. Each row links to the opportunities it counts.</p>
                <div className="space-y-2">
                    {data.quarters.map(q => (
                        <Link key={q.quarter} to={link(q)} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 hover:bg-slate-50 rounded-lg px-1 py-1">
                            <span className="text-sm text-slate-700">{q.label}</span><ForecastBar bucket={q} max={max} />
                            <span className="text-sm font-semibold tabular-nums">{moneyShort(q.forecast)}</span>
                        </Link>
                    ))}
                </div>
            </div>
            <div className={`${card} overflow-hidden`} style={cardShadow}>
                <table className="w-full text-sm"><thead><tr className="bg-slate-50/80 text-xs font-semibold text-left text-slate-400 uppercase">
                    <th className="pl-5 py-2.5">Period</th><th className={th}>Target</th><th className={th}>Won</th><th className={th}>Attained</th><th className={th}>Commit</th><th className={th}>Best case (cat.)</th><th className={th}>Open pipeline</th><th className={th}>Weighted</th><th className={`${th} pr-5`}>Forecast</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {data.quarters.map(q => (
                            <tr key={q.quarter}><td className="pl-5 py-2.5"><Link className="text-indigo-600 hover:text-indigo-800" to={link(q)}>{q.label}</Link></td>
                                <td className={td}>{q.target ? money(q.target) : '—'}</td><td className={td}>{money(q.won)}</td><td className={td}>{pct(q.attainment)}</td><td className={td}>{money(q.commit)}</td><td className={td}>{money(q.best_case_category)}</td><td className={td}>{money(q.pipeline)}</td><td className={td}>{money(q.weighted)}</td><td className={`${td} pr-5 font-semibold`}>{money(q.forecast)}</td></tr>
                        ))}
                        <tr className="bg-slate-50/60 font-semibold"><td className="pl-5 py-2.5"><Link className="text-indigo-600" to={link(data.total)}>{data.label}</Link></td>
                            <td className={td}>{data.total.target ? money(data.total.target) : '—'}</td><td className={td}>{money(data.total.won)}</td><td className={td}>{pct(data.total.attainment)}</td><td className={td}>{money(data.total.commit)}</td><td className={td}>{money(data.total.best_case_category)}</td><td className={td}>{money(data.total.pipeline)}</td><td className={td}>{money(data.total.weighted)}</td><td className={`${td} pr-5`}>{money(data.total.forecast)}</td></tr>
                    </tbody></table>
            </div>
            <div className={`${card} p-5`} style={cardShadow}>
                <h2 className="text-sm font-bold text-slate-800 mb-3">Financial-year-wise</h2>
                <div className="space-y-2">
                    {data.years.map(y => (
                        <Link key={y.fy} to={link(y)} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 hover:bg-slate-50 rounded-lg px-1 py-1">
                            <span className="text-sm text-slate-700">{y.label}</span><ForecastBar bucket={y} max={maxY} />
                            <span className="text-sm font-semibold tabular-nums">{moneyShort(y.forecast)} <span className="font-normal text-slate-400">· won {moneyShort(y.won)}</span></span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

function TeamTab({ member, period }) {
    const range = periodRange(period);
    const { data } = useQuery({ queryKey: ['rep-team', member, period], queryFn: () => salesReportsApi.team({ ...range, member }) });
    if (!data) return <Spinner />;
    const t = data.totals;
    const cols = [['activities', 'Activities'], ['calls', 'Calls'], ['meetings', 'Meetings'], ['emails_sent', 'Emails'], ['leads', 'Leads'], ['sqls', 'SQLs'],
        ['opportunities', 'Opps'], ['won_count', 'Won']];
    return (
        <div className={`${card} overflow-hidden`} style={cardShadow}>
            <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead><tr className="bg-slate-50/80 text-xs font-semibold text-left text-slate-400 uppercase tracking-wide">
                    <th className="pl-5 py-2.5">Rep</th>{cols.map(([k, l]) => <th key={k} className={th}>{l}</th>)}
                    <th className={th}>Won amount</th><th className={th}>Lead→SQL</th><th className={th}>SQL→Opp</th><th className={`${th} pr-5`}>Win rate</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                    {data.reps.map(r => (
                        <tr key={r.user_id} className="hover:bg-slate-50/60">
                            <td className="pl-5 py-2.5"><p className="font-semibold text-slate-800">{r.name}</p><p className="text-xs text-slate-400">{r.level_label || '—'}</p></td>
                            {cols.map(([k]) => <td key={k} className={td}>{r[k]}</td>)}
                            <td className={td}>{moneyShort(r.won_amount)}</td><td className={td}>{pct(r.lead_to_sql)}</td><td className={td}>{pct(r.sql_to_opportunity)}</td><td className={`${td} pr-5`}>{pct(r.win_rate)}</td>
                        </tr>
                    ))}
                    <tr className="bg-slate-50/60 font-semibold"><td className="pl-5 py-2.5">Team total</td>{cols.map(([k]) => <td key={k} className={td}>{t[k]}</td>)}
                        <td className={td}>{moneyShort(t.won_amount)}</td><td className={td}>{pct(t.lead_to_sql)}</td><td className={td}>{pct(t.sql_to_opportunity)}</td><td className={`${td} pr-5`}>{pct(t.win_rate)}</td></tr>
                </tbody>
            </table></div>
            <p className="text-xs text-slate-400 px-5 py-3">Activities are logged notes, calls, meetings and emails plus completed tasks. Conversion is within the period.</p>
        </div>
    );
}

const COMMIT = '#4f46e5';
function AttainmentBar({ row, max }) {
    const w = v => (max > 0 ? Math.min(100, (v / max) * 100) : 0);
    return (
        <div className="relative h-4 rounded bg-slate-100 overflow-hidden" title={`Won ${money(row.won)} · commit ${money(row.commit)}${row.target ? ` · target ${money(row.target)}` : ''}`}>
            <span className="absolute inset-y-0 left-0 rounded-r opacity-30" style={{ width: `${w(row.commit)}%`, background: COMMIT }} />
            <span className="absolute inset-y-0 left-0 rounded-r" style={{ width: `${w(row.won)}%`, background: WON }} />
            {row.target ? <span className="absolute inset-y-0 w-0.5 bg-slate-800" style={{ left: `${w(row.target)}%` }} /> : null}
        </div>
    );
}

function TargetsTab({ member, period }) {
    const [quarter, setQuarter] = useState('');
    const [fy, setFy] = useState('');
    const { data } = useQuery({ queryKey: ['rep-targets', member, fy, quarter], queryFn: () => salesReportsApi.targets({ member, fy, quarter }) });
    const range = periodRange(period);
    const { data: board } = useQuery({ queryKey: ['rep-leaderboard', member, period], queryFn: () => salesReportsApi.leaderboard({ ...range, member }) });
    if (!data) return <Spinner />;
    const max = Math.max(...data.rows.map(r => Math.max(r.target || 0, r.commit || 0, r.won || 0)), 0);
    const t = data.totals;
    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
                <select className={selectSm} value={fy || data.fy} onChange={e => setFy(e.target.value)} aria-label="Financial year">
                    {[data.fy - 1, data.fy, data.fy + 1].map(y => <option key={y} value={y}>{y === data.fy ? data.fy_label : data.fy_label.replace(String(data.fy), String(y)).replace(String(data.fy + 1).slice(-2), String(y + 1).slice(-2))}</option>)}
                </select>
                <Seg value={quarter} onChange={setQuarter} options={[['', 'Full year'], ['1', 'Q1'], ['2', 'Q2'], ['3', 'Q3'], ['4', 'Q4']]} />
                <span className="flex items-center gap-4 text-xs text-slate-600 ml-auto">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: WON }} />Won</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm opacity-30" style={{ background: COMMIT }} />Commit</span>
                    <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 bg-slate-800" />Target</span>
                    <Link to="/app/sales-targets" className="font-semibold text-indigo-600 hover:text-indigo-800">Set targets →</Link>
                </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile label="Target" value={t.target ? moneyShort(t.target) : '—'} sub={`${data.fy_label}${quarter ? ` Q${quarter}` : ''} · ${data.start} to ${data.end}`} />
                <StatTile label="Won" value={moneyShort(t.won)} sub={t.attainment != null ? `${pct(t.attainment)} of target` : 'No target set'} tone="text-emerald-600" />
                <StatTile label="Commit" value={moneyShort(t.commit)} sub="Won + committed deals" tone="text-indigo-700" />
                <StatTile label="Best case" value={moneyShort(t.best_case)} sub="Commit + best-case deals" />
            </div>
            <div className={`${card} overflow-hidden`} style={cardShadow}>
                <div className="overflow-x-auto"><table className="w-full text-sm">
                    <thead><tr className="bg-slate-50/80 text-xs font-semibold text-left text-slate-400 uppercase">
                        <th className="pl-5 py-2.5 w-10">#</th><th className="py-2.5">Rep</th><th className="px-3 py-2.5 w-1/3">Progress</th>
                        <th className={th}>Target</th><th className={th}>Won</th><th className={th}>Attained</th><th className={th}>Gap</th><th className={th}>Commit</th><th className={`${th} pr-5`}>Best case</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {data.rows.map(r => (
                            <tr key={r.user_id}>
                                <td className="pl-5 py-2.5 text-slate-400 tabular-nums">{r.rank}</td>
                                <td className="py-2.5"><p className="font-semibold text-slate-800">{r.name}</p><p className="text-xs text-slate-400">{r.level_label || '—'}</p></td>
                                <td className="px-3 py-2.5"><AttainmentBar row={r} max={max} /></td>
                                <td className={td}>{r.target ? money(r.target) : '—'}</td><td className={td}>{money(r.won)}</td>
                                <td className={`${td} font-semibold ${r.attainment >= 100 ? 'text-emerald-600' : ''}`}>{pct(r.attainment)}</td>
                                <td className={td}>{r.gap ? money(r.gap) : '—'}</td><td className={td}>{money(r.commit)}</td><td className={`${td} pr-5`}>{money(r.best_case)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table></div>
            </div>
            <div className={`${card} overflow-hidden`} style={cardShadow}>
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <h2 className="text-sm font-bold text-slate-800">Leaderboard</h2>
                    <span className="text-xs text-slate-500">Revenue won, {PERIODS[period].toLowerCase()} (period picker above)</span>
                </div>
                {!board ? <Spinner /> : (
                    <table className="w-full text-sm"><thead><tr className="bg-slate-50/80 text-xs font-semibold text-left text-slate-400 uppercase">
                        <th className="pl-5 py-2.5 w-10">#</th><th className="py-2.5">Rep</th><th className={th}>Won amount</th><th className={th}>Deals won</th><th className={th}>SQLs</th><th className={th}>Activities</th><th className={`${th} pr-5`}>Win rate</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">{board.rows.map(r => (
                            <tr key={r.user_id}><td className="pl-5 py-2.5 font-semibold text-slate-500 tabular-nums">{r.rank}</td><td className="py-2.5 font-medium text-slate-800">{r.name}</td>
                                <td className={`${td} font-semibold`}>{money(r.won_amount)}</td><td className={td}>{r.won_count}</td><td className={td}>{r.sqls}</td><td className={td}>{r.activities}</td><td className={`${td} pr-5`}>{pct(r.win_rate)}</td></tr>
                        ))}</tbody></table>
                )}
            </div>
        </div>
    );
}

function RoiTab({ member, period }) {
    const range = period === 'all' ? {} : periodRange(period);
    const { data } = useQuery({ queryKey: ['rep-roi', member, period], queryFn: () => salesReportsApi.campaignRoi({ ...range, member }) });
    if (!data) return <Spinner />;
    const t = data.totals || {};
    const maxRev = Math.max(...data.rows.map(r => r.revenue), 0);
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile label="Contacts emailed" value={(t.contacts_emailed || 0).toLocaleString()} sub={`${t.replies || 0} replied`} />
                <StatTile label="Leads → SQLs" value={`${t.leads || 0} → ${t.sqls || 0}`} sub={`${t.opportunities || 0} opportunities`} />
                <StatTile label="Open pipeline" value={moneyShort(t.pipeline)} sub={`weighted ${moneyShort(t.weighted)}`} />
                <StatTile label="Revenue won" value={moneyShort(t.revenue)} sub={`${t.won_count || 0} deals`} tone="text-emerald-600" />
            </div>
            {maxRev > 0 && (
                <div className={`${card} p-5`} style={cardShadow}>
                    <h2 className="text-sm font-bold text-slate-800 mb-3">Revenue won by campaign</h2>
                    {data.rows.filter(r => r.revenue > 0).slice(0, 10).map(r => <HBar key={r.campaign_id} label={r.campaign_name} value={r.revenue} max={maxRev} display={moneyShort(r.revenue)} sub={`${r.won_count} deals`} tone={WON} />)}
                </div>
            )}
            <div className={`${card} overflow-hidden`} style={cardShadow}>
                <div className="overflow-x-auto"><table className="w-full text-sm">
                    <thead><tr className="bg-slate-50/80 text-xs font-semibold text-left text-slate-400 uppercase">
                        <th className="pl-5 py-2.5">Campaign</th><th className={th}>Emailed</th><th className={th}>Replies</th><th className={th}>Reply rate</th><th className={th}>Leads</th><th className={th}>SQLs</th>
                        <th className={th}>Opps</th><th className={th}>Pipeline</th><th className={th}>Won</th><th className={th}>Revenue</th><th className={`${th} pr-5`}>Per contact</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {data.rows.map(r => (
                            <tr key={r.campaign_id}>
                                <td className="pl-5 py-2.5"><Link to={`/app/campaigns/${r.campaign_id}`} className="font-medium text-indigo-600 hover:text-indigo-800">{r.campaign_name}</Link></td>
                                <td className={td}>{r.contacts_emailed}</td><td className={td}>{r.replies}</td><td className={td}>{pct(r.reply_rate)}</td>
                                <td className={td}>{r.leads}</td><td className={td}>{r.sqls}</td><td className={td}>{r.opportunities}</td>
                                <td className={td}>{money(r.pipeline)}</td><td className={td}>{r.won_count}</td><td className={`${td} font-semibold`}>{money(r.revenue)}</td>
                                <td className={`${td} pr-5`}>{r.revenue_per_contact != null ? money(r.revenue_per_contact) : '—'}</td>
                            </tr>
                        ))}
                        {!data.rows.length && <tr><td colSpan={11} className="text-center text-slate-400 py-10">No campaign activity in this period.</td></tr>}
                    </tbody>
                </table></div>
                <p className="text-xs text-slate-400 px-5 py-3">A deal counts for the campaign its lead came from, otherwise the last campaign that emailed the contact before it was created.</p>
            </div>
        </div>
    );
}

export default function SalesReports() {
    const [params, setParams] = useSearchParams();
    const tab = params.get('tab') || 'leads';
    const [member, setMember] = useState('');
    const [period, setPeriod] = useState('90');
    return (
        <div className="w-full space-y-6">
            <PageHeader title="Sales reports" subtitle="Leads, SQLs, pipeline, forecast, targets and team performance for you and your team">
                {tab !== 'custom' && <MemberFilter value={member} onChange={setMember} />}
                {['leads', 'team', 'targets', 'roi'].includes(tab) && <PeriodFilter value={period} onChange={setPeriod} />}
            </PageHeader>
            <Seg options={[['leads', 'Leads & SQLs'], ['pipeline', 'Pipeline'], ['forecast', 'Forecast'], ['targets', 'Targets & leaderboard'], ['team', 'Team performance'], ['roi', 'Campaign ROI'], ['custom', 'Custom reports']]}
                value={tab} onChange={v => setParams({ tab: v })} />
            {tab === 'leads' && <LeadsTab member={member} period={period} />}
            {tab === 'pipeline' && <PipelineTab member={member} />}
            {tab === 'forecast' && <ForecastTab member={member} />}
            {tab === 'team' && <TeamTab member={member} period={period} />}
            {tab === 'targets' && <TargetsTab member={member} period={period} />}
            {tab === 'roi' && <RoiTab member={member} period={period} />}
            {tab === 'custom' && <CustomReports />}
        </div>
    );
}
