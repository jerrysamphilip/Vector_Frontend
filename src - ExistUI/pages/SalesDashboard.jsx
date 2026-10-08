import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2, AlertTriangle, Trophy } from 'lucide-react';
import { money, moneyShort, pct, salesReportsApi } from '../api/sales';
import { formatDateTime } from '../components/contacts/shared';
import { HBar, MemberFilter, PageHeader, PeriodFilter, StatTile, card, cardShadow, periodRange } from '../components/sales/shared';

const VIEW_TITLE = {
    SALES_HEAD: ['Sales head dashboard', 'Every team, every rep'],
    BUSINESS_DEVELOPMENT: ['Business development dashboard', 'You and your team'],
    BUSINESS_EXECUTIVE: ['My sales dashboard', 'Your leads, SQLs and deals'],
};

/** Sent -> replied -> lead -> SQL -> opportunity -> won (BR-DR-03). One hue; values as text. */
export function Funnel({ stages }) {
    const max = Math.max(...stages.map(s => s.count), 0);
    return (
        <div>
            {stages.map((s, i) => (
                <HBar key={s.key} label={s.label} value={s.count} max={max} display={s.count.toLocaleString()}
                    sub={i ? (s.from_previous != null ? `${s.from_previous}% of previous` : '—') : null} />
            ))}
        </div>
    );
}

export default function SalesDashboard() {
    const [period, setPeriod] = useState('90');
    const [member, setMember] = useState('');
    const range = periodRange(period);
    const { data, isLoading } = useQuery({ queryKey: ['sales-dashboard', period, member], queryFn: () => salesReportsApi.dashboard({ ...range, member }) });
    const { data: limit } = useQuery({ queryKey: ['daily-limit'], queryFn: salesReportsApi.dailyLimit });
    const [title, subtitle] = VIEW_TITLE[data?.role_view] || ['Sales dashboard', ''];
    const k = data?.kpis;

    return (
        <div className="w-full space-y-6">
            <PageHeader title={title} subtitle={subtitle}>
                <MemberFilter value={member} onChange={setMember} />
                <PeriodFilter value={period} onChange={setPeriod} />
            </PageHeader>
            {limit?.reached && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />{limit.message}
                </div>
            )}
            {isLoading || !data ? <div className="py-24 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div> : (<>
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
                    <StatTile label="New leads" value={k.new_leads} />
                    <StatTile label="SQLs" value={k.sqls} sub={`${k.open_sqls} open now`} />
                    <StatTile label="Opportunities" value={k.opportunities_created} sub="created" />
                    <StatTile label="Open pipeline" value={moneyShort(k.open_pipeline)} sub={`${k.open_opportunities} deals`} />
                    <StatTile label="Weighted" value={moneyShort(k.weighted_pipeline)} />
                    <StatTile label="Won" value={moneyShort(k.won_amount)} sub={`${k.won_count} deals`} tone="text-emerald-600" />
                    <StatTile label="Win rate" value={pct(k.win_rate)} sub={`${k.lost_count} lost`} />
                    <StatTile label="Avg deal" value={moneyShort(k.average_deal)} />
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    <div className={`${card} p-5`} style={cardShadow}>
                        <h2 className="text-sm font-bold text-slate-800">Funnel</h2>
                        <p className="text-xs text-slate-500 mb-3">Contacts emailed through to deals won, {data.period.from} to {data.period.to}</p>
                        <Funnel stages={data.funnel} />
                    </div>
                    {data.teams.length > 0 ? (
                        <div className={`${card} overflow-hidden`} style={cardShadow}>
                            <h2 className="text-sm font-bold text-slate-800 px-5 pt-5 pb-3">{data.role_view === 'SALES_HEAD' ? 'By team' : 'By team member'}</h2>
                            <div className="overflow-x-auto"><table className="w-full text-sm">
                                <thead><tr className="bg-slate-50/80 text-xs font-semibold text-left text-slate-400 uppercase tracking-wide">
                                    <th className="pl-5 py-2.5">{data.role_view === 'SALES_HEAD' ? 'Team' : 'Person'}</th><th className="px-3 py-2.5 text-right">Leads</th><th className="px-3 py-2.5 text-right">SQLs</th>
                                    <th className="px-3 py-2.5 text-right">Open pipeline</th><th className="px-3 py-2.5 text-right">Won</th><th className="px-3 pr-5 py-2.5 text-right">Win rate</th>
                                </tr></thead>
                                <tbody className="divide-y divide-slate-50">{data.teams.map(t => (
                                    <tr key={t.user_id} className="hover:bg-slate-50/60 cursor-pointer" onClick={() => setMember(t.user_id)}>
                                        <td className="pl-5 py-2.5"><p className="font-semibold text-slate-800">{t.name}</p><p className="text-xs text-slate-400">{t.level_label || ''}{t.members > 1 ? ` · ${t.members} people` : ''}</p></td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">{t.new_leads}</td><td className="px-3 py-2.5 text-right tabular-nums">{t.sqls}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">{moneyShort(t.open_pipeline)}</td><td className="px-3 py-2.5 text-right tabular-nums">{moneyShort(t.won_amount)}</td>
                                        <td className="px-3 pr-5 py-2.5 text-right tabular-nums">{pct(t.win_rate)}</td>
                                    </tr>
                                ))}</tbody>
                            </table></div>
                        </div>
                    ) : (
                        <div className={`${card} p-5`} style={cardShadow}>
                            <h2 className="text-sm font-bold text-slate-800 mb-3">Deals closing in the next 30 days</h2>
                            <ul className="divide-y divide-slate-50">
                                {data.queue.deals_closing.map(d => (
                                    <li key={d.opportunity_id}><Link to={`/app/deals/${d.opportunity_id}`} className="flex justify-between py-2 text-sm hover:text-indigo-700">
                                        <span className="truncate">{d.name}</span><span className="tabular-nums text-slate-600">{money(d.amount)} · {d.close_date}</span></Link></li>
                                ))}
                                {!data.queue.deals_closing.length && <p className="text-sm text-slate-400">Nothing closing soon.</p>}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {(data.leaderboard || []).length > 0 && (
                        <div className={`${card} p-5`} style={cardShadow}>
                            <div className="flex items-center justify-between mb-2"><h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Trophy className="w-4 h-4 text-amber-500" /> Leaderboard</h2><Link to="/app/sales-reports?tab=targets" className="text-xs font-semibold text-indigo-600">Targets →</Link></div>
                            <ol className="divide-y divide-slate-50">
                                {data.leaderboard.map(r => (
                                    <li key={r.user_id} className="flex items-center gap-3 py-2 text-sm">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${r.rank === 1 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{r.rank}</span>
                                        <span className="flex-1 truncate text-slate-800">{r.name}</span>
                                        <span className="tabular-nums font-semibold text-slate-700">{moneyShort(r.won_amount)}</span>
                                        <span className="text-xs text-slate-400 w-14 text-right">{r.won_count} won</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                    <div className={`${card} p-5`} style={cardShadow}>
                        <div className="flex items-center justify-between mb-2"><h2 className="text-sm font-bold text-slate-800">My SQLs to convert</h2><Link to="/app/sql-queue" className="text-xs font-semibold text-indigo-600">SQL queue →</Link></div>
                        <ul className="divide-y divide-slate-50">
                            {data.queue.sql_leads.map(l => (
                                <li key={l.lead_id}><Link to={`/app/leads/${l.lead_id}`} className="flex justify-between py-2 text-sm hover:text-indigo-700">
                                    <span className="truncate">{l.contact_name} <span className="text-slate-400">{l.company_name}</span></span><span className={l.sql_age_days > 14 ? 'text-amber-600 font-semibold' : 'text-slate-500'}>{l.sql_age_days}d</span></Link></li>
                            ))}
                            {!data.queue.sql_leads.length && <p className="text-sm text-slate-400">No SQLs waiting.</p>}
                        </ul>
                    </div>
                    <div className={`${card} p-5`} style={cardShadow}>
                        <h2 className="text-sm font-bold text-slate-800 mb-2">My next steps due</h2>
                        <ul className="divide-y divide-slate-50">
                            {data.queue.next_steps_due.map(l => (
                                <li key={l.lead_id}><Link to={`/app/leads/${l.lead_id}`} className="flex justify-between py-2 text-sm hover:text-indigo-700">
                                    <span className="truncate">{l.next_step} <span className="text-slate-400">· {l.contact_name}</span></span><span className={l.next_step_overdue ? 'text-red-600' : 'text-slate-500'}>{formatDateTime(l.next_step_at)}</span></Link></li>
                            ))}
                            {!data.queue.next_steps_due.length && <p className="text-sm text-slate-400">Nothing due.</p>}
                        </ul>
                    </div>
                </div>
                {limit && <p className="text-xs text-slate-400">New contacts emailed today: {limit.used_today} of {limit.limit} (follow-ups not counted).</p>}
            </>)}
        </div>
    );
}
