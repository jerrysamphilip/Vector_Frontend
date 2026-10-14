import { Edit2, ListPlus, Search, Trash2, X } from 'lucide-react';

// Search box and, with a selection, the bulk actions (edit, add to list, delete).
export default function ListToolbar({ modal }) {
    const {
        search, selectedIds, setListNotice, setPage, setSearch, setSelectedIds, setShowAddToList,
        setShowBulkDeleteConfirm, setShowBulkEdit, someSelected
    } = modal;
    return (
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
    );
}
