import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Briefcase, Loader2 } from 'lucide-react';
import { dealsApi, money } from '../../api/sales';
import { DealStatusBadge, useLeadsMeta } from './shared';

/** The company's opportunities (deals), newest close date first, on the company record. */
export default function AccountDeals({ accountId }) {
    const meta = useLeadsMeta();
    const canSeeAmounts = meta?.can_see_amounts !== false;
    const { data, isLoading } = useQuery({
        queryKey: ['deals', 'account', accountId],
        queryFn: () => dealsApi.list({ account_id: accountId, page_size: 100, sort_by: 'close_date', sort_order: 'desc' }),
    });
    const items = data?.items || [];
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Briefcase className="w-4 h-4 text-indigo-500" /> Deals{data ? ` (${data.total})` : ''}</h2>
                {canSeeAmounts && data?.total > 0 && <span className="text-sm text-slate-500">{money(data.total_amount)} total</span>}
            </div>
            {isLoading ? (
                <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
            ) : items.length === 0 ? (
                <p className="text-sm text-slate-400 py-10 text-center">No deals with this company yet.</p>
            ) : (
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50/80 text-xs font-semibold text-left text-slate-400 uppercase tracking-wide">
                            <th className="px-5 py-2.5">Deal</th><th className="px-3 py-2.5">Stage</th>
                            {canSeeAmounts && <th className="px-3 py-2.5 text-right">Amount</th>}
                            <th className="px-3 pr-5 py-2.5 text-right">Close date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {items.map(d => (
                            <tr key={d.opportunity_id} className="hover:bg-slate-50/70">
                                <td className="px-5 py-3 min-w-0">
                                    <Link to={`/app/deals/${d.opportunity_id}`} className="font-semibold text-slate-800 hover:text-indigo-700">{d.name}</Link>
                                    {d.owner_name && <p className="text-xs text-slate-500 truncate">{d.owner_name}</p>}
                                </td>
                                <td className="px-3 py-3"><DealStatusBadge status={d.status} stageName={d.stage_name} /></td>
                                {canSeeAmounts && <td className="px-3 py-3 text-right tabular-nums">{money(d.amount)}</td>}
                                <td className={`px-3 pr-5 py-3 text-right tabular-nums ${d.overdue ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>{d.close_date || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
