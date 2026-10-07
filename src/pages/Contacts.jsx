import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
    Search, Plus, Users, GitMerge, SlidersHorizontal, ChevronLeft, ChevronRight,
    Phone, Mail, X, Trash2, Tag, UserCheck, Loader2, Filter,
} from 'lucide-react';
import { contactsApi, accountsApi, errorMessage } from '../api/contacts';
import { getStoredUser, hasPermission } from '../lib/authStorage';
import ContactFormModal from '../components/contacts/ContactFormModal';
import MergeDuplicatesModal from '../components/contacts/MergeDuplicatesModal';
import CustomFieldsModal from '../components/contacts/CustomFieldsModal';
import { Avatar, TagChips, OwnerSelect, relativeDate, BRAND_GRADIENT } from '../components/contacts/shared';

const PAGE_SIZE = 25;
const FILTER_KEYS = ['owner', 'tag', 'account_id', 'list_id', 'campaign_id', 'consent_status', 'has_phone', 'country'];
const selectClass = 'h-9 pl-3 pr-8 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-indigo-400';

function useDebounced(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

function BulkBar({ count, owners, canDelete, onAction, busy, onClear }) {
    const [mode, setMode] = useState(null);
    const [owner, setOwner] = useState(null);
    const [tag, setTag] = useState('');
    const run = (payload) => onAction(payload).then(() => { setMode(null); setTag(''); });

    return (
        <div className="flex items-center gap-2 flex-wrap px-5 py-3 bg-indigo-50 border-b border-indigo-100">
            <span className="text-sm font-semibold text-indigo-800 mr-2">{count} selected</span>
            {mode === null && <>
                <button onClick={() => setMode('owner')} className="h-8 px-3 text-xs font-semibold rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" /> Assign owner
                </button>
                <button onClick={() => setMode('add_tags')} className="h-8 px-3 text-xs font-semibold rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Add tag
                </button>
                <button onClick={() => setMode('remove_tags')} className="h-8 px-3 text-xs font-semibold rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Remove tag
                </button>
                {canDelete && (
                    <button onClick={() => window.confirm(`Delete ${count} contact${count > 1 ? 's' : ''}? Their emails, activity and campaign history are deleted too.`) && run({ action: 'delete' })}
                        className="h-8 px-3 text-xs font-semibold rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                )}
            </>}
            {mode === 'owner' && <>
                <OwnerSelect owners={owners} value={owner} onChange={setOwner} className={selectClass} />
                <button onClick={() => run({ action: 'assign_owner', owner_id: owner })} className="h-8 px-3 text-xs font-semibold rounded-lg text-white" style={{ background: BRAND_GRADIENT }}>Apply</button>
            </>}
            {(mode === 'add_tags' || mode === 'remove_tags') && <>
                <input autoFocus value={tag} onChange={e => setTag(e.target.value)} placeholder="Tag name"
                    onKeyDown={e => e.key === 'Enter' && tag.trim() && run({ action: mode, tags: [tag.trim()] })}
                    className="h-8 px-3 bg-white border border-slate-200 rounded-lg text-sm" />
                <button disabled={!tag.trim()} onClick={() => run({ action: mode, tags: [tag.trim()] })} className="h-8 px-3 text-xs font-semibold rounded-lg text-white disabled:opacity-50" style={{ background: BRAND_GRADIENT }}>
                    {mode === 'add_tags' ? 'Add' : 'Remove'}
                </button>
            </>}
            {mode !== null && <button onClick={() => setMode(null)} className="h-8 px-3 text-xs font-semibold text-slate-500 hover:text-slate-700">Cancel</button>}
            {busy && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
            <button onClick={onClear} className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-700">Clear selection</button>
        </div>
    );
}

export default function Contacts() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const me = getStoredUser();
    const canManage = hasPermission('manage_prospects');
    const canDelete = canManage && me?.role !== 'AGENT';

    const [params, setParams] = useSearchParams();
    const [search, setSearch] = useState(params.get('q') || '');
    const debouncedSearch = useDebounced(search);
    const page = Number(params.get('page') || 1);
    const sortBy = params.get('sort_by') || 'created_at';
    const sortOrder = params.get('sort_order') || 'desc';
    const filters = Object.fromEntries(FILTER_KEYS.map(k => [k, params.get(k) || '']));

    const [selected, setSelected] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [showMerge, setShowMerge] = useState(false);
    const [showFields, setShowFields] = useState(false);
    const [showFilters, setShowFilters] = useState(FILTER_KEYS.some(k => k !== 'owner' && params.get(k)));
    const [bulkError, setBulkError] = useState(null);

    const update = (changes, resetPage = true) => {
        const next = new URLSearchParams(params);
        Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
        if (resetPage) next.delete('page');
        setParams(next, { replace: true });
        setSelected([]);
    };

    useEffect(() => {
        if ((params.get('q') || '') !== debouncedSearch) update({ q: debouncedSearch });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const query = { q: debouncedSearch, ...filters, sort_by: sortBy, sort_order: sortOrder, page, page_size: PAGE_SIZE };
    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['contacts', query],
        queryFn: () => contactsApi.list(query),
        placeholderData: keepPreviousData,
    });
    const { data: facets } = useQuery({ queryKey: ['contact-facets'], queryFn: contactsApi.facets });
    const { data: owners = [] } = useQuery({ queryKey: ['contact-owners'], queryFn: contactsApi.owners });
    const { data: fields = [] } = useQuery({ queryKey: ['contact-fields'], queryFn: contactsApi.fields });
    const { data: accountsPage } = useQuery({ queryKey: ['accounts', 'names'], queryFn: () => accountsApi.list({ page_size: 200 }) });
    const accountNames = useMemo(() => (accountsPage?.items || []).map(a => a.name), [accountsPage]);
    const filterAccount = filters.account_id && (accountsPage?.items || []).find(a => a.account_id === filters.account_id);

    const bulk = useMutation({
        mutationFn: payload => contactsApi.bulk({ prospect_ids: selected, ...payload }),
        onSuccess: () => {
            setSelected([]); setBulkError(null);
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['contact-facets'] });
        },
        onError: err => setBulkError(errorMessage(err)),
    });

    const items = data?.items || [];
    const total = data?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const activeFilterCount = FILTER_KEYS.filter(k => k !== 'owner' && filters[k]).length;
    const allSelected = items.length > 0 && items.every(c => selected.includes(c.prospect_id));

    const sortHeader = (label, column) => (
        <button onClick={() => update({ sort_by: column, sort_order: sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc' }, false)}
            className={`uppercase tracking-wide ${sortBy === column ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
            {label}{sortBy === column ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ''}
        </button>
    );

    const ownerTabs = canManage
        ? [['', 'All contacts'], ['me', 'My contacts'], ['unassigned', 'Unassigned']]
        : [['', 'My contacts']];

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Every contact in one place, across all lists{canManage ? '' : ' · showing contacts you own'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {canManage && <>
                        <button onClick={() => setShowFields(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 whitespace-nowrap">
                            <SlidersHorizontal className="w-4 h-4" /> Custom fields
                        </button>
                        <button onClick={() => setShowMerge(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 whitespace-nowrap">
                            <GitMerge className="w-4 h-4" /> Find duplicates
                        </button>
                    </>}
                    <button onClick={() => setShowAdd(true)}
                        className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                        style={{ background: BRAND_GRADIENT }}>
                        <Plus className="w-4 h-4" /> Add contact
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                {/* Toolbar */}
                <div className="px-5 py-4 space-y-3" style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}>
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex bg-white rounded-xl border border-slate-200 p-0.5">
                            {ownerTabs.map(([value, label]) => (
                                <button key={label} onClick={() => update({ owner: value })}
                                    className={`px-3 h-8 text-sm font-medium rounded-lg transition-colors ${filters.owner === value ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div className="relative flex-1 min-w-[220px] max-w-md">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, company or phone…"
                                className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" />
                            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Clear search"><X className="w-4 h-4" /></button>}
                        </div>
                        <button onClick={() => setShowFilters(s => !s)}
                            className={`h-9 px-3 flex items-center gap-1.5 text-sm font-medium rounded-xl border ${showFilters || activeFilterCount ? 'border-indigo-300 text-indigo-700 bg-indigo-50' : 'border-slate-200 text-slate-600 bg-white'}`}>
                            <Filter className="w-4 h-4" /> Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
                        </button>
                        <span className="ml-auto text-sm text-slate-500 flex items-center gap-2">
                            {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {total.toLocaleString()} contact{total !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {showFilters && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <select className={selectClass} value={filters.tag} onChange={e => update({ tag: e.target.value })}>
                                <option value="">Any tag</option>
                                {(facets?.tags || []).map(t => <option key={t.tag} value={t.tag}>{t.tag} ({t.count})</option>)}
                            </select>
                            <select className={selectClass} value={filters.list_id} onChange={e => update({ list_id: e.target.value })}>
                                <option value="">Any list</option>
                                {(facets?.lists || []).map(l => <option key={l.list_id} value={l.list_id}>{l.list_name}</option>)}
                            </select>
                            <select className={selectClass} value={filters.campaign_id} onChange={e => update({ campaign_id: e.target.value })}>
                                <option value="">Any campaign</option>
                                {(facets?.campaigns || []).map(c => <option key={c.campaign_id} value={c.campaign_id}>{c.campaign_name}</option>)}
                            </select>
                            <select className={selectClass} value={filters.country} onChange={e => update({ country: e.target.value })}>
                                <option value="">Any country</option>
                                {(facets?.countries || []).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select className={selectClass} value={filters.consent_status} onChange={e => update({ consent_status: e.target.value })}>
                                <option value="">Any status</option>
                                <option value="OPT_IN">Subscribed</option>
                                <option value="UNSUBSCRIBED">Unsubscribed</option>
                            </select>
                            <select className={selectClass} value={filters.has_phone} onChange={e => update({ has_phone: e.target.value })}>
                                <option value="">Phone: any</option>
                                <option value="true">Has phone</option>
                                <option value="false">No phone</option>
                            </select>
                            {canManage && (
                                <select className={selectClass} value={['me', 'unassigned'].includes(filters.owner) ? '' : filters.owner} onChange={e => update({ owner: e.target.value })}>
                                    <option value="">Any owner</option>
                                    {owners.map(o => <option key={o.user_id} value={o.user_id}>{o.name}</option>)}
                                </select>
                            )}
                            {filters.account_id && (
                                <span className="h-9 px-3 flex items-center gap-1.5 text-sm rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    Account: {filterAccount?.name || '…'}
                                    <button onClick={() => update({ account_id: '' })} aria-label="Clear account filter"><X className="w-3.5 h-3.5" /></button>
                                </span>
                            )}
                            {activeFilterCount > 0 && (
                                <button onClick={() => update(Object.fromEntries(FILTER_KEYS.filter(k => k !== 'owner').map(k => [k, ''])))}
                                    className="h-9 px-3 text-sm font-medium text-slate-500 hover:text-slate-700">Clear filters</button>
                            )}
                        </div>
                    )}
                </div>

                {selected.length > 0 && (
                    <BulkBar count={selected.length} owners={owners} canDelete={canDelete} busy={bulk.isPending}
                        onAction={payload => bulk.mutateAsync(payload).catch(() => {})} onClear={() => setSelected([])} />
                )}
                {bulkError && <div className="px-5 py-2 text-sm text-red-600 bg-red-50">{bulkError}</div>}

                {/* Table */}
                {isLoading ? (
                    <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center mb-5">
                            <Users className="w-9 h-9 text-indigo-400" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 mb-1">{debouncedSearch || activeFilterCount || filters.owner ? 'No contacts match' : 'No contacts yet'}</h3>
                        <p className="text-sm text-slate-500 max-w-xs mb-6">
                            {debouncedSearch || activeFilterCount || filters.owner
                                ? 'Try a different search or clear some filters.'
                                : 'Add a contact, or upload a list from the Prospects page.'}
                        </p>
                        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl">
                            <Plus className="w-4 h-4" /> Add contact
                        </button>
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
                                    <th className={`${canManage ? 'px-3' : 'pl-5 pr-3'} py-3`}>{sortHeader('Name', 'name')}</th>
                                    <th className="px-3 py-3">{sortHeader('Email & phone', 'email')}</th>
                                    <th className="px-3 py-3">{sortHeader('Company', 'company')}</th>
                                    <th className="px-3 py-3 text-slate-400 uppercase tracking-wide">Owner</th>
                                    <th className="px-3 py-3 text-slate-400 uppercase tracking-wide">Tags</th>
                                    <th className="px-3 py-3 text-slate-400 uppercase tracking-wide">Last activity</th>
                                    <th className="px-3 pr-5 py-3">{sortHeader('Added', 'created_at')}</th>
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
                                        <td className={`${canManage ? 'px-3' : 'pl-5 pr-3'} py-3`}>
                                            <div className="flex items-center gap-3 min-w-[180px]">
                                                <Avatar first={c.first_name} last={c.last_name} seed={c.email} size="sm" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 truncate">{c.full_name}</p>
                                                    <p className="text-xs text-slate-500 truncate">{c.designation || '—'}</p>
                                                </div>
                                                {c.consent_status === 'UNSUBSCRIBED' && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">UNSUB</span>}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-sm">
                                            <p className="text-slate-700 flex items-center gap-1.5 truncate max-w-[240px]"><Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />{c.email}</p>
                                            {(c.phone || c.mobile_phone) && (
                                                <p className="text-slate-500 text-xs flex items-center gap-1.5 mt-0.5"><Phone className="w-3 h-3 text-slate-400" />{c.phone || c.mobile_phone}</p>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-sm">
                                            {c.account_id
                                                ? <Link to={`/app/accounts/${c.account_id}`} onClick={e => e.stopPropagation()} className="text-indigo-600 hover:text-indigo-800 font-medium">{c.account_name || c.company_name}</Link>
                                                : <span className="text-slate-600">{c.company_name || '—'}</span>}
                                        </td>
                                        <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">{c.owner_name || <span className="text-slate-400">Unassigned</span>}</td>
                                        <td className="px-3 py-3"><TagChips tags={c.tags} max={3} /></td>
                                        <td className="px-3 py-3 text-sm text-slate-500 whitespace-nowrap">{c.last_activity_at ? relativeDate(c.last_activity_at) : '—'}</td>
                                        <td className="px-3 pr-5 py-3 text-sm text-slate-500 whitespace-nowrap">{relativeDate(c.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {total > PAGE_SIZE && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                        <p className="text-sm text-slate-500">
                            {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(page * PAGE_SIZE, total).toLocaleString()} of {total.toLocaleString()}
                        </p>
                        <div className="flex items-center gap-1">
                            <button disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, false)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
                            <span className="text-sm text-slate-600 px-2">Page {page} of {totalPages}</span>
                            <button disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) }, false)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                )}
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
                    lists={canManage ? facets?.lists || [] : []}
                    defaults={filterAccount ? { company_name: filterAccount.name } : {}}
                />
            )}
            {showMerge && <MergeDuplicatesModal onClose={() => setShowMerge(false)} />}
            {showFields && <CustomFieldsModal onClose={() => setShowFields(false)} />}
        </div>
    );
}
