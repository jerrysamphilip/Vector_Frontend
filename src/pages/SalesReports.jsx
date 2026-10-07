import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { money, moneyShort, pct, salesReportsApi } from '../api/sales';
import { ClientTypeFilter, HBar, MemberFilter, PageHeader, PeriodFilter, Seg, StatTile, card, cardShadow, periodRange, selectSm } from '../components/sales/shared';
import { Funnel } from './SalesDashboard';

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
                    <th className="pl-5 py-2.5">Period</th><th className={th}>Won</th><th className={th}>Open pipeline</th><th className={th}>Weighted</th><th className={th}>Forecast</th><th className={`${th} pr-5`}>Best case</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {data.quarters.map(q => (
                            <tr key={q.quarter}><td className="pl-5 py-2.5"><Link className="text-indigo-600 hover:text-indigo-800" to={link(q)}>{q.label}</Link></td>
                                <td className={td}>{money(q.won)}</td><td className={td}>{money(q.pipeline)}</td><td className={td}>{money(q.weighted)}</td><td className={`${td} font-semibold`}>{money(q.forecast)}</td><td className={`${td} pr-5`}>{money(q.best_case)}</td></tr>
                        ))}
                        <tr className="bg-slate-50/60 font-semibold"><td className="pl-5 py-2.5"><Link className="text-indigo-600" to={link(data.total)}>{data.label}</Link></td>
                            <td className={td}>{money(data.total.won)}</td><td className={td}>{money(data.total.pipeline)}</td><td className={td}>{money(data.total.weighted)}</td><td className={td}>{money(data.total.forecast)}</td><td className={`${td} pr-5`}>{money(data.total.best_case)}</td></tr>
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

export default function SalesReports() {
    const [params, setParams] = useSearchParams();
    const tab = params.get('tab') || 'leads';
    const [member, setMember] = useState('');
    const [period, setPeriod] = useState('90');
    return (
        <div className="w-full space-y-6">
            <PageHeader title="Sales reports" subtitle="Leads, SQLs, pipeline, forecast and team performance for you and your team">
                <MemberFilter value={member} onChange={setMember} />
                {['leads', 'team'].includes(tab) && <PeriodFilter value={period} onChange={setPeriod} />}
            </PageHeader>
            <Seg options={[['leads', 'Leads & SQLs'], ['pipeline', 'Pipeline'], ['forecast', 'Forecast'], ['team', 'Team performance']]}
                value={tab} onChange={v => setParams({ tab: v })} />
            {tab === 'leads' && <LeadsTab member={member} period={period} />}
            {tab === 'pipeline' && <PipelineTab member={member} />}
            {tab === 'forecast' && <ForecastTab member={member} />}
            {tab === 'team' && <TeamTab member={member} period={period} />}
        </div>
    );
}
