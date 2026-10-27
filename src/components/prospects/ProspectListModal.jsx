// src/components/prospects/ProspectListModal.jsx
// Modal component for viewing and editing prospects within a list.
// State and actions: listModal/useProspectListModal; table, toolbar and confirmations: listModal/.

import { motion } from 'framer-motion';
import { RefreshCw, ShieldCheck, X } from 'lucide-react';
import { useDialog } from '../common/useDialog';
import { useProspectListModal } from './listModal/useProspectListModal';
import AddToListPanel from './listModal/AddToListPanel';
import BulkEditPanel from './listModal/BulkEditPanel';
import RevalidationBanner from './listModal/RevalidationBanner';
import ListToolbar from './listModal/ListToolbar';
import ProspectListTable from './listModal/ProspectListTable';
import ListPagination from './listModal/ListPagination';
import DeleteProspectConfirm from './listModal/DeleteProspectConfirm';
import BulkDeleteConfirm from './listModal/BulkDeleteConfirm';

export default function ProspectListModal({ list, onClose }) {
    const modal = useProspectListModal(list);
    const {
        revalidateMutation, refetch, isLoading, total, revalidationResult, showAddToList, someSelected, selectedIds,
        setShowAddToList, setListNotice, listNotice, showBulkEdit, setShowBulkEdit, bulkUpdateMutation, pageSize,
        deleteConfirmId, showBulkDeleteConfirm,
    } = modal;
    const { titleId, dialogProps } = useDialog({ onClose });

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                {...dialogProps}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col outline-none"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h2 id={titleId} className="text-lg font-bold text-slate-800">{list.list_name}</h2>
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
                            aria-label="Close"
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>
                </div>

                {/* Revalidation Results Banner */}
                {revalidationResult && (
                    <RevalidationBanner modal={modal} />
                )}

                {/* Search + Bulk Action Bar */}
                <ListToolbar modal={modal} />

                {showAddToList && someSelected && (
                    <AddToListPanel ids={selectedIds} currentListId={list.list_id}
                        onDone={msg => { setShowAddToList(false); setListNotice(msg); }}
                        onCancel={() => setShowAddToList(false)} />
                )}
                {listNotice && (
                    <div role={listNotice.tone === 'error' ? 'alert' : 'status'} className={`px-6 py-2 border-b text-xs flex items-center justify-between ${listNotice.tone === 'error' ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-800'}`}>
                        {typeof listNotice === 'string' ? listNotice : listNotice.text}<button onClick={() => setListNotice(null)} aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
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
                <ProspectListTable modal={modal} />

                {/* Pagination */}
                {total > pageSize && (
                    <ListPagination modal={modal} />
                )}
            </motion.div>

            {/* Delete Single Prospect Confirmation */}
            {deleteConfirmId && (
                <DeleteProspectConfirm modal={modal} />
            )}

            {/* Bulk Delete Confirmation */}
            {showBulkDeleteConfirm && (
                <BulkDeleteConfirm modal={modal} />
            )}
        </motion.div>
    );
}
