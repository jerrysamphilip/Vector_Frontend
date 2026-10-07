import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, FileText, Plus, History, Trash2 } from 'lucide-react';
import { errorMessage } from '../api/contacts';
import { dealsApi, money, proposalsApi, stagesApi } from '../api/sales';
import { ErrorNote, Field, OwnerSelect, PrimaryButton, formatDateTime, inputClass, relativeDate } from '../components/contacts/shared';
import { ClientTypeBadge, DealStatusBadge, card, cardShadow, selectSm, useLeadsMeta, useTeamOwners } from '../components/sales/shared';

const PROPOSAL_TONE = { DRAFT: 'bg-slate-100 text-slate-600', SENT: 'bg-sky-50 text-sky-700', UNDER_REVIEW: 'bg-amber-50 text-amber-700',
    ACCEPTED: 'bg-emerald-50 text-emerald-700', REJECTED: 'bg-red-50 text-red-700' };

function Proposals({ deal, onChanged }) {
    const meta = useLeadsMeta();
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState(null);
    const create = useMutation({ mutationFn: () => proposalsApi.create({ opportunity_id: deal.opportunity_id, title: title || undefined, amount: amount || undefined }),
        onSuccess: () => { setTitle(''); setAmount(''); onChanged(); }, onError: e => setError(errorMessage(e)) });
    const update = useMutation({ mutationFn: ({ id, payload }) => proposalsApi.update(id, payload), onSuccess: onChanged, onError: e => setError(errorMessage(e)) });
    const remove = useMutation({ mutationFn: proposalsApi.remove, onSuccess: onChanged });
    return (
        <div className={`${card} p-5`} style={cardShadow}>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3"><FileText className="w-4 h-4 text-indigo-500" /> Proposals</h2>
            <ul className="space-y-2">
                {deal.proposals.map(p => (
                    <li key={p.proposal_id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{p.title}</p>
                            <p className="text-xs text-slate-500">{money(p.amount)}{p.sent_at ? ` · sent ${relativeDate(p.sent_at)}` : ''}{p.decided_at ? ` · decided ${relativeDate(p.decided_at)}` : ''}</p>
                        </div>
                        <select value={p.status} onChange={e => update.mutate({ id: p.proposal_id, payload: { status: e.target.value } })}
                            className={`h-8 px-2 rounded-lg text-xs font-semibold border-0 ${PROPOSAL_TONE[p.status]}`} aria-label="Proposal status">
                            {(meta?.proposal_statuses || []).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <button onClick={() => window.confirm('Delete this proposal?') && remove.mutate(p.proposal_id)} className="p-1.5 text-slate-300 hover:text-red-500" aria-label="Delete proposal"><Trash2 className="w-4 h-4" /></button>
                    </li>
                ))}
                {!deal.proposals.length && <p className="text-sm text-slate-400">No proposals yet.</p>}
            </ul>
            <div className="flex items-end gap-2 mt-3">
                <Field label="Title" className="flex-1"><input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} placeholder={`Proposal - ${deal.name}`} /></Field>
                <Field label="Amount" className="w-32"><input className={inputClass} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder={deal.amount ?? ''} /></Field>
                <PrimaryButton onClick={() => create.mutate()} loading={create.isPending}><Plus className="w-4 h-4" /> Add</PrimaryButton>
            </div>
            <div className="mt-2"><ErrorNote message={error} /></div>
        </div>
    );
}

export default function DealDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const owners = useTeamOwners();
    const { data: stages = [] } = useQuery({ queryKey: ['sales-stages'], queryFn: () => stagesApi.list() });
    const { data: deal, isLoading, error: loadError } = useQuery({ queryKey: ['deal', id], queryFn: () => dealsApi.get(id), retry: false });
    const [form, setForm] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (deal) setForm({ name: deal.name, amount: deal.amount ?? '', close_date: deal.close_date || '', client_type: deal.client_type,
            next_step: deal.next_step || '', closed_reason: deal.closed_reason || '', description: deal.description || '' });
    }, [deal]);
    const refresh = () => ['deal', 'deals', 'proposals', 'leads'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
    const save = useMutation({
        mutationFn: payload => dealsApi.update(id, payload),
        onSuccess: data => { queryClient.setQueryData(['deal', id], data); setError(null); refresh(); },
        onError: e => setError(errorMessage(e)),
    });
    const remove = useMutation({ mutationFn: () => dealsApi.remove(id), onSuccess: () => { refresh(); navigate('/app/deals'); }, onError: e => setError(errorMessage(e)) });

    if (isLoading || (deal && !form)) return <div className="py-32 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-indigo-500" /></div>;
    if (loadError || !deal) return <div className="py-24 text-center"><p className="text-lg font-bold text-slate-800">Opportunity not found</p><Link to="/app/deals" className="inline-block mt-4 text-sm font-semibold text-indigo-600">← Back to opportunities</Link></div>;

    const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
    const blurSave = (k, transform = v => v) => () => {
        const value = transform(form[k]);
        if ((value ?? '') !== (deal[k] ?? '')) save.mutate({ [k]: value === '' ? null : value });
    };

    return (
        <div className="w-full space-y-5">
            <button onClick={() => navigate(-1)} className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>
            <div className={`${card} p-6`} style={cardShadow}>
                <div className="flex flex-col lg:flex-row gap-5">
                    <div className="flex-1 min-w-0">
                        <input className="text-2xl font-bold text-gray-900 w-full bg-transparent focus:outline-none focus:bg-slate-50 rounded-lg px-1 -mx-1" value={form.name} onChange={set('name')} onBlur={blurSave('name')} aria-label="Opportunity name" />
                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                            <DealStatusBadge status={deal.status} stageName={deal.stage_name} /> <ClientTypeBadge value={deal.client_type} />
                            {deal.account_id && <Link to={`/app/accounts/${deal.account_id}`} className="font-semibold text-indigo-600 hover:text-indigo-800">{deal.company_name}</Link>}
                            {deal.prospect_id && <Link to={`/app/contacts/${deal.prospect_id}`} className="text-indigo-600 hover:text-indigo-800">{deal.contact_name}</Link>}
                            {deal.lead && <Link to={`/app/leads/${deal.lead.lead_id}`} className="text-slate-500 hover:text-slate-700">from lead</Link>}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 lg:w-80 text-right">
                        <div><p className="text-[11px] font-semibold text-slate-400 uppercase">Amount</p><p className="text-xl font-bold text-slate-900">{money(deal.amount)}</p></div>
                        <div><p className="text-[11px] font-semibold text-slate-400 uppercase">Weighted ({deal.probability}%)</p><p className="text-xl font-bold text-slate-600">{deal.status === 'OPEN' ? money(deal.weighted_amount) : '—'}</p></div>
                    </div>
                </div>
                <div className="mt-6 flex gap-1 overflow-x-auto">
                    {stages.map(s => {
                        const current = s.stage_id === deal.stage_id;
                        const passed = s.status === 'OPEN' && stages.findIndex(x => x.stage_id === deal.stage_id) > stages.findIndex(x => x.stage_id === s.stage_id) && deal.status === 'OPEN';
                        const tone = current ? (s.is_won ? 'bg-emerald-600 text-white' : s.is_lost ? 'bg-slate-500 text-white' : 'bg-indigo-600 text-white')
                            : passed ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200';
                        return (
                            <button key={s.stage_id} disabled={save.isPending || current} onClick={() => save.mutate({ stage_id: s.stage_id })}
                                className={`flex-1 min-w-[110px] h-10 px-2 text-xs font-semibold first:rounded-l-xl last:rounded-r-xl ${tone}`} title={`${s.probability}%`}>
                                {s.name}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-3"><ErrorNote message={error} /></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5">
                <div className={`${card} p-5 space-y-3`} style={cardShadow}>
                    <h2 className="text-sm font-bold text-slate-800">Details</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Amount"><input className={inputClass} inputMode="decimal" value={form.amount} onChange={set('amount')} onBlur={blurSave('amount', v => (v === '' ? '' : Number(v)))} /></Field>
                        <Field label="Expected close"><input type="date" className={inputClass} value={form.close_date} onChange={set('close_date')} onBlur={blurSave('close_date')} /></Field>
                        <Field label="Client type">
                            <select className={inputClass} value={form.client_type} onChange={e => { set('client_type')(e); save.mutate({ client_type: e.target.value }); }}>
                                <option value="NEW">New client</option><option value="EXISTING">Existing client</option>
                            </select>
                        </Field>
                        <Field label="Owner"><OwnerSelect owners={owners} value={deal.owner_id} allowUnassigned={false} onChange={owner_id => save.mutate({ owner_id })} /></Field>
                    </div>
                    <Field label="Next step"><input className={inputClass} value={form.next_step} onChange={set('next_step')} onBlur={blurSave('next_step')} /></Field>
                    {deal.status !== 'OPEN' && (
                        <Field label={deal.status === 'WON' ? 'Why we won' : 'Why we lost'}><input className={inputClass} value={form.closed_reason} onChange={set('closed_reason')} onBlur={blurSave('closed_reason')} /></Field>
                    )}
                    <Field label="Description">
                        <textarea rows={3} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400" value={form.description} onChange={set('description')} onBlur={blurSave('description')} />
                    </Field>
                    <button onClick={() => window.confirm('Delete this opportunity and its proposals?') && remove.mutate()} className="text-sm font-semibold text-red-600 hover:text-red-800 flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Delete opportunity</button>
                </div>
                <div className="space-y-5">
                    <Proposals deal={deal} onChanged={refresh} />
                    <div className={`${card} p-5`} style={cardShadow}>
                        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2"><History className="w-4 h-4 text-indigo-500" /> History</h2>
                        <ul className="space-y-1.5 max-h-72 overflow-y-auto">
                            {deal.history.map((h, i) => (
                                <li key={i} className="text-xs text-slate-600">
                                    <span className="font-semibold text-slate-700">{h.field === 'created' ? 'Created' : h.field === 'stage_id' ? 'Stage' : h.field.replace('_', ' ')}</span>
                                    {h.field !== 'created' && <>: {h.old_value || 'empty'} → {h.new_value || 'empty'}</>}
                                    {h.field === 'created' && h.new_value && <>: {h.new_value}</>}
                                    <span className="text-slate-400" title={formatDateTime(h.changed_at)}> · {h.changed_by_name || 'system'} · {relativeDate(h.changed_at)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
