import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
    Search, Plus, Users, GitMerge, SlidersHorizontal, ChevronLeft, ChevronRight, Phone, Mail, X, Trash2,
    Tag, UserCheck, Loader2, Filter, Columns3, LayoutGrid, Table2, Download, Upload, Save, Star, Share2,
    ListPlus, Megaphone, PencilLine, Archive, AlertCircle,
} from 'lucide-react';
import { contactsApi, accountsApi, viewsApi, errorMessage } from '../api/contacts';
import { getStoredUser } from '../lib/authStorage';
import ContactFormModal from '../components/contacts/ContactFormModal';
import MergeDuplicatesModal from '../components/contacts/MergeDuplicatesModal';
import CustomFieldsModal from '../components/contacts/CustomFieldsModal';
import FilterBuilder, { filterCount } from '../components/contacts/FilterBuilder';
import EnrollmentResultModal from '../components/campaigns/EnrollmentResultModal';
import {
    Avatar, TagChips, OwnerSelect, relativeDate, BRAND_GRADIENT, Modal, PrimaryButton, SecondaryButton,
    ErrorNote, Field, inputClass, CustomFieldInput, useCrmMeta, StageBadge, StatusBadge, formatCustomValue,
} from '../components/contacts/shared';

const PAGE_SIZE = 25;
const DEFAULT_COLUMNS = ['full_name', 'email', 'company_name', 'owner_name', 'lifecycle_stage', 'lead_status', 'tags', 'last_activity_at', 'created_at'];
const SORTABLE = { full_name: 'name', email: 'email', company_name: 'company', lifecycle_stage: 'lifecycle_stage', lead_status: 'lead_status', created_at: 'created_at', updated_at: 'updated_at' };
const BUILT_IN_VIEWS = [
    { id: 'all', name: 'All contacts', owner: '' },
    { id: 'mine', name: 'My contacts', owner: 'me' },
    { id: 'unassigned', name: 'Unassigned', owner: 'unassigned', manageOnly: true },
    { id: 'recent', name: 'Recently created', filters: { op: 'AND', conditions: [{ field: 'created_at', operator: 'in_last_days', value: 30 }] } },
];
const COLUMNS_KEY = 'contacts.columns';
const selectClass = 'h-9 pl-3 pr-8 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-indigo-400';

function useDebounced(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

function readColumns() {
    try { return JSON.parse(localStorage.getItem(COLUMNS_KEY)) || DEFAULT_COLUMNS; } catch { return DEFAULT_COLUMNS; }
}

// ── Cells ───────────────────────────────────────────────────────
function Cell({ col, c, fields, stageLabel, statusLabel }) {
    switch (col) {
        case 'full_name':
            return (
                <div className="flex items-center gap-3 min-w-[180px]">
                    <Avatar first={c.first_name} last={c.last_name} seed={c.email} size="sm" />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate flex items-center gap-1.5">
                            {c.full_name}
                            {c.quality_flags?.length > 0 && <AlertCircle className="w-3.5 h-3.5 text-amber-500" title={c.quality_flags.join('\n')} />}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{c.designation || '—'}</p>
                    </div>
                    {c.consent_status === 'UNSUBSCRIBED' && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">UNSUB</span>}
                </div>
            );
        case 'email':
            return (
                <div className="text-sm">
                    <p className="text-slate-700 flex items-center gap-1.5 truncate max-w-[240px]"><Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />{c.email}</p>
                    {(c.phone || c.mobile_phone) && <p className="text-slate-500 text-xs flex items-center gap-1.5 mt-0.5"><Phone className="w-3 h-3 text-slate-400" />{c.phone || c.mobile_phone}</p>}
                </div>
            );
        case 'company_name':
            return c.account_id && c.account_name
                ? <Link to={`/app/accounts/${c.account_id}`} onClick={e => e.stopPropagation()} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">{c.account_name}</Link>
                : <span className="text-sm text-slate-600">{c.company_name || '—'}</span>;
        case 'owner_name':
            return <span className="text-sm text-slate-600 whitespace-nowrap">{c.owner_name || <span className="text-slate-400">Unassigned</span>}</span>;
        case 'lifecycle_stage':
            return <StageBadge value={c.lifecycle_stage} label={stageLabel[c.lifecycle_stage]} />;
        case 'lead_status':
            return <StatusBadge value={c.lead_status} label={statusLabel[c.lead_status]} />;
        case 'tags':
            return <TagChips tags={c.tags} max={3} />;
        case 'consent_status':
            return <span className={`text-xs font-semibold ${c.consent_status === 'UNSUBSCRIBED' ? 'text-red-600' : 'text-emerald-700'}`}>{c.consent_status === 'UNSUBSCRIBED' ? 'Unsubscribed' : 'Subscribed'}</span>;
        case 'last_activity_at': case 'last_contacted_at': case 'created_at': case 'updated_at':
            return <span className="text-sm text-slate-500 whitespace-nowrap">{c[col] ? relativeDate(c[col]) : '—'}</span>;
        default:
            if (col.startsWith('custom.')) {
                const key = col.slice(7);
                return <span className="text-sm text-slate-600">{formatCustomValue(fields.find(f => f.field_key === key), c.custom_fields?.[key]) ?? '—'}</span>;
            }
            return <span className="text-sm text-slate-600">{c[col] || '—'}</span>;
    }
}

// ── Column chooser ──────────────────────────────────────────────
function ColumnChooser({ columns, setColumns, available, onClose }) {
    return (
        <div className="absolute right-0 top-11 z-30 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3">
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Columns</p>
                <button onClick={() => setColumns(DEFAULT_COLUMNS)} className="text-xs font-semibold text-indigo-600">Reset</button>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-0.5">
                {available.map(col => (
                    <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-sm text-slate-700">
                        <input type="checkbox" className="accent-indigo-600" checked={columns.includes(col.key)} disabled={col.key === 'full_name'}
                            onChange={() => setColumns(columns.includes(col.key) ? columns.filter(c => c !== col.key) : [...columns, col.key])} />
                        {col.label}
                    </label>
                ))}
            </div>
            <button onClick={onClose} className="mt-2 w-full h-8 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg">Done</button>
        </div>
    );
}

// ── Bulk actions ────────────────────────────────────────────────
function BulkBar({ count, owners, canDelete, facets, fields, meta, listId, onAction, busy, onClear }) {
    const [mode, setMode] = useState(null);
    const [owner, setOwner] = useState(null);
    const [tag, setTag] = useState('');
    const [prop, setProp] = useState('lifecycle_stage');
    const [propValue, setPropValue] = useState('');
    const [targetList, setTargetList] = useState('');
    const [newListName, setNewListName] = useState('');
    const [campaignId, setCampaignId] = useState('');
    const done = () => { setMode(null); setTag(''); setNewListName(''); };
    const run = (payload) => onAction(payload).then(done).catch(() => {});

    const staticLists = (facets?.lists || []).filter(l => l.list_type !== 'ACTIVE');
    const campaigns = (facets?.campaigns || []).filter(c => ['DRAFT', 'ACTIVE', 'PAUSED'].includes(c.status));
    const editable = [
        ['lifecycle_stage', 'Lifecycle stage', meta?.lifecycle_stages], ['lead_status', 'Lead status', meta?.lead_statuses],
        ['lead_source', 'Lead source'], ['legal_basis', 'Legal basis', meta?.legal_bases],
        ['consent_status', 'Email subscription', [{ value: 'OPT_IN', label: 'Subscribed' }, { value: 'UNSUBSCRIBED', label: 'Unsubscribed' }]],
        ['industry', 'Industry'], ['designation', 'Job title'], ['poc_country', 'Country'],
        ...fields.map(f => [`custom.${f.field_key}`, f.label, null, f]),
    ];
    const current = editable.find(e => e[0] === prop) || editable[0];
    const btn = 'h-8 px-3 text-xs font-semibold rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1.5';
    const apply = 'h-8 px-3 text-xs font-semibold rounded-lg text-white disabled:opacity-50';

    return (
        <div className="flex items-center gap-2 flex-wrap px-5 py-3 bg-indigo-50 border-b border-indigo-100">
            <span className="text-sm font-semibold text-indigo-800 mr-2">{count} selected</span>
            {mode === null && <>
                <button onClick={() => setMode('owner')} className={btn}><UserCheck className="w-3.5 h-3.5" /> Assign owner</button>
                <button onClick={() => setMode('edit')} className={btn}><PencilLine className="w-3.5 h-3.5" /> Edit property</button>
                <button onClick={() => setMode('add_tags')} className={btn}><Tag className="w-3.5 h-3.5" /> Add tag</button>
                <button onClick={() => setMode('remove_tags')} className={btn}><Tag className="w-3.5 h-3.5" /> Remove tag</button>
                <button onClick={() => setMode('list')} className={btn}><ListPlus className="w-3.5 h-3.5" /> Add to list</button>
                {listId && <button onClick={() => run({ action: 'remove_from_list', list_id: listId })} className={btn}><X className="w-3.5 h-3.5" /> Remove from this list</button>}
                <button onClick={() => setMode('enroll')} className={btn}><Megaphone className="w-3.5 h-3.5" /> Enroll in campaign</button>
                {canDelete && (
                    <button onClick={() => window.confirm(`Delete ${count} contact${count > 1 ? 's' : ''}? You can restore them from Recently deleted for 90 days.`) && run({ action: 'delete' })}
                        className="h-8 px-3 text-xs font-semibold rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                )}
            </>}
            {mode === 'owner' && <>
                <OwnerSelect owners={owners} value={owner} onChange={setOwner} className={selectClass} />
                <button onClick={() => run({ action: 'assign_owner', owner_id: owner })} className={apply} style={{ background: BRAND_GRADIENT }}>Apply</button>
            </>}
            {mode === 'edit' && <>
                <select className={selectClass} value={prop} onChange={e => { setProp(e.target.value); setPropValue(''); }}>
                    {editable.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                {current[3] ? (
                    <div className="min-w-[180px]"><CustomFieldInput field={current[3]} value={propValue} onChange={setPropValue} /></div>
                ) : current[2] ? (
                    <select className={selectClass} value={propValue} onChange={e => setPropValue(e.target.value)}>
                        <option value="">Choose…</option>
                        {current[2].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                ) : (
                    <input value={propValue} onChange={e => setPropValue(e.target.value)} placeholder="New value (blank clears)" className="h-8 px-3 bg-white border border-slate-200 rounded-lg text-sm" />
                )}
                <button onClick={() => run({ action: 'set_property', field: prop, value: propValue === '' ? null : propValue })} className={apply} style={{ background: BRAND_GRADIENT }}>Apply</button>
            </>}
            {(mode === 'add_tags' || mode === 'remove_tags') && <>
                <input autoFocus value={tag} onChange={e => setTag(e.target.value)} placeholder="Tag name" list="bulk-tags"
                    onKeyDown={e => e.key === 'Enter' && tag.trim() && run({ action: mode, tags: [tag.trim()] })}
                    className="h-8 px-3 bg-white border border-slate-200 rounded-lg text-sm" />
                <datalist id="bulk-tags">{(facets?.tags || []).map(t => <option key={t.tag} value={t.tag} />)}</datalist>
                <button disabled={!tag.trim()} onClick={() => run({ action: mode, tags: [tag.trim()] })} className={apply} style={{ background: BRAND_GRADIENT }}>
                    {mode === 'add_tags' ? 'Add' : 'Remove'}
                </button>
            </>}
            {mode === 'list' && <>
                <select className={selectClass} value={targetList} onChange={e => setTargetList(e.target.value)}>
                    <option value="">New static list…</option>
                    {staticLists.map(l => <option key={l.list_id} value={l.list_id}>{l.list_name}</option>)}
                </select>
                {!targetList && <input value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="List name" className="h-8 px-3 bg-white border border-slate-200 rounded-lg text-sm" />}
                <button disabled={!targetList && !newListName.trim()} onClick={() => run(targetList ? { action: 'add_to_list', list_id: targetList } : { action: 'add_to_list', new_list_name: newListName.trim() })}
                    className={apply} style={{ background: BRAND_GRADIENT }}>Add</button>
            </>}
            {mode === 'enroll' && <>
                <select className={selectClass} value={campaignId} onChange={e => setCampaignId(e.target.value)}>
                    <option value="">Choose a campaign…</option>
                    {campaigns.map(c => <option key={c.campaign_id} value={c.campaign_id}>{c.campaign_name} ({c.status.toLowerCase()})</option>)}
                </select>
                <button disabled={!campaignId} onClick={() => run({ action: 'enroll', campaign_id: campaignId })} className={apply} style={{ background: BRAND_GRADIENT }}>Enroll</button>
            </>}
            {mode !== null && <button onClick={() => setMode(null)} className="h-8 px-3 text-xs font-semibold text-slate-500 hover:text-slate-700">Cancel</button>}
            {busy && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
            <button onClick={onClear} className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-700">Clear selection</button>
        </div>
    );
}

// ── Board (BR-CM-20) ────────────────────────────────────────────
function Board({ params, groupBy, setGroupBy, onOpen }) {
    const queryClient = useQueryClient();
    const [error, setError] = useState(null);
    const [dragId, setDragId] = useState(null);
    const { data, isLoading } = useQuery({ queryKey: ['contacts-board', groupBy, params], queryFn: () => contactsApi.board({ ...params, group_by: groupBy }) });
    const move = useMutation({
        mutationFn: ({ id, value }) => contactsApi.update(id, { [groupBy]: value }),
        onSuccess: () => { setError(null); queryClient.invalidateQueries({ queryKey: ['contacts-board'] }); queryClient.invalidateQueries({ queryKey: ['contacts'] }); },
        onError: err => setError(errorMessage(err)),
    });
    return (
        <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Group by</span>
                <select className={selectClass} value={groupBy} onChange={e => setGroupBy(e.target.value)}>
                    <option value="lifecycle_stage">Lifecycle stage</option>
                    <option value="lead_status">Lead status</option>
                </select>
                <span className="text-xs text-slate-400">Drag a card to another column to change it.</span>
            </div>
            <ErrorNote message={error} />
            {isLoading ? <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div> : (
                <div className="flex gap-3 overflow-x-auto pb-2">
                    {(data?.lanes || []).map(lane => (
                        <div key={lane.value || 'none'} className="w-64 flex-shrink-0 bg-slate-50 rounded-2xl p-2"
                            onDragOver={e => lane.value && e.preventDefault()}
                            onDrop={() => { if (dragId && lane.value) move.mutate({ id: dragId, value: lane.value }); setDragId(null); }}>
                            <div className="flex items-center justify-between px-2 py-1.5">
                                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide truncate">{lane.label}</p>
                                <span className="text-xs font-semibold text-slate-400">{lane.total}</span>
                            </div>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                                {lane.items.map(c => (
                                    <div key={c.prospect_id} draggable onDragStart={() => setDragId(c.prospect_id)} onClick={() => onOpen(c.prospect_id)}
                                        className={`bg-white rounded-xl border border-slate-100 p-3 cursor-grab hover:shadow-md transition-shadow ${dragId === c.prospect_id ? 'opacity-50' : ''}`}>
                                        <p className="text-sm font-semibold text-slate-800 truncate">{c.full_name}</p>
                                        <p className="text-xs text-slate-500 truncate">{c.company_name || c.email}</p>
                                        <p className="text-[11px] text-slate-400 mt-1">{c.owner_name || 'Unassigned'}</p>
                                    </div>
                                ))}
                                {lane.total > lane.items.length && <p className="text-[11px] text-slate-400 text-center py-1">+{lane.total - lane.items.length} more</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Save view dialog ────────────────────────────────────────────
function SaveViewModal({ view, state, canShare, onClose, onSaved }) {
    const [name, setName] = useState(view?.name || '');
    const [shared, setShared] = useState(view?.shared || false);
    const [asNew, setAsNew] = useState(!view);
    const [error, setError] = useState(null);
    const save = useMutation({
        mutationFn: () => {
            const payload = { name, shared, filters: state.filters, columns: state.columns, sort: state.sort, object_type: 'CONTACT' };
            return asNew ? viewsApi.create(payload) : viewsApi.update(view.view_id, payload);
        },
        onSuccess: onSaved,
        onError: err => setError(errorMessage(err)),
    });
    return (
        <Modal title={asNew ? 'Save view' : `Update “${view.name}”`} subtitle="Filters, columns and sort" onClose={onClose}
            footer={<><SecondaryButton onClick={onClose} className="flex-1">Cancel</SecondaryButton>
                <PrimaryButton onClick={() => save.mutate()} loading={save.isPending} disabled={!name.trim()} className="flex-1"><Save className="w-4 h-4" /> Save</PrimaryButton></>}>
            <div className="space-y-3">
                {view && view.can_edit && (
                    <div className="flex gap-4 text-sm">
                        <label className="flex items-center gap-1.5"><input type="radio" className="accent-indigo-600" checked={!asNew} onChange={() => setAsNew(false)} /> Update this view</label>
                        <label className="flex items-center gap-1.5"><input type="radio" className="accent-indigo-600" checked={asNew} onChange={() => setAsNew(true)} /> Save as new</label>
                    </div>
                )}
                <Field label="Name"><input className={inputClass} value={name} onChange={e => setName(e.target.value)} autoFocus /></Field>
                {canShare && <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="accent-indigo-600" checked={shared} onChange={e => setShared(e.target.checked)} /> Share with everyone in the workspace</label>}
                <ErrorNote message={error} />
            </div>
        </Modal>
    );
}

// ══════════════════════════════════════════════════════════════
export default function Contacts() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const me = getStoredUser();
    const { meta, stageLabel, statusLabel } = useCrmMeta();
    const canManage = meta?.can_manage ?? false;
    const canDelete = canManage && me?.role !== 'AGENT';

    const [params, setParams] = useSearchParams();
    const [search, setSearch] = useState(params.get('q') || '');
    const debouncedSearch = useDebounced(search);
    const page = Number(params.get('page') || 1);
    const sortBy = params.get('sort_by') || 'created_at';
    const sortOrder = params.get('sort_order') || 'desc';
    const viewId = params.get('view') || 'all';
    const mode = params.get('mode') || 'table';
    const listId = params.get('list_id') || '';
    const accountId = params.get('account_id') || '';
    const filters = useMemo(() => { try { return JSON.parse(params.get('filters') || 'null'); } catch { return null; } }, [params]);

    const [columns, setColumnsState] = useState(readColumns);
    const setColumns = (cols) => { setColumnsState(cols); try { localStorage.setItem(COLUMNS_KEY, JSON.stringify(cols)); } catch { /* ignore */ } };
    const [selected, setSelected] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [showMerge, setShowMerge] = useState(false);
    const [showFields, setShowFields] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [draftFilters, setDraftFilters] = useState(filters);
    const [showColumns, setShowColumns] = useState(false);
    const [showExport, setShowExport] = useState(false);
    const [saveView, setSaveView] = useState(null);
    const [groupBy, setGroupBy] = useState('lifecycle_stage');
    const [bulkError, setBulkError] = useState(null);
    const [notice, setNotice] = useState(null);
    const [enrollReport, setEnrollReport] = useState(null);

    const { data: savedViews = [] } = useQuery({ queryKey: ['views', 'CONTACT'], queryFn: () => viewsApi.list('CONTACT') });
    const builtIn = BUILT_IN_VIEWS.find(v => v.id === viewId);
    const savedView = savedViews.find(v => v.view_id === viewId);
    const owner = builtIn?.owner ?? params.get('owner') ?? '';

    const update = (changes, resetPage = true) => {
        const next = new URLSearchParams(params);
        Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, typeof v === 'object' ? JSON.stringify(v) : v) : next.delete(k)));
        if (resetPage) next.delete('page');
        setParams(next, { replace: true });
        setSelected([]);
    };
    const applyView = (v) => {
        const next = new URLSearchParams();
        next.set('view', v.id || v.view_id);
        if (v.filters?.conditions?.length) next.set('filters', JSON.stringify(v.filters));
        if (v.sort?.by) { next.set('sort_by', v.sort.by); next.set('sort_order', v.sort.order || 'desc'); }
        if (v.columns?.length) setColumns(v.columns);
        if (mode !== 'table') next.set('mode', mode);
        setParams(next, { replace: true });
        setSearch('');
        setSelected([]);
    };

    useEffect(() => {
        if ((params.get('q') || '') !== debouncedSearch) update({ q: debouncedSearch });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);
    // The header search links here with ?q=; pick it up when we're already on this page
    const urlQ = params.get('q') || '';
    useEffect(() => {
        if (urlQ !== debouncedSearch) setSearch(urlQ);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlQ]);

    const query = { q: debouncedSearch, owner, list_id: listId, account_id: accountId, filters, sort_by: sortBy, sort_order: sortOrder, page, page_size: PAGE_SIZE };
    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['contacts', query], queryFn: () => contactsApi.list(query), placeholderData: keepPreviousData, enabled: mode === 'table',
    });
    const { data: facets } = useQuery({ queryKey: ['contact-facets'], queryFn: contactsApi.facets });
    const { data: owners = [] } = useQuery({ queryKey: ['contact-owners'], queryFn: contactsApi.owners });
    const { data: fields = [] } = useQuery({ queryKey: ['contact-fields'], queryFn: contactsApi.fields });
    const { data: accountsPage } = useQuery({ queryKey: ['accounts', 'names'], queryFn: () => accountsApi.list({ page_size: 200 }) });
    const accountNames = useMemo(() => (accountsPage?.items || []).map(a => a.name), [accountsPage]);
    const filterAccount = accountId && (accountsPage?.items || []).find(a => a.account_id === accountId);
    const filterList = listId && (facets?.lists || []).find(l => l.list_id === listId);

    const availableColumns = useMemo(() => [
        ...(meta?.columns || []).filter(c => !['full_name'].includes(c.key) || true),
        ...fields.map(f => ({ key: `custom.${f.field_key}`, label: f.label })),
    ], [meta, fields]);
    const shownColumns = columns.filter(c => availableColumns.some(a => a.key === c) || c === 'full_name');

    const bulk = useMutation({
        mutationFn: payload => contactsApi.bulk({ prospect_ids: selected, ...payload }),
        onSuccess: (res) => {
            setSelected([]); setBulkError(null);
            if (res.action === 'enroll') setEnrollReport({ enrolled: res.enrolled_count, rejected: res.rejected || [], rejectedCount: res.rejected_count, limitNotice: res.daily_limit_notice });
            else if (res.action === 'add_to_list') setNotice(`Added ${res.updated} to “${res.list_name}”${res.already_in_list ? ` (${res.already_in_list} already there)` : ''}.`);
            else if (res.skipped?.length) setNotice(`Updated ${res.updated}; ${res.skipped.length} skipped: ${res.skipped[0].reason}`);
            else if (res.action === 'delete') setNotice(`Deleted ${res.updated}. Restore them from Recently deleted within 90 days.`);
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['contact-facets'] });
        },
        onError: err => setBulkError(errorMessage(err)),
    });

    const items = data?.items || [];
    const total = data?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const nFilters = filterCount(filters);
    const allSelected = items.length > 0 && items.every(c => selected.includes(c.prospect_id));
    const viewDirty = savedView && (JSON.stringify(savedView.filters || null) !== JSON.stringify(filters || null));
    const columnLabel = (key) => availableColumns.find(c => c.key === key)?.label || key;

    const sortHeader = (key) => {
        const column = SORTABLE[key];
        const label = columnLabel(key);
        if (!column) return <span className="uppercase tracking-wide text-slate-400">{label}</span>;
        return (
            <button onClick={() => update({ sort_by: column, sort_order: sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc' }, false)}
                className={`uppercase tracking-wide whitespace-nowrap ${sortBy === column ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                {label}{sortBy === column ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ''}
            </button>
        );
    };

    const views = [...BUILT_IN_VIEWS.filter(v => !v.manageOnly || canManage), ...savedViews.map(v => ({ ...v, id: v.view_id }))];

    return (
        <div className="w-full space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900">Contacts</h1>
                    <p className="text-sm text-gray-400 mt-1">Every contact in one place{canManage ? '' : ' · showing contacts you own'}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {canManage && <>
                        <Link to="/app/import" className="flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 whitespace-nowrap"><Upload className="w-4 h-4" /> Import</Link>
                        {meta?.can_export && (
                            <div className="relative">
                                <button onClick={() => setShowExport(s => !s)} className="flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 whitespace-nowrap"><Download className="w-4 h-4" /> Export</button>
                                {showExport && (
                                    <div className="absolute right-0 top-12 z-30 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-1">
                                        {['csv', 'xlsx'].map(fmt => (
                                            <button key={fmt} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50"
                                                onClick={() => { setShowExport(false); contactsApi.exportFile({ format: fmt, columns: shownColumns.filter(c => !c.startsWith('custom.')).join(','), q: debouncedSearch, owner, list_id: listId, filters }).catch(err => setNotice(errorMessage(err))); }}>
                                                This view as {fmt.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <button onClick={() => setShowFields(true)} className="flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 whitespace-nowrap"><SlidersHorizontal className="w-4 h-4" /> Properties</button>
                        <button onClick={() => setShowMerge(true)} className="flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 whitespace-nowrap"><GitMerge className="w-4 h-4" /> Duplicates</button>
                        <Link to="/app/recently-deleted" className="flex items-center gap-2 h-9 px-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 whitespace-nowrap" title="Recently deleted"><Archive className="w-4 h-4" /></Link>
                    </>}
                    <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 text-white h-9 px-4 rounded-lg text-sm font-semibold hover:opacity-90 whitespace-nowrap" style={{ background: BRAND_GRADIENT }}>
                        <Plus className="w-4 h-4" /> Add contact
                    </button>
                </div>
            </div>

            {notice && <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-800">{notice}<button onClick={() => setNotice(null)} aria-label="Dismiss"><X className="w-4 h-4" /></button></div>}

            <div className="flex gap-5 items-start">
                {/* Views */}
                <aside className="w-52 flex-shrink-0 hidden xl:block">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide px-3 mb-1.5">Views</p>
                    <nav className="space-y-0.5">
                        {views.map(v => (
                            <button key={v.id} onClick={() => applyView(v)}
                                className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-2 ${viewId === v.id ? 'bg-white shadow-sm font-semibold text-indigo-700' : 'text-slate-600 hover:bg-white/60'}`}>
                                {v.view_id ? (v.shared ? <Share2 className="w-3.5 h-3.5 flex-shrink-0" /> : <Star className="w-3.5 h-3.5 flex-shrink-0" />) : <Users className="w-3.5 h-3.5 flex-shrink-0" />}
                                <span className="truncate">{v.name}</span>
                            </button>
                        ))}
                    </nav>
                    <button onClick={() => setSaveView({ view: null })} className="mt-2 w-full text-left px-3 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Save current view</button>
                    {savedView?.can_edit && (
                        <button onClick={() => window.confirm(`Delete view “${savedView.name}”?`) && viewsApi.remove(savedView.view_id).then(() => { queryClient.invalidateQueries({ queryKey: ['views'] }); applyView(BUILT_IN_VIEWS[0]); })}
                            className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-red-600">Delete this view</button>
                    )}
                </aside>

                <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-100" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    {/* Toolbar */}
                    <div className="px-5 py-4 space-y-3 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}>
                        <div className="flex items-center gap-3 flex-wrap">
                            <select className={`${selectClass} xl:hidden`} value={viewId} onChange={e => applyView(views.find(v => v.id === e.target.value))}>
                                {views.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                            <div className="relative flex-1 min-w-[220px] max-w-md">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, company or phone…"
                                    className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" />
                                {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Clear search"><X className="w-4 h-4" /></button>}
                            </div>
                            <button onClick={() => { setDraftFilters(filters || { op: 'AND', conditions: [] }); setShowFilters(s => !s); }}
                                className={`h-9 px-3 flex items-center gap-1.5 text-sm font-medium rounded-xl border ${showFilters || nFilters ? 'border-indigo-300 text-indigo-700 bg-indigo-50' : 'border-slate-200 text-slate-600 bg-white'}`}>
                                <Filter className="w-4 h-4" /> Filters{nFilters ? ` (${nFilters})` : ''}
                            </button>
                            <div className="relative">
                                <button onClick={() => setShowColumns(s => !s)} disabled={mode !== 'table'} className="h-9 px-3 flex items-center gap-1.5 text-sm font-medium rounded-xl border border-slate-200 text-slate-600 bg-white disabled:opacity-50"><Columns3 className="w-4 h-4" /> Columns</button>
                                {showColumns && <ColumnChooser columns={columns} setColumns={setColumns} available={availableColumns} onClose={() => setShowColumns(false)} />}
                            </div>
                            <div className="flex bg-white rounded-xl border border-slate-200 p-0.5">
                                <button onClick={() => update({ mode: '' }, false)} className={`h-8 px-2.5 rounded-lg ${mode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`} aria-label="Table view"><Table2 className="w-4 h-4" /></button>
                                <button onClick={() => update({ mode: 'board' }, false)} className={`h-8 px-2.5 rounded-lg ${mode === 'board' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`} aria-label="Board view"><LayoutGrid className="w-4 h-4" /></button>
                            </div>
                            {(viewDirty || (!savedView && nFilters > 0)) && (
                                <button onClick={() => setSaveView({ view: savedView || null })} className="h-9 px-3 text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"><Save className="w-4 h-4" /> Save view</button>
                            )}
                            <span className="ml-auto text-sm text-slate-500 flex items-center gap-2">
                                {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {mode === 'table' && `${total.toLocaleString()} contact${total !== 1 ? 's' : ''}`}
                            </span>
                        </div>
                        {(filterAccount || filterList) && (
                            <div className="flex gap-2 flex-wrap">
                                {filterAccount && <span className="h-8 px-3 flex items-center gap-1.5 text-sm rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">Company: {filterAccount.name}<button onClick={() => update({ account_id: '' })} aria-label="Clear company filter"><X className="w-3.5 h-3.5" /></button></span>}
                                {filterList && <span className="h-8 px-3 flex items-center gap-1.5 text-sm rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">List: {filterList.list_name}<button onClick={() => update({ list_id: '' })} aria-label="Clear list filter"><X className="w-3.5 h-3.5" /></button></span>}
                            </div>
                        )}
                        {showFilters && (
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                                <FilterBuilder value={draftFilters} onChange={setDraftFilters} />
                                <div className="flex gap-2 justify-end">
                                    <SecondaryButton onClick={() => { setDraftFilters({ op: 'AND', conditions: [] }); update({ filters: '' }); setShowFilters(false); }} className="h-9">Clear all</SecondaryButton>
                                    <PrimaryButton onClick={() => { update({ filters: filterCount(draftFilters) ? draftFilters : '' }); setShowFilters(false); }} className="h-9">Apply filters</PrimaryButton>
                                </div>
                            </div>
                        )}
                    </div>

                    {selected.length > 0 && mode === 'table' && (
                        <BulkBar count={selected.length} owners={owners} canDelete={canDelete} facets={facets} fields={fields} meta={meta}
                            listId={filterList?.list_type === 'STATIC' ? listId : null}
                            busy={bulk.isPending} onAction={payload => bulk.mutateAsync(payload)} onClear={() => setSelected([])} />
                    )}
                    {bulkError && <div className="px-5 py-2 text-sm text-red-600 bg-red-50">{bulkError}</div>}

                    {mode === 'board' ? (
                        <Board params={{ q: debouncedSearch, owner, filters }} groupBy={groupBy} setGroupBy={setGroupBy} onOpen={id => navigate(`/app/contacts/${id}`)} />
                    ) : isLoading ? (
                        <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center mb-5"><Users className="w-9 h-9 text-indigo-400" /></div>
                            <h3 className="text-base font-bold text-slate-800 mb-1">{debouncedSearch || nFilters || owner || listId ? 'No contacts match' : 'No contacts yet'}</h3>
                            <p className="text-sm text-slate-500 max-w-xs mb-6">{debouncedSearch || nFilters || owner || listId ? 'Try a different search or change the filters.' : 'Add a contact, or import a spreadsheet.'}</p>
                            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl"><Plus className="w-4 h-4" /> Add contact</button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-left">
                                        {canManage && (
                                            <th className="pl-5 pr-2 py-3 w-10">
                                                <input type="checkbox" className="accent-indigo-600" checked={allSelected} aria-label="Select all on page"
                                                    onChange={() => setSelected(allSelected ? [] : items.map(c => c.prospect_id))} />
                                            </th>
                                        )}
                                        {shownColumns.map((col, i) => <th key={col} className={`${i === 0 && !canManage ? 'pl-5' : 'px-3'} py-3`}>{sortHeader(col)}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {items.map(c => (
                                        <tr key={c.prospect_id} onClick={() => navigate(`/app/contacts/${c.prospect_id}`)}
                                            className={`cursor-pointer hover:bg-slate-50/70 transition-colors ${selected.includes(c.prospect_id) ? 'bg-indigo-50/40' : ''}`}>
                                            {canManage && (
                                                <td className="pl-5 pr-2 py-3" onClick={e => e.stopPropagation()}>
                                                    <input type="checkbox" className="accent-indigo-600" checked={selected.includes(c.prospect_id)} aria-label={`Select ${c.full_name}`}
                                                        onChange={() => setSelected(s => s.includes(c.prospect_id) ? s.filter(x => x !== c.prospect_id) : [...s, c.prospect_id])} />
                                                </td>
                                            )}
                                            {shownColumns.map((col, i) => (
                                                <td key={col} className={`${i === 0 && !canManage ? 'pl-5 pr-3' : 'px-3'} py-3`}>
                                                    <Cell col={col} c={c} fields={fields} stageLabel={stageLabel} statusLabel={statusLabel} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {mode === 'table' && total > PAGE_SIZE && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                            <p className="text-sm text-slate-500">{((page - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(page * PAGE_SIZE, total).toLocaleString()} of {total.toLocaleString()}</p>
                            <div className="flex items-center gap-1">
                                <button disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, false)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
                                <span className="text-sm text-slate-600 px-2">Page {page} of {totalPages}</span>
                                <button disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) }, false)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showAdd && (
                <ContactFormModal
                    onClose={() => setShowAdd(false)}
                    onCreated={contact => {
                        setShowAdd(false);
                        queryClient.invalidateQueries({ queryKey: ['contacts'] });
                        queryClient.invalidateQueries({ queryKey: ['contact-facets'] });
                        queryClient.invalidateQueries({ queryKey: ['accounts'] });
                        navigate(`/app/contacts/${contact.prospect_id}`);
                    }}
                    owners={owners} fields={fields} canAssign={canManage}
                    tagSuggestions={(facets?.tags || []).map(t => t.tag)}
                    accountNames={accountNames}
                    lists={canManage ? (facets?.lists || []).filter(l => l.list_type !== 'ACTIVE') : []}
                    defaults={filterAccount ? { company_name: filterAccount.name } : {}}
                />
            )}
            {showMerge && <MergeDuplicatesModal onClose={() => setShowMerge(false)} />}
            {showFields && <CustomFieldsModal onClose={() => setShowFields(false)} />}
            {saveView && (
                <SaveViewModal view={saveView.view} canShare={canManage} onClose={() => setSaveView(null)}
                    state={{ filters, columns: shownColumns, sort: { by: sortBy, order: sortOrder } }}
                    onSaved={v => { setSaveView(null); queryClient.invalidateQueries({ queryKey: ['views'] }); update({ view: v.view_id }, false); }} />
            )}
            {enrollReport && (
                <EnrollmentResultModal title="Enrolled in campaign" enrolled={enrollReport.enrolled} rejected={enrollReport.rejected}
                    rejectedCount={enrollReport.rejectedCount} limitNotice={enrollReport.limitNotice} note={enrollReport.rejected.length ? 'These contacts were not enrolled:' : null}
                    onClose={() => setEnrollReport(null)} />
            )}
        </div>
    );
}
