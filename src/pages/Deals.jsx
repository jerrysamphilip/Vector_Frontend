import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Loader2, Briefcase, LayoutGrid, List, Settings2, X, AlertTriangle, Trophy, XCircle } from 'lucide-react';
import { accountsApi, errorMessage } from '../api/contacts';
import { dealsApi, money, moneyShort, stagesApi } from '../api/sales';
import { getStoredUser } from '../lib/authStorage';
import { ErrorNote, Field, Modal, OwnerSelect, PrimaryButton, SecondaryButton, inputClass, BRAND_GRADIENT } from '../components/contacts/shared';
import { ClientTypeBadge, ClientTypeFilter, DealStatusBadge, Empty, OwnerFilter, PageHeader, Seg, card, cardShadow, selectSm, useLeadsMeta, useTeamOwners } from '../components/sales/shared';
import CloseReasonModal from '../components/sales/CloseReasonModal';

export function DealFormModal({ onClose, onSaved, defaults = {} }) {
    const owners = useTeamOwners();
    const me = getStoredUser();
    const meta = useLeadsMeta();
    const { data: stages = [] } = useQuery({ queryKey: ['sales-stages'], queryFn: () => stagesApi.list() });
    const { data: companies } = useQuery({ queryKey: ['accounts', 'picker'], queryFn: () => accountsApi.list({ page_size: 200, sort_by: 'name', sort_order: 'asc' }) });
    const [form, setForm] = useState({ name: '', account_id: '', amount: '', close_date: '', stage_id: '', client_type: '', owner_id: me?.user_id, ...defaults });
    const [error, setError] = useState(null);
    const set = k => e => setForm(f => ({ ...f, [k]: e?.target ? e.target.value : e }));
    const save = useMutation({
        mutationFn: () => dealsApi.create(Object.fromEntries(Object.entries(form).filter(([, v]) => v !== '' && v != null))),
        onSuccess: onSaved, onError: err => setError(errorMessage(err)),
    });
    return (
        <Modal title="New opportunity" onClose={onClose} footer={<>
            <SecondaryButton onClick={onClose} className="flex-1">Cancel</SecondaryButton>
            <PrimaryButton onClick={() => save.mutate()} loading={save.isPending} disabled={!form.name.trim()} className="flex-1">Create</PrimaryButton>
        </>}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Name *" className="sm:col-span-2"><input className={inputClass} value={form.name} onChange={set('name')} autoFocus /></Field>
                <Field label="Company" className="sm:col-span-2">
                    <select className={inputClass} value={form.account_id} onChange={set('account_id')}>
                        <option value="">No company</option>
                        {(companies?.items || []).map(a => <option key={a.account_id} value={a.account_id}>{a.name}</option>)}
                    </select>
                </Field>
                {meta?.can_see_amounts !== false && <Field label="Amount"><input className={inputClass} inputMode="decimal" value={form.amount} onChange={set('amount')} /></Field>}
                <Field label="Expected close"><input type="date" className={inputClass} value={form.close_date} onChange={set('close_date')} /></Field>
                <Field label="Stage">
                    <select className={inputClass} value={form.stage_id} onChange={set('stage_id')}>
                        {stages.map(s => <option key={s.stage_id} value={s.stage_id}>{s.name} ({s.probability}%)</option>)}
                    </select>
                </Field>
                <Field label="Client type">
                    <select className={inputClass} value={form.client_type} onChange={set('client_type')}>
                        <option value="">Detect automatically</option><option value="NEW">New client</option><option value="EXISTING">Existing client</option>
                    </select>
                </Field>
                <Field label="Owner" className="sm:col-span-2"><OwnerSelect owners={owners} value={form.owner_id} onChange={set('owner_id')} allowUnassigned={false} /></Field>
            </div>
            <div className="mt-3"><ErrorNote message={error} /></div>
        </Modal>
    );
}

/** Admins: rename, re-weight, add and retire sales stages (BR-SP-01). */
function StagesModal({ onClose }) {
    const queryClient = useQueryClient();
    const { data: stages = [] } = useQuery({ queryKey: ['sales-stages', 'all'], queryFn: () => stagesApi.list(true) });
    const [error, setError] = useState(null);
    const [draft, setDraft] = useState({ name: '', probability: 30 });
    const refresh = () => ['sales-stages', 'leads-meta', 'deals'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
    const update = useMutation({ mutationFn: ({ id, payload }) => stagesApi.update(id, payload), onSuccess: refresh, onError: e => setError(errorMessage(e)) });
    const create = useMutation({ mutationFn: () => stagesApi.create({ ...draft, probability: Number(draft.probability) }),
        onSuccess: () => { setDraft({ name: '', probability: 30 }); refresh(); }, onError: e => setError(errorMessage(e)) });
    return (
        <Modal title="Sales stages" subtitle="Probability weights the revenue pipeline and forecast" onClose={onClose} width="max-w-2xl"
            footer={<SecondaryButton onClick={onClose} className="ml-auto">Done</SecondaryButton>}>
            <table className="w-full text-sm">
                <thead><tr className="text-xs font-semibold text-left text-slate-400 uppercase tracking-wide"><th className="pb-2">Stage</th><th className="pb-2 w-24">Probability</th><th className="pb-2 w-20">Order</th><th className="pb-2 w-24">Type</th><th className="pb-2 w-20">Active</th></tr></thead>
                <tbody>
                    {stages.map(s => (
                        <tr key={s.stage_id} className="border-t border-slate-50">
                            <td className="py-1.5 pr-2"><input className={`${inputClass} h-9`} defaultValue={s.name} onBlur={e => e.target.value !== s.name && update.mutate({ id: s.stage_id, payload: { name: e.target.value } })} /></td>
                            <td className="py-1.5 pr-2"><input type="number" min="0" max="100" className={`${inputClass} h-9`} defaultValue={s.probability} disabled={s.is_won || s.is_lost}
                                onBlur={e => Number(e.target.value) !== s.probability && update.mutate({ id: s.stage_id, payload: { probability: Number(e.target.value) } })} /></td>
                            <td className="py-1.5 pr-2"><input type="number" className={`${inputClass} h-9`} defaultValue={s.sort_order}
                                onBlur={e => Number(e.target.value) !== s.sort_order && update.mutate({ id: s.stage_id, payload: { sort_order: Number(e.target.value) } })} /></td>
                            <td className="py-1.5 text-xs text-slate-500">{s.is_won ? 'Won' : s.is_lost ? 'Lost' : 'Open'}</td>
                            <td className="py-1.5"><input type="checkbox" className="accent-indigo-600" checked={s.active} onChange={() => update.mutate({ id: s.stage_id, payload: { active: !s.active } })} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="flex items-end gap-2 mt-4 p-3 bg-slate-50 rounded-xl">
                <Field label="New stage" className="flex-1"><input className={inputClass} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} /></Field>
                <Field label="Probability %" className="w-28"><input type="number" min="0" max="100" className={inputClass} value={draft.probability} onChange={e => setDraft(d => ({ ...d, probability: e.target.value }))} /></Field>
                <PrimaryButton onClick={() => create.mutate()} disabled={!draft.name.trim()} loading={create.isPending}><Plus className="w-4 h-4" /> Add</PrimaryButton>
            </div>
            <div className="mt-3"><ErrorNote message={error} /></div>
        </Modal>
    );
}

function DealCard({ deal, onDragStart }) {
    return (
        <Link to={`/app/deals/${deal.opportunity_id}`} draggable onDragStart={e => onDragStart(e, deal)}
            className="block bg-white rounded-xl border border-slate-100 p-3 hover:border-indigo-200 hover:shadow-sm">
            <p className="text-sm font-semibold text-slate-800 truncate">{deal.name}</p>
            <p className="text-xs text-slate-500 truncate">{deal.company_name || '—'}</p>
            {deal.stale && <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700" title="No recent activity or past its close date"><AlertTriangle className="w-3 h-3" /> Stale · {deal.days_idle}d idle</span>}
            <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-bold text-slate-800">{moneyShort(deal.amount)}</span>
                <ClientTypeBadge value={deal.client_type} />
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                <span className="truncate">{deal.owner_name}</span>
                <span className={deal.overdue ? 'text-red-600 font-semibold' : ''}>{deal.close_date || 'No close date'}</span>
            </div>
        </Link>
    );
}

export default function Deals() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const me = getStoredUser();
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(me?.role);
    const [params, setParams] = useSearchParams();
    const mode = params.get('mode') || (params.get('close_from') ? 'list' : 'board');
    const owner = params.get('owner') || '';
    const clientType = params.get('client_type') || '';
    const status = params.get('status') || (mode === 'list' ? '' : 'OPEN');
    const closeFrom = params.get('close_from') || '';
    const closeTo = params.get('close_to') || '';
    const staleOnly = params.get('stale') === '1';
    const [closing, setClosing] = useState(null);
    const { data: allStages = [] } = useQuery({ queryKey: ['sales-stages'], queryFn: () => stagesApi.list() });
    const closedStages = allStages.filter(s => s.is_won || s.is_lost);
    const [creating, setCreating] = useState(false);
    const [managing, setManaging] = useState(false);
    const [error, setError] = useState(null);
    const update = (patch) => setParams(p => { const n = new URLSearchParams(p); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); return n; });

    const filters = { owner, client_type: clientType };
    const board = useQuery({ queryKey: ['deals', 'board', filters], enabled: mode === 'board', queryFn: () => dealsApi.board(filters) });
    const list = useQuery({ queryKey: ['deals', 'list', filters, status, closeFrom, closeTo, staleOnly], enabled: mode === 'list', placeholderData: keepPreviousData,
        queryFn: () => dealsApi.list({ ...filters, status, close_from: closeFrom, close_to: closeTo, stale: staleOnly || undefined, page_size: 500 }) });
    const move = useMutation({
        mutationFn: ({ deal, stage_id, closed_reason }) => dealsApi.update(deal.opportunity_id, closed_reason ? { stage_id, closed_reason } : { stage_id }),
        onSuccess: () => { setClosing(null); setError(null); queryClient.invalidateQueries({ queryKey: ['deals'] }); }, onError: e => { setClosing(null); setError(errorMessage(e)); },
    });
    const onDragStart = (e, deal) => e.dataTransfer.setData('text/plain', JSON.stringify({ id: deal.opportunity_id, stage: deal.stage_id, name: deal.name }));
    const onDrop = (e, stageId) => {
        e.preventDefault();
        try {
            const d = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (d.stage === stageId) return;
            const target = allStages.find(s => s.stage_id === stageId);
            if (target && (target.is_won || target.is_lost)) setClosing({ deal: { opportunity_id: d.id, name: d.name }, stage: target });
            else move.mutate({ deal: { opportunity_id: d.id }, stage_id: stageId });
        } catch { /* not a deal */ }
    };

    return (
        <div className="w-full space-y-6">
            <PageHeader title="Opportunities" subtitle="Deals in the sales pipeline">
                {isAdmin && <button onClick={() => setManaging(true)} className="h-10 px-4 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"><Settings2 className="w-4 h-4" /> Stages</button>}
                <button onClick={() => setCreating(true)} style={{ background: BRAND_GRADIENT }} className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm hover:shadow-md"><Plus className="w-4 h-4" /> New opportunity</button>
            </PageHeader>
            <div className={`${card} px-5 py-4 flex items-center gap-3 flex-wrap`} style={cardShadow}>
                <Seg options={[['board', <span key="b" className="flex items-center gap-1.5"><LayoutGrid className="w-3.5 h-3.5" />Board</span>], ['list', <span key="l" className="flex items-center gap-1.5"><List className="w-3.5 h-3.5" />List</span>]]}
                    value={mode} onChange={v => update({ mode: v })} />
                <OwnerFilter value={owner} onChange={v => update({ owner: v })} />
                <ClientTypeFilter value={clientType} onChange={v => update({ client_type: v })} />
                {mode === 'list' && (
                    <select className={selectSm} value={status} onChange={e => update({ status: e.target.value })} aria-label="Status">
                        <option value="">All</option><option value="OPEN">Open</option><option value="WON">Won</option><option value="LOST">Lost</option>
                    </select>
                )}
                <label className="flex items-center gap-1.5 text-sm text-slate-600">
                    <input type="checkbox" className="accent-indigo-600" checked={staleOnly} onChange={e => update({ stale: e.target.checked ? '1' : '', mode: e.target.checked ? 'list' : mode, status: e.target.checked ? 'OPEN' : status })} />
                    Stale only
                </label>
                {(closeFrom || closeTo) && (
                    <span className="h-8 px-3 flex items-center gap-1.5 text-sm rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Closing {closeFrom || '…'} to {closeTo || '…'}<button onClick={() => update({ close_from: '', close_to: '' })} aria-label="Clear dates"><X className="w-3.5 h-3.5" /></button>
                    </span>
                )}
                {mode === 'list' && list.data && <span className="ml-auto text-sm text-slate-500">{list.data.total} deals · {money(list.data.total_amount)}</span>}
            </div>
            <ErrorNote message={error} />

            {mode === 'board' ? (
                board.isLoading ? <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div> : (
                    <div>
                        <div className="flex gap-4 overflow-x-auto pb-2">
                        {(board.data?.columns || []).map(col => (
                            <div key={col.stage_id} onDragOver={e => e.preventDefault()} onDrop={e => onDrop(e, col.stage_id)}
                                className="bg-slate-50/80 rounded-2xl p-3 w-72 flex-shrink-0 min-h-[260px]">
                                <div className="px-1 mb-2">
                                    <div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-700">{col.name}</span><span className="text-xs font-semibold text-slate-500">{col.count}</span></div>
                                    <p className="text-xs text-slate-500">{moneyShort(col.amount)} · weighted {moneyShort(col.weighted)} ({col.probability}%)</p>
                                </div>
                                <div className="space-y-2">
                                    {col.items.map(d => <DealCard key={d.opportunity_id} deal={d} onDragStart={onDragStart} />)}
                                    {!col.count && <p className="text-xs text-slate-400 text-center py-6">Drop deals here</p>}
                                </div>
                            </div>
                        ))}
                        </div>
                        {closedStages.length > 0 && (
                            <div className="flex gap-3 mt-3">
                                {closedStages.map(s => (
                                    <div key={s.stage_id} onDragOver={e => e.preventDefault()} onDrop={e => onDrop(e, s.stage_id)}
                                        className={`flex-1 h-14 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-semibold ${s.is_won ? 'border-emerald-200 text-emerald-700 bg-emerald-50/50' : 'border-slate-200 text-slate-500 bg-slate-50/50'}`}>
                                        {s.is_won ? <Trophy className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} Drop here to mark {s.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            ) : (
                <div className={`${card} overflow-hidden`} style={cardShadow}>
                    {list.isLoading ? <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                        : !(list.data?.items || []).length ? <Empty icon={Briefcase} title="No opportunities" text="Convert an SQL or create an opportunity." /> : (
                            <div className="overflow-x-auto"><table className="w-full">
                                <thead><tr className="bg-slate-50/80 text-xs font-semibold text-left text-slate-400 uppercase tracking-wide">
                                    <th className="pl-5 pr-3 py-3">Opportunity</th><th className="px-3 py-3">Stage</th><th className="px-3 py-3 text-right">Amount</th>
                                    <th className="px-3 py-3 text-right">Weighted</th><th className="px-3 py-3">Close</th><th className="px-3 py-3">Client</th><th className="px-3 pr-5 py-3">Owner</th>
                                </tr></thead>
                                <tbody className="divide-y divide-slate-50">
                                    {list.data.items.map(d => (
                                        <tr key={d.opportunity_id} onClick={() => navigate(`/app/deals/${d.opportunity_id}`)} className="cursor-pointer hover:bg-slate-50/70">
                                            <td className="pl-5 pr-3 py-3"><p className="text-sm font-semibold text-slate-800 flex items-center gap-2">{d.name}{d.stale && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700"><AlertTriangle className="w-3 h-3" /> {d.days_idle}d idle</span>}</p><p className="text-xs text-slate-500">{d.company_name || '—'}</p></td>
                                            <td className="px-3 py-3"><DealStatusBadge status={d.status} stageName={d.stage_name} /></td>
                                            <td className="px-3 py-3 text-sm text-right font-semibold tabular-nums">{money(d.amount)}</td>
                                            <td className="px-3 py-3 text-sm text-right text-slate-600 tabular-nums">{d.status === 'OPEN' ? money(d.weighted_amount) : '—'}</td>
                                            <td className={`px-3 py-3 text-sm ${d.overdue ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>{d.close_date || '—'}</td>
                                            <td className="px-3 py-3"><ClientTypeBadge value={d.client_type} /></td>
                                            <td className="px-3 pr-5 py-3 text-sm text-slate-600">{d.owner_name}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table></div>
                        )}
                </div>
            )}
            {creating && <DealFormModal onClose={() => setCreating(false)} onSaved={d => { setCreating(false); queryClient.invalidateQueries({ queryKey: ['deals'] }); navigate(`/app/deals/${d.opportunity_id}`); }} />}
            {managing && <StagesModal onClose={() => setManaging(false)} />}
            {closing && <CloseReasonModal stage={closing.stage} dealName={closing.deal.name} busy={move.isPending} onClose={() => setClosing(null)}
                onConfirm={reason => move.mutate({ deal: closing.deal, stage_id: closing.stage.stage_id, closed_reason: reason })} />}
        </div>
    );
}
