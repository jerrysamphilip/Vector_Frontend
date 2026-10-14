import { motion } from 'framer-motion';
import DialogPanel from '../../common/DialogPanel';
import { Trash2 } from 'lucide-react';

// Confirmation before deleting one prospect.
export default function DeleteProspectConfirm({ modal }) {
    const {
        deleteConfirmId, deleteMutation, setDeleteConfirmId
    } = modal;
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
            onClick={() => setDeleteConfirmId(null)}
        >
            <DialogPanel
                as={motion.div}
                onClose={() => setDeleteConfirmId(null)}
                labelledBy="prospect-delete-confirm-title"
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
                        <h3 id="prospect-delete-confirm-title" className="font-semibold text-slate-800">Delete Prospect</h3>
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
            </DialogPanel>
        </motion.div>
    );
}
