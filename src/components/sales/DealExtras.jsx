import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    StickyNote, Phone, Users, Mail, MailOpen, CheckSquare, PencilLine, Clock, Plus, Trash2, Download, Loader2,
} from 'lucide-react';
import { errorMessage, tasksApi } from '../../api/contacts';
import { dealsApi, money, productsApi, quotesApi } from '../../api/sales';
import { ErrorNote, Modal, PrimaryButton, SecondaryButton, formatDateTime, inputClass, relativeDate } from '../contacts/shared';
import { card, cardShadow, Seg } from './shared';

const KIND = {
    NOTE: { icon: StickyNote, label: 'Note', tone: 'text-amber-600 bg-amber-50' },
    CALL: { icon: Phone, label: 'Call', tone: 'text-sky-600 bg-sky-50' },
    MEETING: { icon: Users, label: 'Meeting', tone: 'text-violet-600 bg-violet-50' },
    EMAIL: { icon: Mail, label: 'Email', tone: 'text-indigo-600 bg-indigo-50' },
    EMAIL_SENT: { icon: Mail, label: 'Email sent', tone: 'text-indigo-600 bg-indigo-50' },
    EMAIL_RECEIVED: { icon: MailOpen, label: 'Email received', tone: 'text-emerald-600 bg-emerald-50' },
    TASK: { icon: CheckSquare, label: 'Task', tone: 'text-teal-600 bg-teal-50' },
    PROPERTY_CHANGE: { icon: PencilLine, label: 'Change', tone: 'text-slate-500 bg-slate-100' },
};
const FIELD_LABEL = { stage_id: 'Stage', owner_id: 'Owner', close_date: 'Close date', client_type: 'Client type',
    closed_reason: 'Close reason', next_step: 'Next step', forecast_category: 'Forecast category', amount: 'Amount' };

function Composer({ deal, onDone }) {
    const [mode, setMode] = useState('NOTE');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [when, setWhen] = useState('');
    const [duration, setDuration] = useState('');
    const [calendar, setCalendar] = useState(false);
    const [error, setError] = useState(null);
    const reset = () => { setSubject(''); setBody(''); setWhen(''); setDuration(''); setCalendar(false); setError(null); };
    const save = useMutation({
        mutationFn: () => (mode === 'TASK'
            ? tasksApi.create({ title: subject, notes: body || undefined, due_at: when ? new Date(when).toISOString() : undefined,
                opportunity_id: deal.opportunity_id, prospect_id: deal.prospect_id || undefined, owner_id: deal.owner_id })
            : dealsApi.logActivity(deal.opportunity_id, {
                activity_type: mode, subject: subject || undefined, body: body || undefined,
                occurred_at: when ? new Date(when).toISOString() : undefined,
                duration_minutes: duration ? Number(duration) : undefined, add_to_calendar: mode === 'MEETING' && calendar,
            })),
        onSuccess: () => { reset(); onDone(); },
        onError: e => setError(errorMessage(e)),
    });
    return (
        <div className="space-y-2.5">
            <Seg value={mode} onChange={setMode} options={[['NOTE', 'Note'], ['CALL', 'Call'], ['MEETING', 'Meeting'], ['EMAIL', 'Email'], ['TASK', 'Task']]} />
            <input className={inputClass} value={subject} onChange={e => setSubject(e.target.value)}
                placeholder={mode === 'TASK' ? 'What needs doing?' : mode === 'NOTE' ? 'Title (optional)' : 'Subject'} />
            <textarea rows={3} className={`${inputClass} h-auto py-2`} value={body} onChange={e => setBody(e.target.value)}
                placeholder={mode === 'TASK' ? 'Notes (optional)' : 'What happened?'} />
            <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-slate-500 flex items-center gap-1.5">
                    {mode === 'TASK' ? 'Due' : 'When'}
                    <input type="datetime-local" className="h-9 px-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={when} onChange={e => setWhen(e.target.value)} />
                </label>
                {(mode === 'CALL' || mode === 'MEETING') && (
                    <label className="text-xs text-slate-500 flex items-center gap-1.5">
                        Minutes <input type="number" min="0" className="w-20 h-9 px-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={duration} onChange={e => setDuration(e.target.value)} />
                    </label>
                )}
                {mode === 'MEETING' && (
                    <label className="text-xs text-slate-600 flex items-center gap-1.5" title="Needs a connected Google or Microsoft account">
                        <input type="checkbox" className="accent-indigo-600" checked={calendar} onChange={e => setCalendar(e.target.checked)} /> Add to my calendar
                    </label>
                )}
                <PrimaryButton className="ml-auto h-9" loading={save.isPending} disabled={mode === 'TASK' ? !subject.trim() : !(subject.trim() || body.trim())}
                    onClick={() => save.mutate()}>{mode === 'TASK' ? 'Add task' : 'Log'}</PrimaryButton>
            </div>
            <ErrorNote message={error} />
        </div>
    );
}

function TimelineItem({ item, onToggleTask }) {
    const k = KIND[item.kind] || KIND.NOTE;
    const Icon = k.icon;
    let title; let body; let meta = [];
    if (item.activity) {
        const a = item.activity;
        title = a.subject || k.label;
        body = a.body;
        if (a.outcome) meta.push(a.outcome);
        if (a.duration_minutes) meta.push(`${a.duration_minutes} min`);
        if (a.created_by_name) meta.push(a.created_by_name);
        if (a.source && a.source !== 'MANUAL') meta.push(`synced from ${a.source.toLowerCase()}`);
        if (!a.on_deal) meta.push('on the contact');
    } else if (item.task) {
        const t = item.task;
        title = (
            <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-indigo-600" checked={t.status === 'DONE'} onChange={() => onToggleTask(t)} />
                <span className={t.status === 'DONE' ? 'line-through text-slate-400' : ''}>{t.title}</span>
            </label>
        );
        body = t.notes;
        if (t.due_at) meta.push(`due ${formatDateTime(t.due_at)}`);
        if (t.overdue) meta.push('overdue');
        if (t.owner_name) meta.push(t.owner_name);
    } else if (item.email) {
        title = item.email.subject || '(no subject)';
        body = item.email.snippet;
    } else if (item.change) {
        const c = item.change;
        title = c.field === 'created' ? 'Opportunity created' : `${FIELD_LABEL[c.field] || c.field.replace(/_/g, ' ')}: ${c.old_value || 'empty'} → ${c.new_value || 'empty'}`;
        if (c.changed_by_name) meta.push(c.changed_by_name);
    }
    return (
        <li className="flex gap-3">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${k.tone}`}><Icon className="w-4 h-4" /></span>
            <div className="min-w-0 flex-1 pb-1">
                <div className="flex items-baseline justify-between gap-3">
                    <div className="text-sm font-medium text-slate-800 min-w-0">{title}</div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap" title={formatDateTime(item.at)}>{relativeDate(item.at)}</span>
                </div>
                {body && <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap line-clamp-4">{body}</p>}
                {meta.length > 0 && <p className="text-[11px] text-slate-400 mt-0.5">{k.label} · {meta.join(' · ')}</p>}
            </div>
        </li>
    );
}

/** Everything on the deal in one place: activities, tasks, emails and changes (BR-SF-06). */
export function DealTimeline({ deal }) {
    const qc = useQueryClient();
    const [filter, setFilter] = useState('all');
    const { data, isLoading } = useQuery({ queryKey: ['deal-timeline', deal.opportunity_id], queryFn: () => dealsApi.timeline(deal.opportunity_id) });
    const refresh = () => { qc.invalidateQueries({ queryKey: ['deal-timeline', deal.opportunity_id] }); qc.invalidateQueries({ queryKey: ['deal', deal.opportunity_id] }); };
    const toggle = useMutation({ mutationFn: t => tasksApi.update(t.task_id, { status: t.status === 'DONE' ? 'OPEN' : 'DONE' }), onSuccess: refresh });
    const items = (data?.items || []).filter(i => filter === 'all'
        || (filter === 'activity' && i.activity) || (filter === 'tasks' && i.task)
        || (filter === 'emails' && i.email) || (filter === 'changes' && i.change));
    return (
        <div className={`${card} p-5 space-y-4`} style={cardShadow}>
            <h2 className="text-sm font-bold text-slate-800">Activity</h2>
            <Composer deal={deal} onDone={refresh} />
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <Seg value={filter} onChange={setFilter} options={[['all', 'All'], ['activity', 'Activities'], ['tasks', 'Tasks'], ['emails', 'Emails'], ['changes', 'Changes']]} />
            </div>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> : (
                <ul className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                    {items.map((i, idx) => <TimelineItem key={idx} item={i} onToggleTask={t => toggle.mutate(t)} />)}
                    {!items.length && <p className="text-sm text-slate-400">Nothing here yet.</p>}
                </ul>
            )}
        </div>
    );
}

/** How long the deal sat in each stage (BR-SF-04). */
export function StageHistory({ rows = [] }) {
    const max = Math.max(1, ...rows.map(r => r.days || 0));
    return (
        <div className={`${card} p-5`} style={cardShadow}>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3"><Clock className="w-4 h-4 text-indigo-500" /> Time in each stage</h2>
            <ul className="space-y-2">
                {rows.map((r, i) => (
                    <li key={i} className="grid grid-cols-[minmax(90px,140px)_1fr_auto] items-center gap-3 text-sm"
                        title={`${r.stage}: ${r.days} days, from ${formatDateTime(r.entered_at)}${r.left_at ? ` to ${formatDateTime(r.left_at)}` : ' (current)'}`}>
                        <span className="truncate text-slate-700">{r.stage}{!r.left_at && <span className="text-[10px] text-indigo-600 font-semibold ml-1">NOW</span>}</span>
                        <span className="h-2.5 rounded bg-slate-100 overflow-hidden">
                            <span className="block h-full rounded-r" style={{ width: `${Math.max(2, ((r.days || 0) / max) * 100)}%`, background: r.left_at ? '#a5b4fc' : '#2d6bbf' }} />
                        </span>
                        <span className="text-xs font-semibold text-slate-700 tabular-nums whitespace-nowrap">{r.days} d</span>
                    </li>
                ))}
                {!rows.length && <p className="text-sm text-slate-400">No stage changes yet.</p>}
            </ul>
        </div>
    );
}

const blankLine = { product_id: '', description: '', quantity: 1, unit_price: '', discount_pct: 0 };
const lineTotal = (l) => (Number(l.quantity) || 0) * (Number(l.unit_price) || 0) * (1 - (Number(l.discount_pct) || 0) / 100);

/** Quote lines from the price list, with a PDF (BR-SF-15). */
export function QuoteModal({ proposal, onClose, onSaved }) {
    const qc = useQueryClient();
    const { data: quote, isLoading } = useQuery({ queryKey: ['quote', proposal.proposal_id], queryFn: () => quotesApi.get(proposal.proposal_id) });
    const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => productsApi.list() });
    const [lines, setLines] = useState(null);
    const [error, setError] = useState(null);
    const [pdfBusy, setPdfBusy] = useState(false);
    useEffect(() => { if (quote && lines === null) setLines(quote.lines.length ? quote.lines.map(l => ({ ...l, product_id: l.product_id || '' })) : [{ ...blankLine }]); }, [quote, lines]);
    const setLine = (i, patch) => setLines(ls => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
    const pickProduct = (i, id) => {
        const p = products.find(x => x.product_id === id);
        setLine(i, p ? { product_id: id, description: p.name, unit_price: p.unit_price } : { product_id: '' });
    };
    const save = useMutation({
        mutationFn: () => quotesApi.save(proposal.proposal_id, lines.filter(l => l.description || l.product_id).map(l => ({
            product_id: l.product_id || null, description: l.description, quantity: Number(l.quantity) || 0,
            unit_price: Number(l.unit_price) || 0, discount_pct: Number(l.discount_pct) || 0,
        }))),
        onSuccess: (data) => { qc.setQueryData(['quote', proposal.proposal_id], data); onSaved(); setError(null); },
        onError: e => setError(errorMessage(e)),
    });
    const downloadPdf = async () => {
        setPdfBusy(true);
        try { await quotesApi.pdf(proposal.proposal_id, proposal.title || 'proposal'); } catch (e) { setError(errorMessage(e)); } finally { setPdfBusy(false); }
    };
    const total = (lines || []).reduce((s, l) => s + lineTotal(l), 0);
    return (
        <Modal title="Quote" subtitle={proposal.title} onClose={onClose} width="max-w-4xl"
            footer={<>
                <SecondaryButton onClick={downloadPdf} disabled={pdfBusy || save.isPending}>
                    {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF
                </SecondaryButton>
                <SecondaryButton onClick={onClose}>Close</SecondaryButton>
                <PrimaryButton className="flex-1" onClick={() => save.mutate()} loading={save.isPending}>Save lines (sets proposal amount)</PrimaryButton>
            </>}>
            {isLoading || !lines ? <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> : (
                <div className="space-y-3">
                    <ErrorNote message={error} />
                    <table className="w-full text-sm">
                        <thead><tr className="text-left text-[11px] text-slate-400 uppercase tracking-wide">
                            <th className="pb-2 font-semibold w-44">Product</th><th className="pb-2 font-semibold">Description</th>
                            <th className="pb-2 font-semibold w-20 text-right">Qty</th><th className="pb-2 font-semibold w-28 text-right">Unit price</th>
                            <th className="pb-2 font-semibold w-20 text-right">Disc. %</th><th className="pb-2 font-semibold w-28 text-right">Total</th><th className="w-8" /></tr></thead>
                        <tbody>
                            {lines.map((l, i) => (
                                <tr key={i} className="align-top">
                                    <td className="pr-2 pb-2">
                                        <select className={`${inputClass} h-9`} value={l.product_id} onChange={e => pickProduct(i, e.target.value)}>
                                            <option value="">Custom line</option>
                                            {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="pr-2 pb-2"><input className={`${inputClass} h-9`} value={l.description} onChange={e => setLine(i, { description: e.target.value })} /></td>
                                    <td className="pr-2 pb-2"><input type="number" min="0" step="any" className={`${inputClass} h-9 text-right`} value={l.quantity} onChange={e => setLine(i, { quantity: e.target.value })} /></td>
                                    <td className="pr-2 pb-2"><input type="number" min="0" step="any" className={`${inputClass} h-9 text-right`} value={l.unit_price ?? ''} onChange={e => setLine(i, { unit_price: e.target.value })} /></td>
                                    <td className="pr-2 pb-2"><input type="number" min="0" max="100" step="any" className={`${inputClass} h-9 text-right`} value={l.discount_pct} onChange={e => setLine(i, { discount_pct: e.target.value })} /></td>
                                    <td className="pb-2 pt-2 text-right tabular-nums font-medium">{money(lineTotal(l))}</td>
                                    <td className="pb-2 pt-1.5 text-right"><button onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} className="p-1 text-slate-300 hover:text-red-500" aria-label="Remove line"><Trash2 className="w-4 h-4" /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="flex items-center justify-between">
                        <button onClick={() => setLines(ls => [...ls, { ...blankLine }])} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Plus className="w-4 h-4" /> Add line</button>
                        <p className="text-sm text-slate-600">Total <span className="text-lg font-bold text-slate-900 ml-2 tabular-nums">{money(total)}</span></p>
                    </div>
                    {!products.length && <p className="text-xs text-slate-400">No products in the price list yet; admins add them under Sales settings. Custom lines work without one.</p>}
                </div>
            )}
        </Modal>
    );
}
