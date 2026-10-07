import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, FileText, Plus, History, Trash2, AlertTriangle, Megaphone, ListOrdered } from 'lucide-react';
import { errorMessage } from '../api/contacts';
import { dealsApi, money, proposalsApi, stagesApi } from '../api/sales';
import { ErrorNote, Field, OwnerSelect, PrimaryButton, formatDateTime, inputClass, relativeDate } from '../components/contacts/shared';
import { ClientTypeBadge, DealStatusBadge, card, cardShadow, useLeadsMeta, useTeamOwners } from '../components/sales/shared';
import CloseReasonModal from '../components/sales/CloseReasonModal';
import { DealTimeline, QuoteModal, StageHistory } from '../components/sales/DealExtras';

const PROPOSAL_TONE = { DRAFT: 'bg-slate-100 text-slate-600', SENT: 'bg-sky-50 text-sky-700', UNDER_REVIEW: 'bg-amber-50 text-amber-700',
    ACCEPTED: 'bg-emerald-50 text-emerald-700', REJECTED: 'bg-red-50 text-red-700' };

function Proposals({ deal, onChanged }) {
    const meta = useLeadsMeta();
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState(null);
    const [quoting, setQuoting] = useState(null);
    const canSee = meta?.can_see_amounts !== false;
    const create = useMutation({ mutationFn: () => proposalsApi.create({ opportunity_id: deal.opportunity_id, title: title || undefined, amount: amount || undefined }),
        onSuccess: () => { setTitle(''); setAmount(''); onChanged(); }, onError: e => setError(errorMessage(e)) });
    const update = useMutation({ mutationFn: ({ id, payload }) => proposalsApi.update(id, payload), onSuccess: onChanged, onError: e => setError(errorMessage(e)) });
    const remove = useMutation({ mutationFn: proposalsApi.remove, onSuccess: onChanged });
    return (
        <div className={`${card} p-5`} style={cardShadow}>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3"><FileText className="w-4 h-4 text-indigo-500" /> Proposals</h2>
            <ul className="space-y-2">
                {deal.proposals.map(p => (
                    <li key={p.proposal_id} className="p-3 rounded-lg border border-slate-200">
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-800 min-w-0 truncate">{p.title}</p>
                            <button onClick={() => window.confirm('Delete this proposal?') && remove.mutate(p.proposal_id)} className="p-0.5 text-slate-300 hover:text-red-500 shrink-0" aria-label="Delete proposal"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{canSee ? money(p.amount) : 'Amount hidden'}{p.line_count ? ` · ${p.line_count} line${p.line_count === 1 ? '' : 's'}` : ''}{p.sent_at ? ` · sent ${relativeDate(p.sent_at)}` : ''}{p.decided_at ? ` · decided ${relativeDate(p.decided_at)}` : ''}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <select value={p.status} onChange={e => update.mutate({ id: p.proposal_id, payload: { status: e.target.value } })}
                                className={`h-7 px-2 rounded-md text-xs font-semibold border-0 ${PROPOSAL_TONE[p.status]}`} aria-label="Proposal status">
                                {(meta?.proposal_statuses || []).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            {canSee && <button onClick={() => setQuoting(p)} className="ml-auto h-7 px-2.5 rounded-md text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 flex items-center gap-1" title="Quote lines and PDF"><ListOrdered className="w-3.5 h-3.5" /> Quote &amp; PDF</button>}
                        </div>
                    </li>
                ))}
                {!deal.proposals.length && <p className="text-sm text-slate-400">No proposals yet.</p>}
            </ul>
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                <input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} placeholder={`New proposal title (default: Proposal - ${deal.name})`} aria-label="Proposal title" />
                <div className="flex gap-2">
                    {canSee && <input className={`${inputClass} flex-1`} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Amount (${deal.amount ?? 'deal amount'})`} aria-label="Proposal amount" />}
                    <PrimaryButton onClick={() => create.mutate()} loading={create.isPending} className={canSee ? '' : 'flex-1'}><Plus className="w-4 h-4" /> Add proposal</PrimaryButton>
                </div>
            </div>
            <div className="mt-2"><ErrorNote message={error} /></div>
            {quoting && <QuoteModal proposal={quoting} onClose={() => setQuoting(null)} onSaved={onChanged} />}
        </div>
    );
}

export default function DealDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const owners = useTeamOwners();
    const meta = useLeadsMeta();
    const canSee = meta?.can_see_amounts !== false;
    const [closing, setClosing] = useState(null);
    const { data: stages = [] } = useQuery({ queryKey: ['sales-stages'], queryFn: () => stagesApi.list() });
    const { data: deal, isLoading, error: loadError } = useQuery({ queryKey: ['deal', id], queryFn: () => dealsApi.get(id), retry: false });
    const [form, setForm] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (deal) setForm({ name: deal.name, amount: deal.amount ?? '', close_date: deal.close_date || '', client_type: deal.client_type,
            next_step: deal.next_step || '', closed_reason: deal.closed_reason || '', description: deal.description || '' });
    }, [deal]);
    const refresh = () => ['deal', 'deals', 'proposals', 'leads', 'deal-timeline'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
    const save = useMutation({
        mutationFn: payload => dealsApi.update(id, payload),
        onSuccess: data => { queryClient.setQueryData(['deal', id], data); setError(null); setClosing(null); refresh(); },
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

    const wonStage = stages.find(x => x.is_won);
    const lostStage = stages.find(x => x.is_lost);
    const openStages = stages.filter(x => x.status === 'OPEN');
    const currentIndex = openStages.findIndex(x => x.stage_id === deal.stage_id);
    const initials = ((deal.company_name || deal.name).replace(/\[[^\]]*\]/g, '').match(/[A-Za-z0-9]+/g) || ['?']).slice(0, 2).map(w => w[0]).join('').toUpperCase();

    return (
        <div className="w-full space-y-5">
            <nav className="flex items-center gap-1.5 text-sm text-slate-500">
                <button onClick={() => navigate(-1)} className="p-1 -ml-1 rounded hover:bg-slate-100" aria-label="Back"><ArrowLeft className="w-4 h-4" /></button>
                <Link to="/app/deals" className="hover:text-slate-800">Deals</Link><span>/</span><span className="text-slate-800 font-medium truncate">{deal.name}</span>
            </nav>
            <div className={`${card} p-5`} style={cardShadow}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">{initials}</div>
                        <div className="min-w-0 flex-1">
                            <input className="text-xl font-semibold tracking-tight text-slate-900 w-full bg-transparent focus:outline-none focus:bg-slate-50 rounded-md px-1 -mx-1" value={form.name} onChange={set('name')} onBlur={blurSave('name')} aria-label="Opportunity name" />
                            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                {deal.account_id && <Link to={`/app/accounts/${deal.account_id}`} className="hover:text-indigo-700">{deal.company_name}</Link>}
                                {deal.prospect_id && <>{deal.account_id && <span className="text-slate-300">·</span>}<Link to={`/app/contacts/${deal.prospect_id}`} className="hover:text-indigo-700">{deal.contact_name}</Link></>}
                                <DealStatusBadge status={deal.status} stageName={deal.stage_name} /> <ClientTypeBadge value={deal.client_type} />
                                {deal.stale && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700" title="No activity for a while, or the close date has passed"><AlertTriangle className="w-3 h-3" /> Stale · {deal.days_idle} days idle</span>}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        {canSee && <div className="text-right"><p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Amount</p><p className="text-xl font-bold tabular-nums">{money(deal.amount)}</p></div>}
                        <div className="text-right"><p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Close</p><p className="text-xl font-bold">{deal.close_date ? new Date(`${deal.close_date}T00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '—'}</p></div>
                        {deal.status === 'OPEN' && (
                            <div className="flex gap-2">
                                {wonStage && <button onClick={() => setClosing(wonStage)} className="h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">Mark won</button>}
                                {lostStage && <button onClick={() => setClosing(lostStage)} className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold">Mark lost</button>}
                            </div>
                        )}
                    </div>
                </div>
                <div className="mt-5 flex gap-1 overflow-x-auto">
                    {openStages.map((s, i) => {
                        const current = s.stage_id === deal.stage_id;
                        const passed = deal.status !== 'OPEN' || (currentIndex >= 0 && i < currentIndex);
                        const tone = current ? 'bg-indigo-600 text-white' : passed ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200';
                        return (
                            <button key={s.stage_id} disabled={save.isPending || current} onClick={() => save.mutate({ stage_id: s.stage_id })}
                                className={`flex-1 min-w-[110px] h-9 px-2 text-xs font-semibold first:rounded-l-lg last:rounded-r-lg ${tone}`} title={`${s.probability}%`}>
                                {s.name}{current ? ` · ${s.probability}%` : ''}
                            </button>
                        );
                    })}
                    {deal.status !== 'OPEN' && <span className={`flex-1 min-w-[110px] h-9 px-2 text-xs font-semibold rounded-r-lg flex items-center justify-center ${deal.status === 'WON' ? 'bg-emerald-600 text-white' : 'bg-slate-500 text-white'}`}>{deal.stage_name}</span>}
                </div>
                <div className="mt-3"><ErrorNote message={error} /></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_330px] gap-5 items-start">
                <div className="space-y-5">
                    <div className={`${card} p-5 space-y-3`} style={cardShadow}>
                        <h2 className="text-sm font-semibold text-slate-900">About this deal</h2>
                        {canSee && <Field label="Amount"><input className={inputClass} inputMode="decimal" value={form.amount} onChange={set('amount')} onBlur={blurSave('amount', v => (v === '' ? '' : Number(v)))} /></Field>}
                        {canSee && deal.status === 'OPEN' && <p className="text-xs text-slate-500 -mt-1">Weighted at {deal.probability}%: <span className="font-semibold text-slate-700">{money(deal.weighted_amount)}</span></p>}
                        <Field label="Expected close"><input type="date" className={inputClass} value={form.close_date} onChange={set('close_date')} onBlur={blurSave('close_date')} /></Field>
                        <Field label="Owner"><OwnerSelect owners={owners} value={deal.owner_id} allowUnassigned={false} onChange={owner_id => save.mutate({ owner_id })} /></Field>
                        <Field label="Client type">
                            <select className={inputClass} value={form.client_type} onChange={e => { set('client_type')(e); save.mutate({ client_type: e.target.value }); }}>
                                <option value="NEW">New client</option><option value="EXISTING">Existing client</option>
                            </select>
                        </Field>
                        {deal.status === 'OPEN' && (
                            <Field label="Forecast category" hint={deal.forecast_category_manual ? 'Set by hand; stays when the stage changes' : 'Follows the stage probability'}>
                                <select className={inputClass} value={deal.forecast_category_manual ? deal.forecast_category : ''}
                                    onChange={e => save.mutate({ forecast_category: e.target.value || null })}>
                                    <option value="">Automatic ({(meta?.forecast_categories || []).find(c => c.value === deal.forecast_category)?.label || deal.forecast_category})</option>
                                    {(meta?.forecast_categories || []).filter(c => c.value !== 'CLOSED').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </Field>
                        )}
                        <Field label="Next step"><input className={inputClass} value={form.next_step} onChange={set('next_step')} onBlur={blurSave('next_step')} /></Field>
                        {deal.status !== 'OPEN' && (
                            <Field label={deal.status === 'WON' ? 'Why we won' : 'Why we lost'}><input className={inputClass} value={form.closed_reason} onChange={set('closed_reason')} onBlur={blurSave('closed_reason')} /></Field>
                        )}
                        <Field label="Description">
                            <textarea rows={3} className={`${inputClass} h-auto py-2`} value={form.description} onChange={set('description')} onBlur={blurSave('description')} />
                        </Field>
                        {(deal.campaign_id || deal.lead) && (
                            <div className="pt-2 border-t border-slate-100 space-y-1.5 text-sm">
                                {deal.campaign_id && <p className="flex items-center gap-1.5 text-slate-600"><Megaphone className="w-3.5 h-3.5 text-slate-400" /> Source: <Link to={`/app/campaigns/${deal.campaign_id}`} className="text-indigo-600 hover:text-indigo-800 truncate">{deal.campaign_name || 'campaign'}</Link></p>}
                                {deal.lead && <p className="text-slate-600">Converted from <Link to={`/app/leads/${deal.lead.lead_id}`} className="text-indigo-600 hover:text-indigo-800">this lead</Link></p>}
                            </div>
                        )}
                    </div>
                    <StageHistory rows={deal.stage_history} />
                </div>
                <div className="min-w-0 space-y-5">
                    <DealTimeline deal={deal} />
                    <div className="xl:hidden"><Proposals deal={deal} onChanged={refresh} /></div>
                </div>
                <div className="hidden xl:block space-y-5">
                    <Proposals deal={deal} onChanged={refresh} />
                    <button onClick={() => window.confirm('Delete this opportunity and its proposals?') && remove.mutate()} className="text-sm font-semibold text-red-600 hover:text-red-800 flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Delete opportunity</button>
                </div>
            </div>
            <button onClick={() => window.confirm('Delete this opportunity and its proposals?') && remove.mutate()} className="xl:hidden text-sm font-semibold text-red-600 hover:text-red-800 flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Delete opportunity</button>
            {closing && <CloseReasonModal stage={closing} dealName={deal.name} initial={deal.closed_reason || ''} busy={save.isPending}
                onClose={() => setClosing(null)} onConfirm={reason => save.mutate({ stage_id: closing.stage_id, closed_reason: reason })} />}
        </div>
    );
}
