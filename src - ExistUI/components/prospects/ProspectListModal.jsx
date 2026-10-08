// src/components/prospects/ProspectListModal.jsx
// Modal component for viewing and editing prospects within a list

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    X,
    Search,
    Edit2,
    Trash2,
    Save,
    Loader2,
    Users,
    Mail,
    Building2,
    MapPin,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    XCircle,
    ShieldCheck,
    ListPlus,
} from 'lucide-react';
import { prospectsApi } from '../../api/prospects';
import { listsApi, errorMessage } from '../../api/contacts';

// ── Add selected prospects to another static list, or a new one (DF-03) ──
function AddToListPanel({ ids, currentListId, onDone, onCancel }) {
    const queryClient = useQueryClient();
    const { data } = useQuery({ queryKey: ['lists', 'STATIC'], queryFn: () => listsApi.list({ list_type: 'STATIC' }) });
    const [target, setTarget] = useState('');
    const [newName, setNewName] = useState('');
    const [error, setError] = useState(null);
    const add = useMutation({
        mutationFn: async () => {
            const listId = target === '__new__' ? (await listsApi.create({ list_name: newName.trim(), list_type: 'STATIC' })).list_id : target;
            const res = await listsApi.addMembers(listId, ids);
            return { ...res, name: target === '__new__' ? newName.trim() : data?.items.find(l => l.list_id === target)?.list_name };
        },
        onSuccess: res => {
            ['lists', 'prospect-lists', 'prospect-stats', 'contact-facets'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
            onDone(`Added ${res.added} to “${res.name}”${res.already_in_list ? ` (${res.already_in_list} already there)` : ''}.`);
        },
        onError: err => setError(errorMessage(err)),
    });
    const options = (data?.items || []).filter(l => l.list_id !== currentListId);
    return (
        <div className="px-6 py-3 border-b border-slate-100 bg-blue-50/40 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-600">Add {ids.length} to</span>
            <select value={target} onChange={e => setTarget(e.target.value)}
                className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none">
                <option value="">Choose a list…</option>
                <option value="__new__">+ New list</option>
                {options.map(l => <option key={l.list_id} value={l.list_id}>{l.list_name}</option>)}
            </select>
            {target === '__new__' && (
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="List name" autoFocus
                    className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none" />
            )}
            <button onClick={() => add.mutate()} disabled={add.isPending || !target || (target === '__new__' && !newName.trim())}
                className="px-3 h-8 text-xs font-semibold text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                {add.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ListPlus className="w-3 h-3" />} Add
            </button>
            <button onClick={onCancel} className="px-3 h-8 text-xs font-semibold text-slate-500 hover:text-slate-700">Cancel</button>
            {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
    );
}

// ── Validation icon for first column ──────────────────────────────
function ValidationIcon({ prospectId, validationMap, prospect }) {
    const validation = validationMap[prospectId];
    if (validation) {
        if (validation.status === 'valid') return (
            <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full" title="Valid">
                <CheckCircle className="w-3.5 h-3.5" />
            </span>
        );
        if (validation.status === 'warning') return (
            <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-100 text-amber-600 rounded-full" title={validation.issues.join(', ')}>
                <AlertTriangle className="w-3.5 h-3.5" />
            </span>
        );
        return (
            <span className="inline-flex items-center justify-center w-5 h-5 bg-rose-100 text-rose-600 rounded-full" title={validation.issues.join(', ')}>
                <XCircle className="w-3.5 h-3.5" />
            </span>
        );
    }
    // Fallback: use consent_status
    if (prospect?.consent_status === 'OPT_IN') return (
        <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-100 rounded-full" title="Active">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
        </span>
    );
    return (
        <span className="inline-flex items-center justify-center w-5 h-5 bg-rose-100 rounded-full" title="Opted Out">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
        </span>
    );
}

// ── Bulk Edit Panel ───────────────────────────────────────────────
function BulkEditPanel({ count, onApply, onCancel, isPending }) {
    const [fields, setFields] = useState({
        designation: '',
        company_name: '',
        poc_city: '',
        poc_state: '',
        poc_country: '',
    });
    const [enabledFields, setEnabledFields] = useState({});

    const toggleField = (key) => {
        setEnabledFields(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleApply = () => {
        const updates = {};
        Object.entries(enabledFields).forEach(([key, enabled]) => {
            if (enabled) updates[key] = fields[key];
        });
        if (Object.keys(updates).length === 0) return;
        onApply(updates);
    };

    const FIELDS = [
        { key: 'designation', label: 'Designation', placeholder: 'e.g., VP of Sales' },
        { key: 'company_name', label: 'Company', placeholder: 'e.g., Acme Corp' },
        { key: 'poc_city', label: 'City', placeholder: 'e.g., San Francisco' },
        { key: 'poc_state', label: 'State', placeholder: 'e.g., CA' },
        { key: 'poc_country', label: 'Country', placeholder: 'e.g., US' },
    ];

    return (
        <div className="mx-6 mb-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-semibold text-blue-800">
                        Bulk edit {count} prospect{count !== 1 ? 's' : ''}
                    </p>
                </div>
                <button onClick={onCancel} className="text-blue-400 hover:text-blue-600 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <p className="text-xs text-blue-600 mb-3">Toggle fields you want to update, then click Apply.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FIELDS.map(({ key, label, placeholder }) => (
                    <div key={key} className={`rounded-lg border p-2 transition-all ${
                        enabledFields[key]
                            ? 'border-blue-400 bg-white'
                            : 'border-blue-100 bg-blue-50/50 opacity-60'
                    }`}>
                        <label className="flex items-center gap-2 cursor-pointer mb-1">
                            <input
                                type="checkbox"
                                checked={Boolean(enabledFields[key])}
                                onChange={() => toggleField(key)}
                                className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                            />
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">{label}</span>
                        </label>
                        <input
                            type="text"
                            value={fields[key]}
                            onChange={e => setFields(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder={placeholder}
                            disabled={!enabledFields[key]}
                            className="w-full px-2 py-1 text-sm border border-blue-200 rounded bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40 disabled:bg-blue-50"
                        />
                    </div>
                ))}
            </div>
            <div className="flex gap-2 mt-3">
                <button onClick={onCancel}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    Cancel
                </button>
                <button onClick={handleApply} disabled={isPending || Object.values(enabledFields).every(v => !v)}
                    className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Apply to {count}
                </button>
            </div>
        </div>
    );
}

export default function ProspectListModal({ list, onClose }) {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [revalidationResult, setRevalidationResult] = useState(null);
    const [validationMap, setValidationMap] = useState({});

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState([]);
    const [showBulkEdit, setShowBulkEdit] = useState(false);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [showAddToList, setShowAddToList] = useState(false);
    const [listNotice, setListNotice] = useState(null);

    // Fetch prospects for this list
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['list-prospects', list.list_id, page, search],
        queryFn: () => prospectsApi.getListProspects(list.list_id, { page, search }),
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ prospectId, updates }) => prospectsApi.updateProspect(prospectId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries(['list-prospects', list.list_id]);
            setEditingId(null);
            setEditValues({});
        },
    });

    // Note update mutation (per-list)
    const notesMutation = useMutation({
        mutationFn: ({ prospectId, notes }) => prospectsApi.updateProspectNote(list.list_id, prospectId, notes),
        onSuccess: () => {
            queryClient.invalidateQueries(['list-prospects', list.list_id]);
        },
    });

    // Revalidate mutation
    const revalidateMutation = useMutation({
        mutationFn: () => prospectsApi.revalidateList(list.list_id),
        onSuccess: (data) => {
            setRevalidationResult(data);
            const map = {};
            if (data.results) {
                data.results.forEach(r => {
                    map[r.prospect_id] = { status: r.status, issues: r.issues || [] };
                });
            }
            setValidationMap(map);
            refetch();
        },
    });

    // Delete prospect mutation
    const deleteMutation = useMutation({
        mutationFn: (prospectId) => prospectsApi.deleteProspect(prospectId),
        onSuccess: () => {
            queryClient.invalidateQueries(['list-prospects', list.list_id]);
            queryClient.invalidateQueries(['prospect-lists']);
            queryClient.invalidateQueries(['prospect-stats']);
            setDeleteConfirmId(null);
        },
    });

    // Bulk delete mutation
    const bulkDeleteMutation = useMutation({
        mutationFn: (ids) => prospectsApi.bulkDeleteProspects(ids),
        onSuccess: () => {
            queryClient.invalidateQueries(['list-prospects', list.list_id]);
            queryClient.invalidateQueries(['prospect-lists']);
            queryClient.invalidateQueries(['prospect-stats']);
            setSelectedIds([]);
            setShowBulkDeleteConfirm(false);
        },
    });

    // Bulk update mutation
    const bulkUpdateMutation = useMutation({
        mutationFn: ({ ids, updates }) => prospectsApi.bulkUpdateProspects(ids, updates),
        onSuccess: () => {
            queryClient.invalidateQueries(['list-prospects', list.list_id]);
            setSelectedIds([]);
            setShowBulkEdit(false);
        },
    });

    const startEdit = (prospect) => {
        setEditingId(prospect.prospect_id);
        setEditValues({
            first_name: prospect.first_name || '',
            last_name: prospect.last_name || '',
            designation: prospect.designation || '',
            company_name: prospect.company_name || '',
            email: prospect.email || '',
            poc_city: prospect.poc_city || '',
            poc_state: prospect.poc_state || '',
            poc_country: prospect.poc_country || '',
            notes: prospect.notes || '',
        });
    };

    const saveEdit = () => {
        const { notes, ...prospectFields } = editValues;
        updateMutation.mutate({ prospectId: editingId, updates: prospectFields });
        notesMutation.mutate({ prospectId: editingId, notes });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValues({});
    };

    const prospects = data?.prospects || [];
    const total = data?.total || 0;
    const pageSize = data?.page_size || 20;
    const totalPages = Math.ceil(total / pageSize);

    // Selection helpers
    const allSelected = prospects.length > 0 && prospects.every(p => selectedIds.includes(p.prospect_id));
    const someSelected = selectedIds.length > 0;

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(prev => prev.filter(id => !prospects.some(p => p.prospect_id === id)));
        } else {
            const currentPageIds = prospects.map(p => p.prospect_id);
            setSelectedIds(prev => [...new Set([...prev, ...currentPageIds])]);
        }
    };

    const toggleSelect = (prospectId) => {
        setSelectedIds(prev =>
            prev.includes(prospectId)
                ? prev.filter(id => id !== prospectId)
                : [...prev, prospectId]
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">{list.list_name}</h2>
                        <p className="text-sm text-slate-500">{total.toLocaleString()} prospects</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => revalidateMutation.mutate()}
                            disabled={revalidateMutation.isPending}
                            className="px-3 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                            title="Revalidate all prospects"
                        >
                            <ShieldCheck className={`w-4 h-4 ${revalidateMutation.isPending ? 'animate-pulse' : ''}`} />
                            {revalidateMutation.isPending ? 'Validating...' : 'Revalidate'}
                        </button>
                        <button
                            onClick={() => refetch()}
                            disabled={isLoading}
                            className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 border border-slate-200"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>
                </div>

                {/* Revalidation Results Banner */}
                {revalidationResult && (
                    <div className="px-6 py-3 border-b border-slate-100 bg-slate-50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 text-sm">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                    <span className="font-medium text-emerald-700">{revalidationResult.valid_count} Valid</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-sm">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    <span className="font-medium text-amber-700">{revalidationResult.warning_count} Warnings</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-sm">
                                    <XCircle className="w-4 h-4 text-rose-500" />
                                    <span className="font-medium text-rose-700">{revalidationResult.invalid_count} Invalid</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setRevalidationResult(null)}
                                className="text-xs text-slate-500 hover:text-slate-700"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )}

                {/* Search + Bulk Action Bar */}
                <div className="px-6 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="relative max-w-sm flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search prospects..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all placeholder:text-slate-400"
                                style={{ '--tw-ring-color': 'rgba(45,107,191,0.2)' }}
                            />
                        </div>

                        {/* Bulk action buttons */}
                        {someSelected && (
                            <div className="flex items-center gap-2 px-3 h-9 rounded-xl border shrink-0"
                                style={{ background: 'rgba(45,107,191,0.06)', borderColor: 'rgba(45,107,191,0.2)' }}>
                                <span className="text-xs font-semibold" style={{ color: '#2d6bbf' }}>
                                    {selectedIds.length} selected
                                </span>
                                <div className="w-px h-4 bg-slate-200" />
                                <button onClick={() => setShowBulkEdit(true)}
                                    className="flex items-center gap-1 text-xs font-semibold transition-colors hover:text-blue-700"
                                    style={{ color: '#2d6bbf' }}>
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Edit
                                </button>
                                <div className="w-px h-4 bg-slate-200" />
                                <button onClick={() => { setShowAddToList(true); setListNotice(null); }}
                                    className="flex items-center gap-1 text-xs font-semibold transition-colors hover:text-blue-700"
                                    style={{ color: '#2d6bbf' }}>
                                    <ListPlus className="w-3.5 h-3.5" />
                                    Add to list
                                </button>
                                <div className="w-px h-4 bg-slate-200" />
                                <button onClick={() => setShowBulkDeleteConfirm(true)}
                                    className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete
                                </button>
                                <div className="w-px h-4 bg-slate-200" />
                                <button onClick={() => setSelectedIds([])}
                                    className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {showAddToList && someSelected && (
                    <AddToListPanel ids={selectedIds} currentListId={list.list_id}
                        onDone={msg => { setShowAddToList(false); setListNotice(msg); }}
                        onCancel={() => setShowAddToList(false)} />
                )}
                {listNotice && (
                    <div className="px-6 py-2 border-b border-emerald-100 bg-emerald-50 text-xs text-emerald-800 flex items-center justify-between">
                        {listNotice}<button onClick={() => setListNotice(null)} aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
                    </div>
                )}

                {/* Bulk Edit Panel */}
                {showBulkEdit && (
                    <BulkEditPanel
                        count={selectedIds.length}
                        onApply={(updates) => bulkUpdateMutation.mutate({ ids: selectedIds, updates })}
                        onCancel={() => setShowBulkEdit(false)}
                        isPending={bulkUpdateMutation.isPending}
                    />
                )}

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                        </div>
                    ) : prospects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Users className="w-12 h-12 text-slate-300 mb-3" />
                            <p className="text-slate-500">No prospects found</p>
                        </div>
                    ) : (
                        <table className="w-full text-left min-w-[1400px]">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200">
                                    {/* Checkbox column */}
                                    <th className="py-3 pl-3 pr-1 w-9">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={toggleSelectAll}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                        />
                                    </th>
                                    {/* Valid icon column */}
                                    <th className="py-3 px-2 w-8" title="Status" />
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">First Name</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Last Name</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Designation</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Company</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Email</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Location</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Note</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase text-center sticky right-0 bg-slate-50/80 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {prospects.map((prospect) => (
                                    <tr
                                        key={prospect.prospect_id}
                                        className={`hover:bg-slate-50/50 transition-colors ${
                                            editingId === prospect.prospect_id ? 'bg-blue-50/50' :
                                            selectedIds.includes(prospect.prospect_id) ? 'bg-blue-50/30' : ''
                                        }`}
                                    >
                                        {editingId === prospect.prospect_id ? (
                                            // Edit mode
                                            <>
                                                {/* Checkbox */}
                                                <td className="py-2 pl-3 pr-1">
                                                    <input type="checkbox" checked disabled className="rounded border-slate-300 w-4 h-4 opacity-50" />
                                                </td>
                                                {/* Valid icon */}
                                                <td className="py-2 px-2">
                                                    <ValidationIcon prospectId={prospect.prospect_id} validationMap={validationMap} prospect={prospect} />
                                                </td>
                                                <td className="py-2 px-4">
                                                    <input
                                                        value={editValues.first_name}
                                                        onChange={(e) => setEditValues(v => ({ ...v, first_name: e.target.value }))}
                                                        className="w-full px-2 py-1.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        placeholder="First"
                                                    />
                                                </td>
                                                <td className="py-2 px-4">
                                                    <input
                                                        value={editValues.last_name}
                                                        onChange={(e) => setEditValues(v => ({ ...v, last_name: e.target.value }))}
                                                        className="w-full px-2 py-1.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        placeholder="Last"
                                                    />
                                                </td>
                                                <td className="py-2 px-4">
                                                    <input
                                                        value={editValues.designation}
                                                        onChange={(e) => setEditValues(v => ({ ...v, designation: e.target.value }))}
                                                        className="w-full px-2 py-1.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        placeholder="Designation"
                                                    />
                                                </td>
                                                <td className="py-2 px-4">
                                                    <input
                                                        value={editValues.company_name}
                                                        onChange={(e) => setEditValues(v => ({ ...v, company_name: e.target.value }))}
                                                        className="w-full px-2 py-1.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="py-2 px-4">
                                                    <input
                                                        value={editValues.email}
                                                        onChange={(e) => setEditValues(v => ({ ...v, email: e.target.value }))}
                                                        className="w-full px-2 py-1.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="py-2 px-4">
                                                    <div className="flex gap-1">
                                                        <input
                                                            value={editValues.poc_city}
                                                            onChange={(e) => setEditValues(v => ({ ...v, poc_city: e.target.value }))}
                                                            className="w-20 px-2 py-1.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            placeholder="City"
                                                        />
                                                        <input
                                                            value={editValues.poc_state}
                                                            onChange={(e) => setEditValues(v => ({ ...v, poc_state: e.target.value }))}
                                                            className="w-14 px-2 py-1.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            placeholder="State"
                                                        />
                                                        <input
                                                            value={editValues.poc_country}
                                                            onChange={(e) => setEditValues(v => ({ ...v, poc_country: e.target.value }))}
                                                            className="w-20 px-2 py-1.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            placeholder="Country"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="py-2 px-4">
                                                    <input
                                                        type="text"
                                                        value={editValues.notes}
                                                        onChange={(e) => setEditValues(v => ({ ...v, notes: e.target.value }))}
                                                        className="w-full min-w-[220px] px-2.5 py-1.5 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:italic placeholder:text-slate-400 transition-all"
                                                        placeholder="Add a note..."
                                                    />
                                                </td>
                                                <td className="py-2 px-4 text-center sticky right-0 bg-white shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                                                    <div className="flex gap-1 justify-center">
                                                        <button
                                                            onClick={saveEdit}
                                                            disabled={updateMutation.isLoading}
                                                            className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                                            title="Save"
                                                        >
                                                            {updateMutation.isLoading ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Save className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={cancelEdit}
                                                            className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                                            title="Cancel"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            // View mode
                                            <>
                                                {/* Checkbox */}
                                                <td className="py-3 pl-3 pr-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(prospect.prospect_id)}
                                                        onChange={() => toggleSelect(prospect.prospect_id)}
                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                                    />
                                                </td>
                                                {/* Valid icon */}
                                                <td className="py-3 px-2">
                                                    <ValidationIcon prospectId={prospect.prospect_id} validationMap={validationMap} prospect={prospect} />
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Link to={`/app/contacts/${prospect.prospect_id}`} title="Open contact"
                                                        className="text-sm font-normal text-indigo-600 hover:text-indigo-800 hover:underline">
                                                        {prospect.first_name || '-'}
                                                    </Link>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <p className="text-sm font-normal text-slate-600">
                                                        {prospect.last_name || '-'}
                                                    </p>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="text-sm text-slate-600">{prospect.designation || '-'}</span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="w-4 h-4 text-slate-400" />
                                                        <span className="text-sm text-slate-600">{prospect.company_name || '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="w-4 h-4 text-slate-400" />
                                                        <span className="text-sm text-slate-600">{prospect.email}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-slate-400" />
                                                        <span className="text-sm text-slate-600">
                                                            {[prospect.poc_city, prospect.poc_state, prospect.poc_country].filter(Boolean).join(', ') || '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="text-sm text-slate-500 italic">
                                                        {prospect.notes || '—'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center sticky right-0 bg-white shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                                                    <div className="flex gap-1 justify-center">
                                                        <button
                                                            onClick={() => startEdit(prospect)}
                                                            className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirmId(prospect.prospect_id)}
                                                            className="p-1.5 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {total > pageSize && (
                    <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between text-sm">
                        <span className="text-slate-500">
                            Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} of {total}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-3 py-2 text-slate-600">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={page >= totalPages}
                                className="p-2 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Delete Single Prospect Confirmation */}
            {deleteConfirmId && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
                    onClick={() => setDeleteConfirmId(null)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-rose-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-800">Delete Prospect</h3>
                                <p className="text-sm text-slate-500">This action cannot be undone</p>
                            </div>
                        </div>

                        <p className="text-sm text-slate-600 mb-4">
                            Are you sure you want to delete this prospect? All related data including emails and campaign enrollments will be removed.
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                                disabled={deleteMutation.isPending}
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50"
                            >
                                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Bulk Delete Confirmation */}
            {showBulkDeleteConfirm && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
                    onClick={() => setShowBulkDeleteConfirm(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-rose-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-800">Delete {selectedIds.length} Prospects</h3>
                                <p className="text-sm text-slate-500">This action cannot be undone</p>
                            </div>
                        </div>

                        <p className="text-sm text-slate-600 mb-4">
                            Are you sure you want to delete {selectedIds.length} selected prospect{selectedIds.length !== 1 ? 's' : ''}? All related data will be permanently removed.
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowBulkDeleteConfirm(false)}
                                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => bulkDeleteMutation.mutate(selectedIds)}
                                disabled={bulkDeleteMutation.isPending}
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                {bulkDeleteMutation.isPending
                                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...</>
                                    : <><Trash2 className="w-3.5 h-3.5" /> Delete All</>
                                }
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </motion.div>
    );
}
