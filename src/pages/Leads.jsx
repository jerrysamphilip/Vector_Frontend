import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Loader2, Target, LayoutGrid, List, AlertCircle, MessageSquareReply, ChevronDown, ChevronUp, PanelLeft } from 'lucide-react';
import { LeadPanel } from './LeadDetail';
import { contactsApi, errorMessage } from '../api/contacts';
import { leadsApi } from '../api/sales';
import { Avatar, ErrorNote, Field, Modal, PrimaryButton, SecondaryButton, inputClass, relativeDate, BRAND_GRADIENT } from '../components/contacts/shared';
import { Empty, LeadStageBadge, OwnerFilter, PageHeader, Seg, card, cardShadow, selectSm, useLeadsMeta } from '../components/sales/shared';

/** Pick a contact and create a lead for it (BR-LD-01). */
export function NewLeadModal({ onClose, onCreated, contact }) {
    const [q, setQ] = useState('');
    const [term, setTerm] = useState('');
    const [picked, setPicked] = useState(contact || null);
    const [source, setSource] = useState(contact?.lead_source || '');
    const [error, setError] = useState(null);
    useEffect(() => { const t = setTimeout(() => setTerm(q), 250); return () => clearTimeout(t); }, [q]);
    const { data } = useQuery({ queryKey: ['lead-contact-pick', term], queryFn: () => contactsApi.list({ q: term, page_size: 8 }), enabled: !contact && term.length >= 2 });
    const create = useMutation({
        mutationFn: () => leadsApi.create({ prospect_id: picked.prospect_id, source: source || undefined }),
        onSuccess: onCreated,
        onError: err => {
            const id = err?.response?.data?.detail?.lead_id;
            setError(id ? <>This contact already has an open lead. <Link className="font-semibold underline" to={`/app/leads/${id}`}>Open it</Link></> : errorMessage(err));
        },
    });
    return (
        <Modal title="New lead" subtitle="A lead tracks a contact you are working towards a sale" onClose={onClose}
            footer={<>
                <SecondaryButton onClick={onClose} className="flex-1">Cancel</SecondaryButton>
                <PrimaryButton onClick={() => create.mutate()} loading={create.isPending} disabled={!picked} className="flex-1">Create lead</PrimaryButton>
            </>}>
            <div className="space-y-4">
                {picked ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                        <Avatar first={picked.first_name} last={picked.last_name} seed={picked.email} size="sm" />
                        <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{picked.full_name}</p><p className="text-xs text-slate-500 truncate">{picked.email}{picked.company_name ? ` · ${picked.company_name}` : ''}</p></div>
                        {!contact && <button onClick={() => setPicked(null)} className="text-xs font-semibold text-indigo-600">Change</button>}
                    </div>
                ) : (
                    <Field label="Contact">
                        <input className={inputClass} value={q} onChange={e => setQ(e.target.value)} placeholder="Search your contacts…" autoFocus />
                        <ul className="mt-2 divide-y divide-slate-50 border border-slate-100 rounded-xl max-h-60 overflow-y-auto empty:hidden">
                            {(data?.items || []).map(c => (
                                <li key={c.prospect_id}><button onClick={() => { setPicked(c); setSource(c.lead_source || ''); }} className="w-full text-left px-3 py-2 hover:bg-slate-50">
                                    <p className="text-sm font-semibold text-slate-800">{c.full_name}</p><p className="text-xs text-slate-500">{c.email}{c.company_name ? ` · ${c.company_name}` : ''}</p>
                                </button></li>
                            ))}
                        </ul>
                    </Field>
                )}
                <Field label="Lead source" hint="e.g. Webinar, Campaign reply, Referral"><input className={inputClass} value={source} onChange={e => setSource(e.target.value)} /></Field>
                <ErrorNote message={error} />
            </div>
        </Modal>
    );
}

function LeadCard({ lead }) {
    return (
        <Link to={`/app/leads/${lead.lead_id}`} className="block bg-white rounded-xl border border-slate-100 p-3 hover:border-indigo-200 hover:shadow-sm">
            <p className="text-sm font-semibold text-slate-800 truncate">{lead.contact_name}</p>
            <p className="text-xs text-slate-500 truncate">{lead.company_name || lead.contact_email}</p>
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                <span className="truncate">{lead.owner_name}</span>
                <span className={lead.days_in_stage > 14 ? 'text-amber-600 font-semibold' : ''}>{lead.days_in_stage}d in stage</span>
            </div>
            {lead.next_step && <p className={`text-[11px] mt-1 truncate ${lead.next_step_overdue ? 'text-red-600' : 'text-slate-500'}`}>→ {lead.next_step}</p>}
        </Link>
    );
}

/** Positive campaign replies from contacts who have no open lead yet: one click to turn them into leads (BR-SF-01). */
function ReplySuggestions() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState(null);
    const { data } = useQuery({ queryKey: ['reply-suggestions'], queryFn: leadsApi.replySuggestions });
    const create = useMutation({
        mutationFn: (messageId) => leadsApi.fromMessage(messageId),
        onSuccess: (lead) => { queryClient.invalidateQueries({ queryKey: ['leads'] }); queryClient.invalidateQueries({ queryKey: ['reply-suggestions'] }); navigate(`/app/leads/${lead.lead_id}`); },
        onError: (e) => {
            const detail = e?.response?.data?.detail;
            if (e?.response?.status === 409 && detail?.lead_id) navigate(`/app/leads/${detail.lead_id}`);
            else setError(errorMessage(e));
        },
    });
    const items = data?.items || [];
    if (!items.length) return null;
    return (
        <div className={`${card} border-emerald-100`} style={cardShadow}>
            <button onClick={() => setOpen(o => !o)} className="w-full px-5 py-3 flex items-center justify-between text-left">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <MessageSquareReply className="w-4 h-4 text-emerald-600" /> {items.length} positive {items.length === 1 ? 'reply' : 'replies'} without a lead
                </span>
                {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {open && (
                <div className="px-5 pb-4 space-y-2">
                    <ErrorNote message={error} />
                    {items.slice(0, 8).map(r => (
                        <div key={r.message_id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                    <Link to={`/app/contacts/${r.prospect_id}`} className="hover:text-indigo-700">{r.contact_name}</Link>
                                    {r.company_name && <span className="font-normal text-slate-500"> · {r.company_name}</span>}
                                    <span className="font-normal text-[11px] text-slate-400"> · {relativeDate(r.received_at)}</span>
                                </p>
                                <p className="text-xs text-slate-500 truncate">{r.snippet || r.subject}</p>
                            </div>
                            <PrimaryButton className="h-8 px-3 text-xs" loading={create.isPending && create.variables === r.message_id}
                                onClick={() => create.mutate(r.message_id)}>Create lead</PrimaryButton>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/** List on the left, the selected lead on the right; j / k move through the list (redesign C). */
function SplitView({ filters, stage, onStage, meta }) {
    const [params, setParams] = useSearchParams();
    const selected = params.get('lead');
    const listRef = useRef(null);
    const { data, isLoading } = useQuery({ queryKey: ['leads', 'split', filters, stage], placeholderData: keepPreviousData,
        queryFn: () => leadsApi.list({ ...filters, stage: stage || undefined, open_only: !stage, page_size: 200, sort_by: 'stage_changed_at', sort_order: 'desc' }) });
    const items = data?.items || [];
    const select = (id) => setParams(p => { const n = new URLSearchParams(p); if (id) n.set('lead', id); else n.delete('lead'); return n; }, { replace: true });
    useEffect(() => { if (!selected && items.length) select(items[0].lead_id); }, [items.length]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        const onKey = (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.metaKey || e.ctrlKey) return;
            if (e.key !== 'j' && e.key !== 'k') return;
            const i = items.findIndex(l => l.lead_id === selected);
            const next = items[Math.min(items.length - 1, Math.max(0, i + (e.key === 'j' ? 1 : -1)))];
            if (next) { select(next.lead_id); listRef.current?.querySelector(`[data-id="${next.lead_id}"]`)?.scrollIntoView({ block: 'nearest' }); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }); // re-bind with the latest list and selection
    const short = { SQL: 'SQL', CONVERTED: 'Converted', ENGAGED: 'Engaged' };
    const chips = [['', 'All open'], ...(meta?.stages || []).map(s => [s.value, short[s.value] || s.label])];
    return (
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 items-start">
            <div className={`${card} overflow-hidden lg:sticky lg:top-20`}>
                <div className="px-3 py-2.5 border-b border-slate-100 flex gap-1.5 flex-wrap">
                    {chips.map(([v, l]) => (
                        <button key={v || 'open'} onClick={() => onStage(v)}
                            className={`px-2.5 h-7 rounded-md text-xs font-semibold ${stage === v ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{l}</button>
                    ))}
                </div>
                <div ref={listRef} className="max-h-[calc(100vh-260px)] overflow-y-auto divide-y divide-slate-100">
                    {isLoading && <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>}
                    {!isLoading && !items.length && <Empty icon={Target} title="No leads here" />}
                    {items.map(l => (
                        <button key={l.lead_id} data-id={l.lead_id} onClick={() => select(l.lead_id)}
                            className={`w-full text-left px-4 py-3 ${selected === l.lead_id ? 'bg-indigo-50 shadow-[inset_3px_0_0_#4f46e5]' : 'hover:bg-slate-50'}`}>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-slate-800 truncate">{l.contact_name}</span>
                                <LeadStageBadge stage={l.stage} label={l.stage_label} />
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{l.company_name || l.contact_email}</p>
                            <p className={`text-xs mt-0.5 truncate ${l.next_step_overdue ? 'text-red-600' : 'text-slate-400'}`}>
                                {l.next_step ? `${l.next_step_overdue ? 'Overdue: ' : 'Next: '}${l.next_step}` : `${l.days_in_stage}d in stage`} · {l.owner_name}
                            </p>
                        </button>
                    ))}
                </div>
                <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400 flex justify-between"><span>{data?.total ?? 0} leads</span><span>j / k to move</span></div>
            </div>
            <div className="min-w-0">
                {selected ? <LeadPanel key={selected} id={selected} embedded onRemoved={() => select(null)} />
                    : <div className={`${card} py-24`}><Empty icon={Target} title="Pick a lead" text="Its details open here." /></div>}
            </div>
        </div>
    );
}

export default function Leads() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const meta = useLeadsMeta();
    const [params, setParams] = useSearchParams();
    const mode = params.get('mode') || 'split';
    const stage = params.get('stage') || '';
    const owner = params.get('owner') || '';
    const source = params.get('source') || '';
    const [search, setSearch] = useState('');
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const [creating, setCreating] = useState(false);
    useEffect(() => { const t = setTimeout(() => { setQ(search); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);
    const update = (patch) => setParams(p => { const n = new URLSearchParams(p); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); return n; });

    const filters = { owner, source, q };
    const list = useQuery({ queryKey: ['leads', 'list', filters, stage, page], enabled: mode === 'list', placeholderData: keepPreviousData,
        queryFn: () => leadsApi.list({ ...filters, stage, page, page_size: 50 }) });
    const board = useQuery({ queryKey: ['leads', 'board', filters], enabled: mode === 'board', queryFn: () => leadsApi.board(filters) });

    return (
        <div className="w-full space-y-5">
            <PageHeader title="Leads" subtitle="Contacts you are qualifying towards a sale">
                <Link to="/app/sql-queue" className="h-9 px-3.5 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 flex items-center">SQL queue</Link>
                <PrimaryButton onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> New lead</PrimaryButton>
            </PageHeader>
            <ReplySuggestions />

            <div className={`${card} px-5 py-4 flex items-center gap-3 flex-wrap`} style={cardShadow}>
                <Seg options={[['split', <span key="s" className="flex items-center gap-1.5"><PanelLeft className="w-3.5 h-3.5" />Split</span>], ['board', <span key="b" className="flex items-center gap-1.5"><LayoutGrid className="w-3.5 h-3.5" />Board</span>], ['list', <span key="l" className="flex items-center gap-1.5"><List className="w-3.5 h-3.5" />Table</span>]]}
                    value={mode} onChange={v => update({ mode: v })} />
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or company…"
                        className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" />
                </div>
                {mode === 'list' && (
                    <select className={selectSm} value={stage} onChange={e => { update({ stage: e.target.value }); setPage(1); }} aria-label="Stage">
                        <option value="">All stages</option>
                        {(meta?.stages || []).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                )}
                <OwnerFilter value={owner} onChange={v => update({ owner: v })} />
                {(list.data?.sources || []).length > 0 && (
                    <select className={selectSm} value={source} onChange={e => update({ source: e.target.value })} aria-label="Source">
                        <option value="">All sources</option>
                        {list.data.sources.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                )}
            </div>

            {mode === 'split' ? (
                <SplitView filters={filters} stage={stage} onStage={v => update({ stage: v, lead: '' })} meta={meta} />
            ) : mode === 'board' ? (
                board.isLoading ? <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {(board.data?.columns || []).map(col => (
                            <div key={col.stage} className="bg-slate-50/80 rounded-2xl p-3 min-h-[200px]">
                                <div className="flex items-center justify-between px-1 mb-2">
                                    <LeadStageBadge stage={col.stage} label={col.label} />
                                    <span className="text-xs font-semibold text-slate-500">{col.count}</span>
                                </div>
                                <div className="space-y-2">
                                    {col.items.map(l => <LeadCard key={l.lead_id} lead={l} />)}
                                    {col.count > col.items.length && (
                                        <button onClick={() => update({ mode: 'list', stage: col.stage })} className="w-full text-xs font-semibold text-indigo-600 py-1">View all {col.count}</button>
                                    )}
                                    {!col.count && <p className="text-xs text-slate-400 text-center py-6">No leads</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                <div className={`${card} overflow-hidden`} style={cardShadow}>
                    {list.isLoading ? <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                        : !(list.data?.items || []).length ? <Empty icon={Target} title="No leads" text="Create a lead from a contact to start qualifying it." /> : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead><tr className="bg-slate-50/80 text-xs font-semibold text-left text-slate-400 uppercase tracking-wide">
                                        <th className="pl-5 pr-3 py-3">Lead</th><th className="px-3 py-3">Stage</th><th className="px-3 py-3">Owner</th>
                                        <th className="px-3 py-3">Source</th><th className="px-3 py-3">Next step</th><th className="px-3 py-3">Age</th><th className="px-3 pr-5 py-3">Created</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {list.data.items.map(l => (
                                            <tr key={l.lead_id} onClick={() => navigate(`/app/leads/${l.lead_id}`)} className="cursor-pointer hover:bg-slate-50/70">
                                                <td className="pl-5 pr-3 py-3"><p className="text-sm font-semibold text-slate-800">{l.contact_name}</p><p className="text-xs text-slate-500">{l.company_name || l.contact_email}</p></td>
                                                <td className="px-3 py-3"><LeadStageBadge stage={l.stage} label={l.stage_label} /></td>
                                                <td className="px-3 py-3 text-sm text-slate-600">{l.owner_name}</td>
                                                <td className="px-3 py-3 text-sm text-slate-600">{l.source || '—'}</td>
                                                <td className="px-3 py-3 text-sm">{l.next_step ? <span className={l.next_step_overdue ? 'text-red-600 flex items-center gap-1' : 'text-slate-600'}>{l.next_step_overdue && <AlertCircle className="w-3.5 h-3.5" />}{l.next_step}</span> : <span className="text-slate-300">—</span>}</td>
                                                <td className="px-3 py-3 text-sm text-slate-600">{l.age_days}d</td>
                                                <td className="px-3 pr-5 py-3 text-sm text-slate-500">{relativeDate(l.created_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {list.data.total > 50 && (
                                    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
                                        <span>{list.data.total} leads</span>
                                        <div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="disabled:opacity-40">Previous</button>
                                            <button disabled={page * 50 >= list.data.total} onClick={() => setPage(p => p + 1)} className="disabled:opacity-40">Next</button></div>
                                    </div>
                                )}
                            </div>
                        )}
                </div>
            )}

            {creating && <NewLeadModal onClose={() => setCreating(false)} onCreated={l => { setCreating(false); queryClient.invalidateQueries({ queryKey: ['leads'] }); navigate(`/app/leads/${l.lead_id}`); }} />}
        </div>
    );
}
