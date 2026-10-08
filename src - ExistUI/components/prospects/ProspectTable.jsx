// src/components/prospects/ProspectTable.jsx
// Reusable prospect table with inline editing, filtering, and professional styling

import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Edit2, Trash2, User, Building, MapPin, AlertCircle, X } from 'lucide-react';

// Separate component to prevent cursor jumping on keystroke
function EditInput({ initialValue, onChange, onKeyDown, placeholder }) {
    const [localValue, setLocalValue] = useState(initialValue);
    const inputRef = useRef(null);

    // Focus input on mount
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const handleChange = (e) => {
        setLocalValue(e.target.value);
        onChange(e.target.value);
    };

    return (
        <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            placeholder={placeholder}
        />
    );
}



export default function ProspectTable({
    records = [],
    editable = false,
    onRecordChange,
    onDelete,
    maxHeight = '450px',
    showFilters = true,
    showSearch = true,
}) {
    const [filter, setFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCell, setEditingCell] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [editPosition, setEditPosition] = useState({ top: 0, left: 0 });
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [editedRows, setEditedRows] = useState(new Set());
    const tableRef = useRef(null);

    // Filter and search records
    const filteredRecords = useMemo(() => {
        let result = records;
        if (filter !== 'ALL') {
            result = result.filter(r => r.status === filter);
        }
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(r =>
                r.email?.toLowerCase().includes(term) ||
                r.first_name?.toLowerCase().includes(term) ||
                r.last_name?.toLowerCase().includes(term) ||
                r.company_name?.toLowerCase().includes(term)
            );
        }
        return result;
    }, [records, filter, searchTerm]);

    const counts = useMemo(() => ({
        all: records.length,
        accepted: records.filter(r => r.status === 'ACCEPTED').length,
        rejected: records.filter(r => r.status === 'REJECTED').length,
    }), [records]);

    // Edit handlers
    const handleStartEdit = (rowIndex, field, value, event) => {
        if (!editable) return;
        setEditingCell({ rowIndex, field });
        setEditValue(value || '');

        // Position popup near the clicked cell
        if (event && tableRef.current) {
            const rect = event.currentTarget.getBoundingClientRect();
            const tableRect = tableRef.current.getBoundingClientRect();
            setEditPosition({
                top: rect.bottom - tableRect.top + 8,
                left: Math.min(rect.left - tableRect.left, tableRect.width - 260),
            });
        }
    };

    const handleSaveEdit = () => {
        if (!editingCell || !onRecordChange) return;
        const { rowIndex, field } = editingCell;
        const record = filteredRecords[rowIndex];
        const originalIndex = records.findIndex(r => r.row === record.row);
        const updatedRecord = { ...record, [field]: editValue };

        // Track edited rows
        setEditedRows(prev => new Set([...prev, record.row]));

        onRecordChange(originalIndex, updatedRecord);
        setEditingCell(null);
        setEditValue('');
    };

    const handleCancelEdit = () => {
        setEditingCell(null);
        setEditValue('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSaveEdit();
        if (e.key === 'Escape') handleCancelEdit();
    };

    // Handle delete with confirmation
    const handleDeleteClick = (rowIndex) => {
        setDeleteConfirm(rowIndex);
    };

    const handleConfirmDelete = () => {
        if (deleteConfirm !== null && onDelete) {
            const record = filteredRecords[deleteConfirm];
            const originalIndex = records.findIndex(r => r.row === record.row);
            onDelete(originalIndex);
            setDeleteConfirm(null);
        }
    };

    const handleCancelDelete = () => {
        setDeleteConfirm(null);
    };

    // Editable cell component - now ONLY renders the clickable cell, NOT the modal
    const EditableCell = ({ value, field, rowIndex }) => {
        if (!editable) {
            return <span className="text-slate-700">{value || '—'}</span>;
        }

        // Flexbox layout: text + icon side by side, no overlap
        return (
            <span
                className="inline-flex items-center gap-1.5 cursor-pointer group/edit hover:text-blue-600 transition-colors"
                onClick={(e) => handleStartEdit(rowIndex, field, value, e)}
            >
                <span>{value || '—'}</span>
                <Edit2 className="w-3 h-3 text-blue-500 opacity-0 group-hover/edit:opacity-100 transition-opacity flex-shrink-0" />
            </span>
        );
    };

    return (
        <div ref={tableRef} className="bg-white rounded-xl border border-slate-200 overflow-hidden relative">
            {/* EDIT MODAL - Rendered at top level to prevent remounting */}
            {editingCell && (
                <div className="fixed inset-0 z-40 bg-black/20" onClick={handleCancelEdit}>
                    <div
                        className="absolute z-50 bg-white p-4 shadow-2xl rounded-xl border border-slate-200"
                        style={{
                            minWidth: '280px',
                            top: Math.max(100, editPosition.top),
                            left: Math.max(20, editPosition.left),
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                            Edit {editingCell.field.replace(/_/g, ' ')}
                        </p>
                        <EditInput
                            key={`${editingCell.rowIndex}-${editingCell.field}`}
                            initialValue={editValue}
                            onChange={(val) => setEditValue(val)}
                            onKeyDown={handleKeyDown}
                            placeholder={`Enter ${editingCell.field.replace(/_/g, ' ')}`}
                        />
                        <div className="flex gap-2 mt-3">
                            <button onClick={handleSaveEdit} className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                                Save
                            </button>
                            <button onClick={handleCancelEdit} className="flex-1 px-3 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors">
                                Cancel
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 text-center">Press Enter to save, Esc to cancel</p>
                    </div>
                </div>
            )}

            {/* Header with filters and search */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
                {showFilters && (
                    <div className="flex gap-2">
                        {[
                            { key: 'ALL', label: 'All', count: counts.all, color: 'slate' },
                            { key: 'ACCEPTED', label: 'Accepted', count: counts.accepted, color: 'emerald' },
                            { key: 'REJECTED', label: 'Rejected', count: counts.rejected, color: 'red' },
                            // Add Unsubscribed filter? For now just show in table.
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`px - 4 py - 2 rounded - lg text - sm font - medium transition - all ${filter === f.key
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600'
                                    } `}
                            >
                                {f.label}
                                <span className={`ml - 2 px - 1.5 py - 0.5 rounded text - xs ${filter === f.key ? 'bg-blue-500' : 'bg-slate-100'} `}>
                                    {f.count}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {showSearch && (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, company..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-10 py-2 w-64 text-sm bg-white border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto" style={{ maxHeight }}>
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-12">#</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[280px]">Contact</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[200px]">Company</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[120px]">Location</th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Status</th>
                            {onDelete && <th className="px-6 py-4 w-16"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredRecords.map((record, idx) => {
                            const rejected = record.status === 'REJECTED';
                            const isEdited = editedRows.has(record.row);
                            const fullName = [record.first_name, record.last_name].filter(Boolean).join(' ');

                            return (
                                <tr
                                    key={record.row || idx}
                                    className={`group hover:bg-slate-50 transition-colors ${rejected ? 'bg-red-50/30' : ''} ${isEdited ? 'bg-amber-50/50 border-l-2 border-l-amber-400' : ''}`}
                                >
                                    {/* Row # with status indicator */}
                                    <td className="px-6 py-4 relative">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${rejected ? 'bg-red-400' : 'bg-blue-400'}`} />
                                        <span className="text-sm text-slate-400 font-mono">{record.row}</span>
                                    </td>

                                    {/* Contact: Name + Email */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-start gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${rejected ? 'bg-red-100' : 'bg-blue-50 border border-blue-100'}`}>
                                                <User className={`w-4 h-4 ${rejected ? 'text-red-400' : 'text-blue-500'}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1 text-sm font-normal text-slate-600">
                                                    <EditableCell value={record.first_name || ''} field="first_name" rowIndex={idx} />
                                                    <EditableCell value={record.last_name || ''} field="last_name" rowIndex={idx} />
                                                </div>
                                                <div className="text-sm text-slate-500 truncate max-w-[220px]" title={record.email}>
                                                    <EditableCell value={record.email} field="email" rowIndex={idx} />
                                                </div>
                                                {record.email_type && (
                                                    <span className={`inline - block mt - 1 px - 2 py - 0.5 rounded text - xs font - medium ${record.email_type === 'BUSINESS' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'} `}>
                                                        {record.email_type === 'BUSINESS' ? 'Business' : 'Personal'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Company + Title + Industry */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                <Building className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-normal text-slate-600">
                                                    <EditableCell value={record.company_name} field="company_name" rowIndex={idx} />
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    <EditableCell value={record.designation} field="designation" rowIndex={idx} />
                                                </div>
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    <EditableCell value={record.industry} field="industry" rowIndex={idx} />
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Location: City + State (separate editable fields) */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-start gap-2">
                                            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                                            <div className="text-sm text-slate-700">
                                                <div><EditableCell value={record.poc_city} field="poc_city" rowIndex={idx} /></div>
                                                <div className="text-xs text-slate-500"><EditableCell value={record.poc_state} field="poc_state" rowIndex={idx} /></div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-6 py-4 text-center">
                                        {rejected ? (
                                            <div className="inline-flex flex-col items-center gap-1">
                                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                                                    Rejected
                                                </span>
                                                {record.reason && (
                                                    <span
                                                        className="text-xs text-red-500 max-w-[180px] text-left cursor-help"
                                                        title={record.reason}
                                                    >
                                                        {record.reason}
                                                    </span>
                                                )}
                                            </div>
                                        ) : record.consent_status === 'UNSUBSCRIBED' ? (
                                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                                Unsubscribed
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                                Accepted
                                            </span>
                                        )}
                                    </td>

                                    {/* Delete action */}
                                    {onDelete && (
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleDeleteClick(idx)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
                <span>
                    Showing <strong className="text-slate-700">{filteredRecords.length}</strong> of <strong className="text-slate-700">{records.length}</strong> prospects
                </span>
                {editable && (
                    <span className="text-blue-600 text-xs">
                        <Edit2 className="w-3 h-3 inline mr-1" />
                        Click any field to edit
                    </span>
                )}
            </div>

            {/* Empty state */}
            {filteredRecords.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-slate-800 font-medium">No prospects found</h3>
                    <p className="text-slate-500 text-sm mt-1">
                        {searchTerm ? 'Try adjusting your search or filters' : 'Upload a file to add prospects'}
                    </p>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={handleCancelDelete}>
                    <div
                        className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-800">Delete Prospect</h3>
                                <p className="text-sm text-slate-500">This action cannot be undone</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-3 mb-4">
                            <p className="text-sm font-medium text-slate-700">
                                {filteredRecords[deleteConfirm]?.first_name} {filteredRecords[deleteConfirm]?.last_name}
                            </p>
                            <p className="text-xs text-slate-500">{filteredRecords[deleteConfirm]?.email}</p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleCancelDelete}
                                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
