import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, AlertTriangle, Clock, MessageSquareReply, CalendarClock, BarChart3 } from 'lucide-react';
import { tasksApi } from '../api/contacts';
import { dealsApi, leadsApi, money, moneyShort, pct, salesReportsApi } from '../api/sales';
import { getStoredUser } from '../lib/authStorage';
import { formatDateTime, relativeDate } from '../components/contacts/shared';
import { StatTile, card, periodRange } from '../components/sales/shared';
import { Funnel } from './SalesDashboard';

function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function RailSection({ title, count, to, children }) {
    return (
        <section>
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-slate-900">{title}{count > 0 && <span className="ml-1.5 text-xs font-medium text-slate-400">{count}</span>}</h2>
                {to && <Link to={to} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">View all</Link>}
            </div>
            {children}
        </section>
    );
}

/** Today's work: tasks due, new replies to act on, deals going quiet (redesign: "My day"). */
function MyDay() {
    const qc = useQueryClient();
    const { data: tasks } = useQuery({ queryKey: ['tasks', 'my-day'], queryFn: () => tasksApi.list({ due: 'today', page_size: 8 }) });
    const { data: replies } = useQuery({ queryKey: ['reply-suggestions'], queryFn: leadsApi.replySuggestions });
    const { data: stale } = useQuery({ queryKey: ['deals', 'stale-mine'], queryFn: () => dealsApi.list({ stale: true, owner: 'me', status: 'OPEN', page_size: 5, sort_by: 'updated_at' }) });
    const done = useMutation({
        mutationFn: (t) => tasksApi.update(t.task_id, { status: 'DONE' }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
    });
    const createLead = useMutation({
        mutationFn: (id) => leadsApi.fromMessage(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['reply-suggestions'] }); qc.invalidateQueries({ queryKey: ['leads'] }); },
    });
    const now = Date.now();
    return (
        <aside className={`${card} p-5 space-y-6 h-fit xl:sticky xl:top-20`}>
            <RailSection title="My day" count={tasks?.total} to="/app/tasks">
                <ul className="divide-y divide-slate-100">
                    {(tasks?.items || []).map(t => {
                        const overdue = t.overdue;
                        return (
                            <li key={t.task_id} className="flex items-start gap-2.5 py-2">
                                <input type="checkbox" className="mt-0.5 accent-indigo-600 w-4 h-4" aria-label={`Complete ${t.title}`}
                                    onChange={() => done.mutate(t)} />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">{t.title}</p>
                                    <p className={`text-xs ${overdue ? 'text-red-600' : 'text-slate-500'}`}>
                                        {overdue ? 'Overdue · ' : ''}{t.due_at ? formatDateTime(t.due_at) : 'No due time'}
                                        {t.contact_name || t.opportunity_name ? ` · ${t.opportunity_name || t.contact_name}` : ''}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                    {tasks && !tasks.items.length && <p className="text-sm text-slate-400 py-2">Nothing due today.</p>}
                </ul>
            </RailSection>

            {(replies?.items || []).length > 0 && (
                <RailSection title="New replies" count={replies.items.length} to="/app/leads">
                    <div className="space-y-2">
                        {replies.items.slice(0, 3).map(r => (
                            <div key={r.message_id} className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100">
                                <p className="text-sm font-semibold text-slate-800 truncate">{r.contact_name}{r.company_name && <span className="font-normal text-slate-500"> · {r.company_name}</span>}</p>
                                <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{r.snippet || r.subject}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <button onClick={() => createLead.mutate(r.message_id)} disabled={createLead.isPending}
                                        className="h-7 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-60">Create lead</button>
                                    <Link to="/app/inbox" className="h-7 px-2.5 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-700 flex items-center">Reply</Link>
                                    <span className="ml-auto text-[11px] text-slate-400">{relativeDate(r.received_at)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </RailSection>
            )}

            <RailSection title="Going stale" count={stale?.total} to="/app/deals?mode=list&stale=1&status=OPEN">
                <ul className="space-y-1.5">
                    {(stale?.items || []).map(d => (
                        <li key={d.opportunity_id}>
                            <Link to={`/app/deals/${d.opportunity_id}`} className="flex items-center gap-2 text-sm hover:text-indigo-700">
                                <span className="px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 tabular-nums">{d.days_idle}d</span>
                                <span className="truncate">{d.name}</span>
                            </Link>
                        </li>
                    ))}
                    {stale && !stale.items.length && <p className="text-sm text-slate-400">No stale deals. Nice.</p>}
                </ul>
            </RailSection>
            <p className="text-[11px] text-slate-400">Updated {new Date(now).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
        </aside>
    );
}

export default function Home() {
    const me = getStoredUser();
    const range = periodRange('quarter');
    const { data } = useQuery({ queryKey: ['sales-dashboard', 'quarter', ''], queryFn: () => salesReportsApi.dashboard(range) });
    const { data: targets } = useQuery({ queryKey: ['rep-targets', '', '', ''], queryFn: () => salesReportsApi.targets({}) });
    const k = data?.kpis;
    const t = targets?.totals;
    const attainment = t?.target ? Math.min(100, (t.won / t.target) * 100) : null;
    const today = new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
            <div className="space-y-5 min-w-0">
                <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{today}</p>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mt-1">{greeting()}, {me?.first_name || 'there'}</h1>
                    {t?.target ? <p className="text-sm text-slate-500 mt-0.5">{targets.fy_label}: {moneyShort(t.won)} won, {pct(t.attainment)} of the {moneyShort(t.target)} target.</p> : null}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatTile label="New leads" value={k ? k.new_leads : '—'} sub={k ? `this quarter · ${k.sqls} became SQL` : ''} />
                    <StatTile label="Open pipeline" value={k ? moneyShort(k.open_pipeline) : '—'} sub={k ? `${k.open_opportunities} deals · ${moneyShort(k.weighted_pipeline)} weighted` : ''} />
                    <StatTile label="Won this quarter" value={k ? moneyShort(k.won_amount) : '—'} sub={k ? `${k.won_count} deals · win rate ${pct(k.win_rate)}` : ''} tone="text-emerald-600" />
                    <div className={`${card} px-4 py-3`}>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Won vs year target</p>
                        <p className="text-2xl font-bold tracking-tight mt-1 tabular-nums">{t ? moneyShort(t.won) : '—'}</p>
                        <div className="h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${attainment || 0}%` }} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{t?.target ? `${pct(t.attainment)} of ${moneyShort(t.target)}` : 'No target set'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5">
                    <section className={`${card} p-5`}>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-slate-900">Funnel this quarter</h2>
                            <Link to="/app/sales" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">Sales overview <ArrowRight className="w-3.5 h-3.5" /></Link>
                        </div>
                        {data ? <Funnel stages={data.funnel} /> : <p className="text-sm text-slate-400">Loading…</p>}
                    </section>
                    <section className={`${card} p-5`}>
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5"><CalendarClock className="w-4 h-4 text-slate-400" /> Closing in the next 30 days</h2>
                            <Link to="/app/deals" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">Deals</Link>
                        </div>
                        <ul className="divide-y divide-slate-100">
                            {(data?.queue?.deals_closing || []).slice(0, 6).map(d => (
                                <li key={d.opportunity_id}>
                                    <Link to={`/app/deals/${d.opportunity_id}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:text-indigo-700">
                                        <span className="truncate">{d.name}</span>
                                        <span className="tabular-nums text-slate-500 whitespace-nowrap">{money(d.amount)} · {d.close_date}</span>
                                    </Link>
                                </li>
                            ))}
                            {data && !data.queue.deals_closing.length && <p className="text-sm text-slate-400 py-2">Nothing closing soon.</p>}
                        </ul>
                    </section>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <section className={`${card} p-5`}>
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" /> SQLs waiting to convert</h2>
                            <Link to="/app/sql-queue" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">SQL queue</Link>
                        </div>
                        <ul className="divide-y divide-slate-100">
                            {(data?.queue?.sql_leads || []).slice(0, 5).map(l => (
                                <li key={l.lead_id}>
                                    <Link to={`/app/leads/${l.lead_id}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:text-indigo-700">
                                        <span className="truncate">{l.contact_name} <span className="text-slate-400">{l.company_name}</span></span>
                                        <span className={`text-xs font-semibold ${l.sql_age_days > 14 ? 'text-amber-600' : 'text-slate-500'}`}>{l.sql_age_days}d</span>
                                    </Link>
                                </li>
                            ))}
                            {data && !data.queue.sql_leads.length && <p className="text-sm text-slate-400 py-2">No SQLs waiting.</p>}
                        </ul>
                    </section>
                    <section className={`${card} p-5`}>
                        <h2 className="text-sm font-semibold text-slate-900 mb-3">Jump to</h2>
                        <div className="grid grid-cols-2 gap-2">
                            {[['/app/analytics', 'Campaign analytics', BarChart3], ['/app/inbox', 'Inbox', MessageSquareReply],
                              ['/app/sales-reports?tab=forecast', 'Forecast', CalendarClock], ['/app/deals?mode=list&stale=1&status=OPEN', 'Stale deals', AlertTriangle]].map(([to, label, Icon]) => (
                                <Link key={to} to={to} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40">
                                    <Icon className="w-4 h-4 text-slate-400" /> {label}
                                </Link>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
            <MyDay />
        </div>
    );
}
