import { motion } from 'framer-motion';
import DialogPanel from '../../common/DialogPanel';
import { Loader2, Trash2 } from 'lucide-react';

// Confirmation before deleting the selected prospects.
export default function BulkDeleteConfirm({ modal }) {
    const {
        bulkDeleteMutation, selectedIds, setShowBulkDeleteConfirm
    } = modal;
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
            onClick={() => setShowBulkDeleteConfirm(false)}
        >
            <DialogPanel
                as={motion.div}
                onClose={() => setShowBulkDeleteConfirm(false)}
                labelledBy="prospect-bulk-delete-confirm-title"
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
                        <h3 id="prospect-bulk-delete-confirm-title" className="font-semibold text-slate-800">Delete {selectedIds.length} Prospects</h3>
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
            </DialogPanel>
        </motion.div>
    );
}
