import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, ListChecks, Zap, Pencil, Trash2, Loader2, Users } from 'lucide-react';
import { listsApi, errorMessage } from '../api/contacts';
import { hasPermission } from '../lib/authStorage';
import FilterBuilder, { filterCount } from '../components/contacts/FilterBuilder';
import {
    BRAND_GRADIENT, ErrorNote, Field, inputClass, Modal, PrimaryButton, SecondaryButton, relativeDate,
} from '../components/contacts/shared';

/** Create or edit a list. Active lists keep a filter and update themselves (BR-CM-20). */
function ListFormModal({ list, onClose, onSaved }) {
    const [form, setForm] = useState({
        list_name: list?.list_name || '', description: list?.description || '',
        list_type: list?.list_type || 'STATIC', filters: list?.filters || { op: 'AND', conditions: [] },
    });
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState(null);
    const isActive = form.list_type === 'ACTIVE';
    const nConditions = filterCount(form.filters);

    // Live member count while the filter is edited
    useEffect(() => {
        if (!isActive || !nConditions) { setPreview(null); return undefined; }
        const t = setTimeout(() => {
            listsApi.preview(form.filters).then(setPreview).catch(err => setPreview({ error: errorMessage(err) }));
        }, 400);
        return () => clearTimeout(t);
    }, [isActive, form.filters, nConditions]);

    const save = useMutation({
        mutationFn: () => {
            const payload = { list_name: form.list_name, description: form.description, list_type: form.list_type };
            if (isActive) payload.filters = form.filters;
            return list ? listsApi.update(list.list_id, payload) : listsApi.create(payload);
        },
        onSuccess: onSaved,
        onError: err => setError(errorMessage(err)),
    });

    return (
        <Modal title={list ? 'Edit list' : 'New list'} subtitle="Group contacts to filter, export or enroll them in a campaign"
            onClose={onClose} width={isActive ? 'max-w-3xl' : 'max-w-lg'}
            footer={<>
                <SecondaryButton onClick={onClose} className="flex-1">Cancel</SecondaryButton>
                <PrimaryButton onClick={() => save.mutate()} loading={save.isPending} className="flex-1"
                    disabled={!form.list_name.trim() || (isActive && !nConditions)}>
                    {list ? 'Save' : 'Create list'}
                </PrimaryButton>
            </>}>
            <div className="space-y-4">
                <Field label="Name"><input className={inputClass} value={form.list_name} autoFocus
                    onChange={e => setForm(f => ({ ...f, list_name: e.target.value }))} placeholder="e.g. Q4 webinar invitees" /></Field>
                <Field label="Description"><input className={inputClass} value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></Field>
                {!list && (
                    <div className="grid grid-cols-2 gap-3">
                        {[['STATIC', 'Static list', 'You add and remove contacts yourself', ListChecks],
                          ['ACTIVE', 'Active list', 'Membership updates from a filter', Zap]].map(([value, label, hint, Icon]) => (
                            <button key={value} type="button" onClick={() => setForm(f => ({ ...f, list_type: value }))}
                                className={`text-left p-3 rounded-xl border-2 transition-colors ${form.list_type === value ? 'border-indigo-500 bg-indigo-50/60' : 'border-slate-200 hover:border-slate-300'}`}>
                                <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><Icon className="w-4 h-4 text-indigo-500" />{label}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
                            </button>
                        ))}
                    </div>
                )}
                {isActive && (
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Contacts who match</p>
                        <FilterBuilder value={form.filters} onChange={filters => setForm(f => ({ ...f, filters }))} />
                        {preview && (preview.error ? <ErrorNote message={preview.error} /> : (
                            <div className="px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-600">
                                <span className="font-semibold text-slate-800">{preview.count.toLocaleString()}</span> contact{preview.count !== 1 ? 's' : ''} match right now
                                {preview.sample?.length > 0 && <span className="text-slate-400">, e.g. {preview.sample.slice(0, 3).map(s => s.full_name || s.email).join(', ')}</span>}
                            </div>
                        ))}
                    </div>
                )}
                <ErrorNote message={error} />
            </div>
        </Modal>
    );
}

export default function Lists() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const canManage = hasPermission('manage_prospects');
    const [type, setType] = useState('');
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState(null); // null | 'new' | list
    const [error, setError] = useState(null);

    const { data, isLoading } = useQuery({ queryKey: ['lists', type], queryFn: () => listsApi.list(type ? { list_type: type } : {}) });
    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['lists'] });
        queryClient.invalidateQueries({ queryKey: ['contact-facets'] });
    };
    const remove = useMutation({ mutationFn: listsApi.remove, onSuccess: refresh, onError: err => setError(errorMessage(err)) });

    const term = search.trim().toLowerCase();
    const items = (data?.items || []).filter(l => !term || l.list_name.toLowerCase().includes(term));

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Lists</h1>
                    <p className="text-sm text-gray-400 mt-1">Static lists you curate, and active lists that follow a filter</p>
                </div>
                {canManage && (
                    <button onClick={() => setEditing('new')} style={{ background: BRAND_GRADIENT }}
                        className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm hover:shadow-md whitespace-nowrap">
                        <Plus className="w-4 h-4" /> New list
                    </button>
                )}
            </div>
            <ErrorNote message={error} />

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="px-5 py-4 flex items-center gap-3 flex-wrap" style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}>
                    <div className="flex bg-white rounded-xl border border-slate-200 p-0.5">
                        {[['', 'All'], ['STATIC', 'Static'], ['ACTIVE', 'Active']].map(([value, label]) => (
                            <button key={label} onClick={() => setType(value)}
                                className={`px-3 h-8 text-sm font-medium rounded-lg ${type === value ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</button>
                        ))}
                    </div>
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search lists…"
                            className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" />
                    </div>
                    <span className="ml-auto text-sm text-slate-500">{items.length} list{items.length !== 1 ? 's' : ''}</span>
                </div>

                {isLoading ? (
                    <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                ) : items.length === 0 ? (
                    <div className="py-20 text-center px-6">
                        <ListChecks className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="font-semibold text-slate-800">{term ? 'No lists match' : 'No lists yet'}</p>
                        <p className="text-sm text-slate-500 mt-1">Create one here, or select contacts and choose “Add to list”.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-left text-slate-400 uppercase tracking-wide">
                                    <th className="pl-5 pr-3 py-3">List</th>
                                    <th className="px-3 py-3">Type</th>
                                    <th className="px-3 py-3">Contacts</th>
                                    <th className="px-3 py-3">Created by</th>
                                    <th className="px-3 py-3">Created</th>
                                    <th className="px-3 pr-5 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {items.map(l => (
                                    <tr key={l.list_id} onClick={() => navigate(`/app/contacts?list_id=${l.list_id}`)} className="cursor-pointer hover:bg-slate-50/70">
                                        <td className="pl-5 pr-3 py-3">
                                            <p className="text-sm font-semibold text-slate-800">{l.list_name}</p>
                                            {l.description && <p className="text-xs text-slate-500 truncate max-w-md">{l.description}</p>}
                                        </td>
                                        <td className="px-3 py-3">
                                            {l.list_type === 'ACTIVE'
                                                ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700"><Zap className="w-3 h-3" />Active</span>
                                                : <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">Static</span>}
                                        </td>
                                        <td className="px-3 py-3 text-sm font-semibold text-slate-800"><Users className="w-3.5 h-3.5 inline mr-1 text-slate-400" />{l.member_count.toLocaleString()}</td>
                                        <td className="px-3 py-3 text-sm text-slate-600">{l.created_by_name || '—'}</td>
                                        <td className="px-3 py-3 text-sm text-slate-500 whitespace-nowrap">{relativeDate(l.created_at)}</td>
                                        <td className="px-3 pr-5 py-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                            {canManage && <>
                                                <button onClick={() => setEditing(l)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" aria-label={`Edit ${l.list_name}`}><Pencil className="w-4 h-4" /></button>
                                                <button onClick={() => window.confirm(`Delete the list "${l.list_name}"? Contacts are kept.`) && remove.mutate(l.list_id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" aria-label={`Delete ${l.list_name}`}><Trash2 className="w-4 h-4" /></button>
                                            </>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {canManage && <p className="text-xs text-slate-400">Uploaded prospect files also appear here. Manage uploads in <Link to="/app/prospects" className="text-indigo-600 hover:text-indigo-800">Prospect Lists</Link>.</p>}

            {editing && (
                <ListFormModal list={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
                    onSaved={saved => { setEditing(null); refresh(); if (editing === 'new') navigate(`/app/contacts?list_id=${saved.list_id}`); }} />
            )}
        </div>
    );
}
