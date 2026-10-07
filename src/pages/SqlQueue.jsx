import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2, Inbox, AlertCircle, Rocket } from 'lucide-react';
import { leadsApi } from '../api/sales';
import { formatDateTime } from '../components/contacts/shared';
import { Empty, OwnerFilter, PageHeader, StatTile, card, cardShadow } from '../components/sales/shared';
import { ConvertModal } from './LeadDetail';

/** Sales-qualified leads waiting for conversion, oldest first (BR-LD-03, BR-LD-04). */
export default function SqlQueue() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [owner, setOwner] = useState('');
    const [converting, setConverting] = useState(null);
    const { data, isLoading } = useQuery({ queryKey: ['leads', 'sql-queue', owner], queryFn: () => leadsApi.sqlQueue({ owner }) });
    const items = data?.items || [];

    return (
        <div className="w-full space-y-6">
            <PageHeader title="SQL queue" subtitle="Sales-qualified leads to convert, oldest first">
                <OwnerFilter value={owner} onChange={setOwner} />
            </PageHeader>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <StatTile label="In queue" value={data?.total ?? '–'} />
                <StatTile label="Average age" value={data ? `${data.average_age_days}d` : '–'} />
                <StatTile label="Older than 14 days" value={data?.over_14_days ?? '–'} tone={data?.over_14_days ? 'text-amber-600' : undefined} />
                <StatTile label="No next step" value={data?.without_next_step ?? '–'} tone={data?.without_next_step ? 'text-amber-600' : undefined} />
                <StatTile label="Next step overdue" value={data?.overdue_next_step ?? '–'} tone={data?.overdue_next_step ? 'text-red-600' : undefined} />
            </div>
            {(data?.by_owner || []).length > 1 && (
                <div className={`${card} p-5`} style={cardShadow}>
                    <h2 className="text-sm font-bold text-slate-800 mb-3">By owner</h2>
                    <table className="w-full text-sm">
                        <thead><tr className="text-xs font-semibold text-left text-slate-400 uppercase tracking-wide"><th className="pb-2">Owner</th><th className="pb-2">SQLs</th><th className="pb-2">Oldest</th><th className="pb-2">No next step</th></tr></thead>
                        <tbody>{data.by_owner.map(o => (
                            <tr key={o.owner_id} className="border-t border-slate-50"><td className="py-1.5 text-slate-700">{o.owner_name}</td><td className="py-1.5 font-semibold">{o.count}</td>
                                <td className={`py-1.5 ${o.oldest_days > 14 ? 'text-amber-600 font-semibold' : 'text-slate-600'}`}>{o.oldest_days}d</td><td className="py-1.5 text-slate-600">{o.no_next_step}</td></tr>
                        ))}</tbody>
                    </table>
                </div>
            )}
            <div className={`${card} overflow-hidden`} style={cardShadow}>
                {isLoading ? <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                    : !items.length ? <Empty icon={Inbox} title="The SQL queue is empty" text="Leads appear here once all qualification criteria are confirmed." /> : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead><tr className="bg-slate-50/80 text-xs font-semibold text-left text-slate-400 uppercase tracking-wide">
                                    <th className="pl-5 pr-3 py-3">Lead</th><th className="px-3 py-3">Owner</th><th className="px-3 py-3">Age as SQL</th>
                                    <th className="px-3 py-3">Next step</th><th className="px-3 py-3">Source</th><th className="px-3 pr-5 py-3" />
                                </tr></thead>
                                <tbody className="divide-y divide-slate-50">
                                    {items.map(l => (
                                        <tr key={l.lead_id} onClick={() => navigate(`/app/leads/${l.lead_id}`)} className="cursor-pointer hover:bg-slate-50/70">
                                            <td className="pl-5 pr-3 py-3"><p className="text-sm font-semibold text-slate-800">{l.contact_name}</p><p className="text-xs text-slate-500">{l.company_name || l.contact_email}</p></td>
                                            <td className="px-3 py-3 text-sm text-slate-600">{l.owner_name}</td>
                                            <td className={`px-3 py-3 text-sm font-semibold ${l.sql_age_days > 14 ? 'text-amber-600' : 'text-slate-700'}`}>{l.sql_age_days ?? 0} days</td>
                                            <td className="px-3 py-3 text-sm">
                                                {l.next_step ? (
                                                    <span className={l.next_step_overdue ? 'text-red-600' : 'text-slate-700'}>
                                                        {l.next_step_overdue && <AlertCircle className="w-3.5 h-3.5 inline mr-1" />}{l.next_step}
                                                        {l.next_step_at && <span className="block text-xs text-slate-400">{formatDateTime(l.next_step_at)}</span>}
                                                    </span>
                                                ) : <span className="text-amber-600 text-xs font-semibold">No next step</span>}
                                            </td>
                                            <td className="px-3 py-3 text-sm text-slate-600">{l.source || '—'}</td>
                                            <td className="px-3 pr-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => setConverting(l)} className="h-8 px-3 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 inline-flex items-center gap-1.5">
                                                    <Rocket className="w-3.5 h-3.5" /> Convert
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
            </div>
            {converting && <ConvertModal lead={converting} onClose={() => setConverting(null)}
                onConverted={opp => { setConverting(null); queryClient.invalidateQueries({ queryKey: ['leads'] }); navigate(`/app/deals/${opp.opportunity_id}`); }} />}
        </div>
    );
}
