import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2, AlertTriangle, Trophy } from 'lucide-react';
import { dealsApi, moneyShort, pct, salesReportsApi } from '../api/sales';
import { Avatar, formatDateTime } from '../components/contacts/shared';
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

/** Everything in the period that needs someone to act: stale deals, ageing SQLs, next steps due. */
function Attention({ data }) {
    const { data: stale } = useQuery({ queryKey: ['deals', 'stale-all'], queryFn: () => dealsApi.list({ stale: true, status: 'OPEN', page_size: 4, sort_by: 'updated_at' }) });
    const rows = [
        ...(stale?.items || []).map(d => ({ key: d.opportunity_id, to: `/app/deals/${d.opportunity_id}`, tag: `Stale ${d.days_idle}d`, tone: 'bg-orange-50 text-orange-700', title: d.name, sub: `${d.owner_name || ''}${d.amount != null ? ` · ${moneyShort(d.amount)}` : ''}` })),
        ...data.queue.sql_leads.filter(l => (l.sql_age_days || 0) > 7).slice(0, 3).map(l => ({ key: l.lead_id, to: `/app/leads/${l.lead_id}`, tag: `SQL ${l.sql_age_days}d`, tone: 'bg-violet-50 text-violet-700', title: `${l.contact_name}${l.company_name ? ` · ${l.company_name}` : ''}`, sub: l.next_step || 'No next step set' })),
        ...data.queue.next_steps_due.filter(l => l.next_step_overdue).slice(0, 3).map(l => ({ key: `n${l.lead_id}`, to: `/app/leads/${l.lead_id}`, tag: 'Overdue', tone: 'bg-red-50 text-red-700', title: l.next_step, sub: `${l.contact_name} · ${formatDateTime(l.next_step_at)}` })),
    ];
    return (
        <div className={`${card} p-5`} style={cardShadow}>
            <div className="flex items-center justify-between mb-1"><h2 className="text-sm font-semibold text-slate-900">Needs attention</h2>
                <Link to="/app/deals?mode=list&stale=1&status=OPEN" className="text-xs font-semibold text-indigo-600">Stale deals</Link></div>
            <ul className="divide-y divide-slate-100">
                {rows.slice(0, 7).map(r => (
                    <li key={r.key}><Link to={r.to} className="flex items-center gap-3 py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg">
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${r.tone}`}>{r.tag}</span>
                        <span className="min-w-0"><span className="block text-sm font-medium text-slate-800 truncate">{r.title}</span><span className="block text-xs text-slate-500 truncate">{r.sub}</span></span>
                    </Link></li>
                ))}
                {!rows.length && <p className="text-sm text-slate-400 py-3">Nothing needs attention right now.</p>}
            </ul>
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
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatTile label="New leads" value={k.new_leads} sub={`${k.sqls} became SQL · ${k.open_sqls} SQLs open`} />
                    <StatTile label="Opportunities" value={k.opportunities_created} sub={`created · ${k.lost_count} lost`} />
                    <StatTile label="Open pipeline" value={moneyShort(k.open_pipeline)} sub={`${k.open_opportunities} deals · ${moneyShort(k.weighted_pipeline)} weighted`} />
                    <StatTile label="Won" value={moneyShort(k.won_amount)} sub={`${k.won_count} deals · win rate ${pct(k.win_rate)} · avg ${moneyShort(k.average_deal)}`} tone="text-emerald-600" />
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_1fr] gap-5">
                    <div className={`${card} p-5`} style={cardShadow}>
                        <div className="flex items-baseline justify-between mb-3">
                            <h2 className="text-sm font-semibold text-slate-900">Funnel</h2>
                            <span className="text-xs text-slate-500">Contacts emailed → won, {data.period.from} to {data.period.to}</span>
                        </div>
                        <Funnel stages={data.funnel} />
                    </div>
                    <Attention data={data} />
                </div>
                {data.teams.length > 0 && (
                    <div className={`${card} overflow-hidden`} style={cardShadow}>
                        <div className="flex items-baseline justify-between px-5 pt-4 pb-2">
                            <h2 className="text-sm font-semibold text-slate-900">{data.role_view === 'SALES_HEAD' ? 'By team' : 'By team member'}</h2>
                            <span className="text-xs text-slate-500">Click a row to drill in</span>
                        </div>
                        <div className="overflow-x-auto"><table className="w-full text-sm">
                            <thead><tr className="text-[11px] font-semibold text-left text-slate-400 uppercase tracking-wide border-b border-slate-100">
                                <th className="pl-5 py-2">{data.role_view === 'SALES_HEAD' ? 'Team' : 'Person'}</th><th className="px-3 py-2 text-right">Leads</th><th className="px-3 py-2 text-right">SQLs</th>
                                <th className="px-3 py-2 text-right">Open pipeline</th><th className="px-3 py-2 text-right">Won</th><th className="px-3 pr-5 py-2 text-right">Win rate</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-100">{data.teams.map(t => (
                                <tr key={t.user_id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setMember(t.user_id)}>
                                    <td className="pl-5 py-2.5"><div className="flex items-center gap-2.5"><Avatar first={t.name.split(' ')[0]} last={t.name.split(' ').slice(-1)[0]} seed={t.user_id} size="sm" />
                                        <div><p className="font-medium text-slate-800">{t.name}</p><p className="text-xs text-slate-400">{t.level_label || ''}{t.members > 1 ? ` · ${t.members} people` : ''}</p></div></div></td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{t.new_leads}</td><td className="px-3 py-2.5 text-right tabular-nums">{t.sqls}</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{moneyShort(t.open_pipeline)}</td><td className="px-3 py-2.5 text-right tabular-nums">{moneyShort(t.won_amount)}</td>
                                    <td className="px-3 pr-5 py-2.5 text-right tabular-nums">{pct(t.win_rate)}</td>
                                </tr>
                            ))}</tbody>
                        </table></div>
                    </div>
                )}
                {(data.leaderboard || []).length > 0 && (
                    <div className={`${card} p-5`} style={cardShadow}>
                        <div className="flex items-center justify-between mb-2"><h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5"><Trophy className="w-4 h-4 text-amber-500" /> Leaderboard</h2><Link to="/app/sales-reports?tab=targets" className="text-xs font-semibold text-indigo-600">Targets →</Link></div>
                        <ol className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            {data.leaderboard.map(r => (
                                <li key={r.user_id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${r.rank === 1 ? 'bg-amber-100 text-amber-700' : 'bg-white text-slate-500'}`}>{r.rank}</span>
                                    <span className="min-w-0"><span className="block text-sm font-medium text-slate-800 truncate">{r.name}</span><span className="block text-xs text-slate-500 tabular-nums">{moneyShort(r.won_amount)} · {r.won_count} won</span></span>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
                {limit && <p className="text-xs text-slate-400">New contacts emailed today: {limit.used_today} of {limit.limit} (follow-ups not counted).</p>}
            </>)}
        </div>
    );
}
