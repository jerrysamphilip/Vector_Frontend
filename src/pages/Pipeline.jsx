import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { dealsApi, money, moneyShort, proposalsApi } from '../api/sales';
import { relativeDate } from '../components/contacts/shared';
import { ClientTypeBadge, ClientTypeFilter, HBar, OwnerFilter, PageHeader, Seg, StatTile, card, cardShadow } from '../components/sales/shared';

const PROPOSAL_TONE = { DRAFT: 'border-slate-300', SENT: 'border-sky-400', UNDER_REVIEW: 'border-amber-400', ACCEPTED: 'border-emerald-500', REJECTED: 'border-red-400' };

/** Revenue pipeline by stage, weighted and unweighted (BR-SP-03/04). */
function Revenue({ owner, clientType }) {
    const navigate = useNavigate();
    const { data, isLoading } = useQuery({ queryKey: ['deals', 'revenue', owner, clientType], queryFn: () => dealsApi.revenue({ owner, client_type: clientType }) });
    if (isLoading) return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>;
    const t = data.totals;
    const open = data.stages.filter(s => s.status === 'OPEN');
    const max = Math.max(...open.map(s => s.amount), 0);
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile label="Open pipeline" value={moneyShort(t.open_amount)} sub={`${t.open_count} open deals`} />
                <StatTile label="Weighted pipeline" value={moneyShort(t.weighted_amount)} sub="Amount × stage probability" />
                <StatTile label="Won" value={moneyShort(t.won_amount)} sub={`${t.won_count} deals`} tone="text-emerald-600" />
                <StatTile label="Lost" value={moneyShort(t.lost_amount)} sub={`${t.lost_count} deals`} tone="text-slate-500" />
            </div>
            <div className={`${card} p-5`} style={cardShadow}>
                <h2 className="text-sm font-bold text-slate-800">Open pipeline by stage</h2>
                <p className="text-xs text-slate-500 mb-3">Bar length is the unweighted amount. Click a stage to see its deals.</p>
                {open.map(s => (
                    <HBar key={s.stage_id} label={`${s.name} (${s.probability}%)`} value={s.amount} max={max} display={moneyShort(s.amount)}
                        sub={`weighted ${moneyShort(s.weighted)} · ${s.count} deals`} onClick={() => navigate(`/app/deals?mode=list&status=OPEN`)} />
                ))}
            </div>
            <div className={`${card} overflow-hidden`} style={cardShadow}>
                <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50/80 text-xs font-semibold text-left text-slate-400 uppercase tracking-wide">
                        <th className="pl-5 py-3">Stage</th><th className="px-3 py-3 text-right">Probability</th><th className="px-3 py-3 text-right">Deals</th>
                        <th className="px-3 py-3 text-right">Amount</th><th className="px-3 py-3 text-right">Weighted</th><th className="px-3 py-3 text-right">New clients</th><th className="px-3 pr-5 py-3 text-right">Existing clients</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {data.stages.map(s => (
                            <tr key={s.stage_id}>
                                <td className="pl-5 py-2.5 font-medium text-slate-800">{s.name}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{s.probability}%</td>
                                <td className="px-3 py-2.5 text-right tabular-nums">{s.count}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{money(s.amount)}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{s.status === 'OPEN' ? money(s.weighted) : '—'}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{money(s.new_amount)}</td>
                                <td className="px-3 pr-5 py-2.5 text-right tabular-nums text-slate-600">{money(s.existing_amount)}</td>
                            </tr>
                        ))}
                        <tr className="bg-slate-50/60 font-semibold">
                            <td className="pl-5 py-2.5">Open total</td><td /><td className="px-3 py-2.5 text-right tabular-nums">{t.open_count}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{money(t.open_amount)}</td><td className="px-3 py-2.5 text-right tabular-nums">{money(t.weighted_amount)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{money(t.by_client_type.NEW.amount)}</td><td className="px-3 pr-5 py-2.5 text-right tabular-nums">{money(t.by_client_type.EXISTING.amount)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/** Proposal pipeline: draft, sent, under review, accepted, rejected (BR-SP-02). */
function Proposals({ owner, clientType }) {
    const { data, isLoading } = useQuery({ queryKey: ['proposals', owner, clientType], queryFn: () => proposalsApi.list({ owner, client_type: clientType }) });
    if (isLoading) return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>;
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {data.columns.map(col => (
                <div key={col.status} className={`bg-slate-50/80 rounded-2xl p-3 border-t-4 ${PROPOSAL_TONE[col.status]}`}>
                    <div className="px-1 mb-2">
                        <div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-700">{col.label}</span><span className="text-xs font-semibold text-slate-500">{col.count}</span></div>
                        <p className="text-xs text-slate-500">{money(col.amount)}</p>
                    </div>
                    <div className="space-y-2">
                        {col.items.map(p => (
                            <Link key={p.proposal_id} to={`/app/deals/${p.opportunity_id}`} className="block bg-white rounded-xl border border-slate-100 p-3 hover:border-indigo-200">
                                <p className="text-sm font-semibold text-slate-800 truncate">{p.title}</p>
                                <p className="text-xs text-slate-500 truncate">{p.company_name || p.opportunity_name}</p>
                                <div className="flex items-center justify-between mt-2"><span className="text-sm font-bold">{moneyShort(p.amount)}</span><ClientTypeBadge value={p.client_type} /></div>
                                <p className="text-[11px] text-slate-400 mt-1">{p.owner_name} · {relativeDate(p.sent_at || p.created_at)}</p>
                            </Link>
                        ))}
                        {!col.count && <p className="text-xs text-slate-400 text-center py-6">None</p>}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function Pipeline() {
    const [params, setParams] = useSearchParams();
    const tab = params.get('tab') || 'revenue';
    const owner = params.get('owner') || '';
    const clientType = params.get('client_type') || '';
    const update = (patch) => setParams(p => { const n = new URLSearchParams(p); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); return n; });
    return (
        <div className="w-full space-y-6">
            <PageHeader title="Pipeline" subtitle="Revenue and proposals across new and existing clients" />
            <div className={`${card} px-5 py-4 flex items-center gap-3 flex-wrap`} style={cardShadow}>
                <Seg options={[['revenue', 'Revenue pipeline'], ['proposals', 'Proposal pipeline']]} value={tab} onChange={v => update({ tab: v })} />
                <OwnerFilter value={owner} onChange={v => update({ owner: v })} />
                <ClientTypeFilter value={clientType} onChange={v => update({ client_type: v })} />
            </div>
            {tab === 'revenue' ? <Revenue owner={owner} clientType={clientType} /> : <Proposals owner={owner} clientType={clientType} />}
        </div>
    );
}
