import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Search, Loader2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { accountsApi, contactsApi, errorMessage } from '../api/contacts';
import { Avatar, ErrorNote, PrimaryButton, formatDateTime, parseDate, relativeDate } from '../components/contacts/shared';

const PAGE_SIZE = 25;
const daysLeft = (purgeAt) => Math.max(0, Math.ceil((parseDate(purgeAt) - Date.now()) / 86400000));

function DeletedContacts({ setNotice, setError }) {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState([]);
    useEffect(() => { const t = setTimeout(() => { setQ(search); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);

    const { data, isLoading } = useQuery({
        queryKey: ['contacts-deleted', q, page], queryFn: () => contactsApi.deleted({ q, page, page_size: PAGE_SIZE }), placeholderData: keepPreviousData,
    });
    const restore = useMutation({
        mutationFn: ids => contactsApi.restore(ids),
        onSuccess: res => {
            setNotice(`Restored ${res.restored} contact${res.restored !== 1 ? 's' : ''}.`);
            setSelected([]);
            ['contacts-deleted', 'contacts', 'accounts', 'contact-facets'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
        },
        onError: err => setError(errorMessage(err)),
    });

    const items = data?.items || [];
    const total = data?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const allOnPage = items.length > 0 && items.every(c => selected.includes(c.prospect_id));

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="px-5 py-4 flex items-center gap-3 flex-wrap border-b border-slate-100">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deleted contacts…"
                        className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" />
                </div>
                {selected.length > 0 && (
                    <PrimaryButton onClick={() => restore.mutate(selected)} loading={restore.isPending}>
                        <RotateCcw className="w-4 h-4" /> Restore {selected.length}
                    </PrimaryButton>
                )}
                <span className="ml-auto text-sm text-slate-500">{total.toLocaleString()} deleted contact{total !== 1 ? 's' : ''}</span>
            </div>
            {isLoading ? (
                <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
            ) : items.length === 0 ? (
                <p className="py-14 text-center text-sm text-slate-400">No contacts deleted in the last 90 days.</p>
            ) : (
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50/80 text-xs font-semibold text-left text-slate-400 uppercase tracking-wide">
                            <th className="pl-5 pr-2 py-2.5 w-8"><input type="checkbox" className="accent-indigo-600" checked={allOnPage} aria-label="Select all on page"
                                onChange={() => setSelected(s => allOnPage ? s.filter(id => !items.some(c => c.prospect_id === id)) : [...new Set([...s, ...items.map(c => c.prospect_id)])])} /></th>
                            <th className="px-3 py-2.5">Contact</th><th className="px-3 py-2.5">Company</th><th className="px-3 py-2.5">Deleted</th>
                            <th className="px-3 py-2.5">Permanently removed in</th><th className="px-3 pr-5 py-2.5" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {items.map(c => (
                            <tr key={c.prospect_id}>
                                <td className="pl-5 pr-2 py-3"><input type="checkbox" className="accent-indigo-600" checked={selected.includes(c.prospect_id)} aria-label={`Select ${c.full_name}`}
                                    onChange={() => setSelected(s => s.includes(c.prospect_id) ? s.filter(x => x !== c.prospect_id) : [...s, c.prospect_id])} /></td>
                                <td className="px-3 py-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar first={c.first_name} last={c.last_name} seed={c.email} size="sm" />
                                        <div className="min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{c.full_name}</p><p className="text-xs text-slate-500 truncate">{c.email}</p></div>
                                    </div>
                                </td>
                                <td className="px-3 py-3 text-sm text-slate-600">{c.company_name || '—'}</td>
                                <td className="px-3 py-3 text-sm text-slate-600" title={formatDateTime(c.deleted_at)}>{relativeDate(c.deleted_at)}{c.deleted_by_name ? ` by ${c.deleted_by_name}` : ''}</td>
                                <td className="px-3 py-3 text-sm text-slate-600">{daysLeft(c.purge_at)} days</td>
                                <td className="px-3 pr-5 py-3 text-right">
                                    <button onClick={() => restore.mutate([c.prospect_id])} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 ml-auto">
                                        <RotateCcw className="w-3.5 h-3.5" /> Restore
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {total > PAGE_SIZE && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                    <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
                    <div className="flex gap-1">
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            )}
        </div>
    );
}

function DeletedCompanies({ setNotice, setError }) {
    const queryClient = useQueryClient();
    const { data, isLoading } = useQuery({ queryKey: ['accounts-deleted'], queryFn: accountsApi.deleted });
    const restore = useMutation({
        mutationFn: accountsApi.restore,
        onSuccess: () => {
            setNotice('Company restored.');
            ['accounts-deleted', 'accounts'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
        },
        onError: err => setError(errorMessage(err)),
    });
    const items = data?.items || [];
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            {isLoading ? (
                <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
            ) : items.length === 0 ? (
                <p className="py-14 text-center text-sm text-slate-400">No companies deleted in the last 90 days.</p>
            ) : (
                <ul className="divide-y divide-slate-50">
                    {items.map(a => (
                        <li key={a.account_id} className="flex items-center gap-3 px-5 py-3">
                            <Avatar first={a.name} last={a.name.split(/\s+/)[1]} seed={a.name} size="sm" square />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{a.name}</p>
                                <p className="text-xs text-slate-500 truncate">{a.domain || '—'} · deleted {relativeDate(a.deleted_at)} · removed in {daysLeft(a.purge_at)} days</p>
                            </div>
                            <button onClick={() => restore.mutate(a.account_id)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                <RotateCcw className="w-3.5 h-3.5" /> Restore
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function RecentlyDeleted() {
    const [tab, setTab] = useState('contacts');
    const [notice, setNotice] = useState(null);
    const [error, setError] = useState(null);
    return (
        <div className="w-full space-y-5">
            <div>
                <Link to="/app/contacts" className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1.5 mb-3"><ArrowLeft className="w-4 h-4" /> Contacts</Link>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Trash2 className="w-6 h-6 text-slate-400" /> Recently deleted</h1>
                <p className="text-sm text-gray-400 mt-1">Deleted records can be restored for 90 days, with their history, lists and activity. After that they are removed permanently.</p>
            </div>
            <div className="flex bg-white rounded-xl border border-slate-200 p-0.5 w-fit">
                {[['contacts', 'Contacts'], ['companies', 'Companies']].map(([v, l]) => (
                    <button key={v} onClick={() => setTab(v)} className={`px-4 h-8 text-sm font-medium rounded-lg ${tab === v ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{l}</button>
                ))}
            </div>
            {notice && <div className="px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-800">{notice}</div>}
            <ErrorNote message={error} />
            {tab === 'contacts' ? <DeletedContacts setNotice={setNotice} setError={setError} /> : <DeletedCompanies setNotice={setNotice} setError={setError} />}
        </div>
    );
}
