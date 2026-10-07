import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Loader2, Rocket, Ban, History, Trash2 } from 'lucide-react';
import { errorMessage } from '../api/contacts';
import { leadsApi } from '../api/sales';
import { Avatar, ErrorNote, Field, Modal, OwnerSelect, PrimaryButton, SecondaryButton, formatDateTime, inputClass, relativeDate } from '../components/contacts/shared';
import { LeadStageBadge, card, cardShadow, useLeadsMeta, useTeamOwners } from '../components/sales/shared';

const toLocal = (v) => {
    if (!v) return '';
    const d = new Date(String(v).endsWith('Z') ? v : `${v}Z`);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

/** SQL -> opportunity, carrying contact and company across (BR-LD-06). */
export function ConvertModal({ lead, onClose, onConverted }) {
    const meta = useLeadsMeta();
    const openStages = (meta?.sales_stages || []).filter(s => s.status === 'OPEN');
    const [form, setForm] = useState({ name: '', amount: '', close_date: '', stage_id: '', client_type: '' });
    const [error, setError] = useState(null);
    const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
    const convert = useMutation({
        mutationFn: () => leadsApi.convert(lead.lead_id, Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''))),
        onSuccess: onConverted, onError: err => setError(errorMessage(err)),
    });
    return (
        <Modal title="Convert to opportunity" subtitle={`${lead.contact_name}${lead.company_name ? ` · ${lead.company_name}` : ''} — contact, company and owner carry across`}
            onClose={onClose} footer={<>
                <SecondaryButton onClick={onClose} className="flex-1">Cancel</SecondaryButton>
                <PrimaryButton onClick={() => convert.mutate()} loading={convert.isPending} className="flex-1"><Rocket className="w-4 h-4" /> Create opportunity</PrimaryButton>
            </>}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Opportunity name" className="sm:col-span-2" hint="Leave blank to use the company name and month">
                    <input className={inputClass} value={form.name} onChange={set('name')} placeholder={`${lead.company_name || lead.contact_name} - …`} /></Field>
                <Field label="Amount"><input className={inputClass} inputMode="decimal" value={form.amount} onChange={set('amount')} placeholder="50000" /></Field>
                <Field label="Expected close"><input type="date" className={inputClass} value={form.close_date} onChange={set('close_date')} /></Field>
                <Field label="Sales stage">
                    <select className={inputClass} value={form.stage_id} onChange={set('stage_id')}>
                        <option value="">{openStages[0]?.name || 'First stage'}</option>
                        {openStages.slice(1).map(s => <option key={s.stage_id} value={s.stage_id}>{s.name} ({s.probability}%)</option>)}
                    </select>
                </Field>
                <Field label="Client type" hint="Detected from past won deals if left blank">
                    <select className={inputClass} value={form.client_type} onChange={set('client_type')}>
                        <option value="">Detect automatically</option><option value="NEW">New client</option><option value="EXISTING">Existing client</option>
                    </select>
                </Field>
            </div>
            <div className="mt-3"><ErrorNote message={error} /></div>
        </Modal>
    );
}

export default function LeadDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const meta = useLeadsMeta();
    const owners = useTeamOwners();
    const { data: lead, isLoading, error: loadError } = useQuery({ queryKey: ['lead', id], queryFn: () => leadsApi.get(id), retry: false });
    const [error, setError] = useState(null);
    const [next, setNext] = useState({ next_step: '', next_step_at: '' });
    const [notes, setNotes] = useState('');
    const [disq, setDisq] = useState(null);
    const [converting, setConverting] = useState(false);
    useEffect(() => {
        if (!lead) return;
        setNext({ next_step: lead.next_step || '', next_step_at: toLocal(lead.next_step_at) });
        setNotes(lead.qualification?.notes || '');
    }, [lead?.lead_id, lead?.next_step, lead?.next_step_at]); // eslint-disable-line react-hooks/exhaustive-deps

    const refresh = () => ['lead', 'leads', 'contacts', 'contact'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
    const save = useMutation({
        mutationFn: payload => leadsApi.update(id, payload),
        onSuccess: data => { queryClient.setQueryData(['lead', id], data); setError(null); refresh(); },
        onError: err => setError(errorMessage(err)),
    });
    const remove = useMutation({ mutationFn: () => leadsApi.remove(id), onSuccess: () => { refresh(); navigate('/app/leads'); }, onError: err => setError(errorMessage(err)) });

    if (isLoading) return <div className="py-32 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-indigo-500" /></div>;
    if (loadError || !lead) return <div className="py-24 text-center"><p className="text-lg font-bold text-slate-800">Lead not found</p><Link to="/app/leads" className="inline-block mt-4 text-sm font-semibold text-indigo-600">← Back to leads</Link></div>;

    const open = ['NEW', 'CONTACTED', 'ENGAGED', 'SQL'].includes(lead.stage);
    const flow = (meta?.stages || []).filter(s => s.open);
    const flowIndex = flow.findIndex(s => s.value === lead.stage);

    return (
        <div className="w-full space-y-5">
            <button onClick={() => navigate(-1)} className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>
            <div className={`${card} p-6`} style={cardShadow}>
                <div className="flex flex-col lg:flex-row gap-5">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                        <Avatar first={lead.contact_name?.split(' ')[0]} last={lead.contact_name?.split(' ')[1]} seed={lead.contact_email} size="lg" />
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3 flex-wrap">{lead.contact_name} <LeadStageBadge stage={lead.stage} label={lead.stage_label} /></h1>
                            <p className="text-sm text-slate-500">{[lead.contact_title, lead.company_name].filter(Boolean).join(' · ')}</p>
                            <p className="text-sm text-slate-500 mt-1">
                                <Link to={`/app/contacts/${lead.prospect_id}`} className="font-semibold text-indigo-600 hover:text-indigo-800">Open contact</Link>
                                {lead.account_id && <> · <Link to={`/app/accounts/${lead.account_id}`} className="font-semibold text-indigo-600 hover:text-indigo-800">Company</Link></>}
                                {lead.opportunity_id && <> · <Link to={`/app/deals/${lead.opportunity_id}`} className="font-semibold text-emerald-600 hover:text-emerald-800">Opportunity →</Link></>}
                            </p>
                            <p className="text-xs text-slate-400 mt-2">Source: {lead.source || '—'} · created {relativeDate(lead.created_at)} · {lead.days_in_stage} days in stage</p>
                        </div>
                    </div>
                    <div className="lg:w-64 space-y-3">
                        <Field label="Owner"><OwnerSelect owners={owners} value={lead.owner_id} allowUnassigned={false} disabled={!open}
                            onChange={owner_id => save.mutate({ owner_id })} /></Field>
                        {lead.stage === 'SQL' && (
                            <PrimaryButton onClick={() => setConverting(true)} className="w-full"><Rocket className="w-4 h-4" /> Convert to opportunity</PrimaryButton>
                        )}
                        {open && <SecondaryButton onClick={() => setDisq('')} className="w-full"><Ban className="w-4 h-4" /> Disqualify</SecondaryButton>}
                        {lead.stage === 'DISQUALIFIED' && (
                            <SecondaryButton onClick={() => save.mutate({ stage: 'NEW' })} className="w-full">Recycle as new lead</SecondaryButton>
                        )}
                        {lead.stage !== 'CONVERTED' && (
                            <button onClick={() => window.confirm('Delete this lead? The contact is kept.') && remove.mutate()}
                                className="w-full h-9 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl flex items-center justify-center gap-1.5"><Trash2 className="w-4 h-4" /> Delete lead</button>
                        )}
                    </div>
                </div>
                {open && (
                    <div className="mt-6 grid grid-cols-4 gap-1">
                        {flow.map((s, i) => (
                            <button key={s.value} onClick={() => s.value !== lead.stage && save.mutate({ stage: s.value })} disabled={save.isPending}
                                className={`h-10 text-xs sm:text-sm font-semibold first:rounded-l-xl last:rounded-r-xl ${i <= flowIndex ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                )}
                {lead.stage === 'DISQUALIFIED' && <p className="mt-4 text-sm text-slate-600"><span className="font-semibold">Disqualified:</span> {lead.disqualified_reason}</p>}
                <div className="mt-3"><ErrorNote message={error} /></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className={`${card} p-5`} style={cardShadow}>
                    <h2 className="text-sm font-bold text-slate-800">SQL qualification</h2>
                    <p className="text-xs text-slate-500 mb-3">All four must be confirmed before the lead can become an SQL.</p>
                    <div className="space-y-2">
                        {(meta?.criteria || []).map(c => {
                            const on = !!lead.qualification?.[c.key];
                            return (
                                <label key={c.key} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer ${on ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-100 hover:bg-slate-50'}`}>
                                    <input type="checkbox" className="accent-emerald-600 w-4 h-4" checked={on} disabled={!open}
                                        onChange={() => save.mutate({ qualification: { [c.key]: !on } })} />
                                    <span className="text-sm text-slate-700 flex-1">{c.label}</span>
                                    {on && <Check className="w-4 h-4 text-emerald-600" />}
                                </label>
                            );
                        })}
                    </div>
                    <Field label="Qualification notes" className="mt-3">
                        <textarea rows={3} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                            value={notes} disabled={!open} onChange={e => setNotes(e.target.value)}
                            onBlur={() => notes !== (lead.qualification?.notes || '') && save.mutate({ qualification: { notes } })} />
                    </Field>
                </div>
                <div className={`${card} p-5`} style={cardShadow}>
                    <h2 className="text-sm font-bold text-slate-800 mb-3">Next step</h2>
                    <div className="space-y-3">
                        <Field label="What happens next"><input className={inputClass} value={next.next_step} disabled={!open} onChange={e => setNext(n => ({ ...n, next_step: e.target.value }))} placeholder="e.g. Demo with the CFO" /></Field>
                        <Field label="When"><input type="datetime-local" className={inputClass} value={next.next_step_at} disabled={!open} onChange={e => setNext(n => ({ ...n, next_step_at: e.target.value }))} /></Field>
                        {open && <PrimaryButton onClick={() => save.mutate({ next_step: next.next_step, next_step_at: next.next_step_at ? new Date(next.next_step_at).toISOString() : null })} loading={save.isPending}>Save next step</PrimaryButton>}
                        {lead.next_step_overdue && <p className="text-sm text-red-600">This next step is overdue.</p>}
                    </div>
                    <h2 className="text-sm font-bold text-slate-800 mt-6 mb-2 flex items-center gap-2"><History className="w-4 h-4 text-indigo-500" /> History</h2>
                    <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                        {(lead.history || []).map((h, i) => (
                            <li key={i} className="text-xs text-slate-600">
                                <span className="font-semibold text-slate-700">{h.field === 'created' ? 'Created' : h.field.replace('_', ' ')}</span>
                                {h.field !== 'created' && <>: {h.old_value || 'empty'} → {h.new_value || 'empty'}</>}
                                <span className="text-slate-400" title={formatDateTime(h.changed_at)}> · {h.changed_by_name || 'system'} · {relativeDate(h.changed_at)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {disq !== null && (
                <Modal title="Disqualify lead" onClose={() => setDisq(null)} footer={<>
                    <SecondaryButton onClick={() => setDisq(null)} className="flex-1">Cancel</SecondaryButton>
                    <PrimaryButton disabled={!disq.trim()} loading={save.isPending} className="flex-1"
                        onClick={() => save.mutate({ disqualified_reason: disq, stage: 'DISQUALIFIED' }, { onSuccess: () => setDisq(null) })}>Disqualify</PrimaryButton>
                </>}>
                <Field label="Reason"><input className={inputClass} value={disq} onChange={e => setDisq(e.target.value)} placeholder="e.g. No budget this year" autoFocus /></Field>
                <div className="flex flex-wrap gap-2 mt-3">
                    {['No budget', 'Not the decision maker', 'No need', 'Went with a competitor', 'Unresponsive'].map(r => (
                        <button key={r} onClick={() => setDisq(r)} className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs text-slate-600 hover:bg-slate-200">{r}</button>
                    ))}
                </div>
            </Modal>
            )}
            {converting && <ConvertModal lead={lead} onClose={() => setConverting(false)}
                onConverted={opp => { setConverting(false); refresh(); navigate(`/app/deals/${opp.opportunity_id}`); }} />}
        </div>
    );
}
