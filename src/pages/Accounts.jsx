import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Building2, ChevronLeft, ChevronRight, Loader2, Wand2, X } from 'lucide-react';
import { accountsApi, errorMessage } from '../api/contacts';
import { hasPermission } from '../lib/authStorage';
import {
    Avatar, Modal, Field, inputClass, ErrorNote, PrimaryButton, SecondaryButton, relativeDate, BRAND_GRADIENT,
} from '../components/contacts/shared';

const PAGE_SIZE = 25;

export function AccountFormModal({ account, onClose, onSaved }) {
    const [form, setForm] = useState({
        name: account?.name || '', domain: account?.domain || '', website: account?.website || '',
        phone: account?.phone || '', industry: account?.industry || '', emp_band: account?.emp_band || '',
        city: account?.city || '', state: account?.state || '', country: account?.country || '',
        description: account?.description || '',
    });
    const [error, setError] = useState(null);
    const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
    const save = useMutation({
        mutationFn: () => (account ? accountsApi.update(account.account_id, form) : accountsApi.create(form)),
        onSuccess: onSaved,
        onError: err => setError(errorMessage(err)),
    });

    return (
        <Modal title={account ? 'Edit account' : 'New account'} subtitle={account ? 'Renaming updates the company name on its contacts' : 'A company your contacts work at'}
            onClose={onClose} width="max-w-xl"
            footer={<>
                <SecondaryButton onClick={onClose} className="flex-1">Cancel</SecondaryButton>
                <PrimaryButton onClick={() => save.mutate()} loading={save.isPending} disabled={!form.name.trim()} className="flex-1">
                    {account ? 'Save' : 'Create account'}
                </PrimaryButton>
            </>}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Name *" className="sm:col-span-2"><input className={inputClass} value={form.name} onChange={set('name')} autoFocus /></Field>
                <Field label="Domain"><input className={inputClass} value={form.domain} onChange={set('domain')} placeholder="acme.com" /></Field>
                <Field label="Website"><input type="url" className={inputClass} value={form.website} onChange={set('website')} placeholder="https://" /></Field>
                <Field label="Phone"><input type="tel" className={inputClass} value={form.phone} onChange={set('phone')} /></Field>
                <Field label="Industry"><input className={inputClass} value={form.industry} onChange={set('industry')} /></Field>
                <Field label="Employees"><input className={inputClass} value={form.emp_band} onChange={set('emp_band')} placeholder="51-200" /></Field>
                <Field label="City"><input className={inputClass} value={form.city} onChange={set('city')} /></Field>
                <Field label="State"><input className={inputClass} value={form.state} onChange={set('state')} /></Field>
                <Field label="Country"><input className={inputClass} value={form.country} onChange={set('country')} /></Field>
                <Field label="About" className="sm:col-span-2">
                    <textarea rows={3} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400" value={form.description} onChange={set('description')} />
                </Field>
            </div>
            <div className="mt-3"><ErrorNote message={error} /></div>
        </Modal>
    );
}

export default function Accounts() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const canManage = hasPermission('manage_prospects');
    const [search, setSearch] = useState('');
    const [q, setQ] = useState('');
    const [owner, setOwner] = useState('');
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState({ by: 'name', order: 'asc' });
    const [showNew, setShowNew] = useState(false);
    const [notice, setNotice] = useState(null);

    useEffect(() => {
        const t = setTimeout(() => { setQ(search); setPage(1); }, 300);
        return () => clearTimeout(t);
    }, [search]);

    const filters = { q, owner, sort_by: sort.by, sort_order: sort.order, page, page_size: PAGE_SIZE };
    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['accounts', filters], queryFn: () => accountsApi.list(filters), placeholderData: keepPreviousData,
    });

    const backfill = useMutation({
        mutationFn: accountsApi.backfill,
        onSuccess: res => {
            setNotice(res.linked_contacts ? `Linked ${res.linked_contacts} contact${res.linked_contacts > 1 ? 's' : ''} to accounts.` : 'Every contact with a company name already has an account.');
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
        },
        onError: err => setNotice(errorMessage(err)),
    });

    const items = data?.items || [];
    const total = data?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const sortHeader = (label, column) => (
        <button onClick={() => setSort(s => ({ by: column, order: s.by === column && s.order === 'asc' ? 'desc' : 'asc' }))}
            className={`uppercase tracking-wide ${sort.by === column ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
            {label}{sort.by === column ? (sort.order === 'asc' ? ' ↑' : ' ↓') : ''}
        </button>
    );

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
                    <p className="text-sm text-gray-400 mt-1">Companies your contacts work at</p>
                </div>
                <div className="flex items-center gap-2">
                    {canManage && (
                        <button onClick={() => backfill.mutate()} disabled={backfill.isPending}
                            title="Create accounts from contacts' company names and link contacts that have none"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 whitespace-nowrap disabled:opacity-60">
                            {backfill.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Link contacts by company
                        </button>
                    )}
                    <button onClick={() => setShowNew(true)}
                        className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all hover:shadow-md hover:scale-[1.02] whitespace-nowrap"
                        style={{ background: BRAND_GRADIENT }}>
                        <Plus className="w-4 h-4" /> New account
                    </button>
                </div>
            </div>

            {notice && (
                <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-800">
                    {notice}<button onClick={() => setNotice(null)} aria-label="Dismiss"><X className="w-4 h-4" /></button>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="px-5 py-4 flex items-center gap-3 flex-wrap" style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}>
                    {canManage && (
                        <div className="flex bg-white rounded-xl border border-slate-200 p-0.5">
                            {[['', 'All accounts'], ['me', 'My accounts'], ['unassigned', 'Unassigned']].map(([value, label]) => (
                                <button key={label} onClick={() => { setOwner(value); setPage(1); }}
                                    className={`px-3 h-8 text-sm font-medium rounded-lg ${owner === value ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</button>
                            ))}
                        </div>
                    )}
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, domain or industry…"
                            className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" />
                    </div>
                    <span className="ml-auto text-sm text-slate-500 flex items-center gap-2">
                        {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{total.toLocaleString()} account{total !== 1 ? 's' : ''}
                    </span>
                </div>

                {isLoading ? (
                    <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center mb-5">
                            <Building2 className="w-9 h-9 text-indigo-400" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 mb-1">{q ? 'No accounts match' : 'No accounts yet'}</h3>
                        <p className="text-sm text-slate-500 max-w-xs">
                            {q ? 'Try a different search.' : 'Accounts are created automatically from contacts’ company names, or add one yourself.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-left">
                                    <th className="pl-5 pr-3 py-3">{sortHeader('Account', 'name')}</th>
                                    <th className="px-3 py-3 text-slate-400 uppercase tracking-wide">Industry</th>
                                    <th className="px-3 py-3 text-slate-400 uppercase tracking-wide">Location</th>
                                    <th className="px-3 py-3">{sortHeader('Contacts', 'contacts')}</th>
                                    <th className="px-3 py-3 text-slate-400 uppercase tracking-wide">Owner</th>
                                    <th className="px-3 pr-5 py-3">{sortHeader('Updated', 'updated_at')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {items.map(a => (
                                    <tr key={a.account_id} onClick={() => navigate(`/app/accounts/${a.account_id}`)} className="cursor-pointer hover:bg-slate-50/70">
                                        <td className="pl-5 pr-3 py-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar first={a.name} last={a.name.split(/\s+/)[1]} seed={a.name} size="sm" square />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 truncate">{a.name}</p>
                                                    <p className="text-xs text-slate-500 truncate">{a.domain || '—'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-sm text-slate-600">{a.industry || '—'}</td>
                                        <td className="px-3 py-3 text-sm text-slate-600">{[a.city, a.country].filter(Boolean).join(', ') || '—'}</td>
                                        <td className="px-3 py-3 text-sm font-semibold text-slate-800">{a.contact_count}</td>
                                        <td className="px-3 py-3 text-sm text-slate-600">{a.owner_name || <span className="text-slate-400">Unassigned</span>}</td>
                                        <td className="px-3 pr-5 py-3 text-sm text-slate-500 whitespace-nowrap">{relativeDate(a.updated_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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

            {showNew && (
                <AccountFormModal onClose={() => setShowNew(false)}
                    onSaved={account => {
                        setShowNew(false);
                        queryClient.invalidateQueries({ queryKey: ['accounts'] });
                        navigate(`/app/accounts/${account.account_id}`);
                    }} />
            )}
        </div>
    );
}
