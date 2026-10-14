import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '../../ui/Button';
import DialogPanel from '../../common/DialogPanel';
import { Loader2, Trash2 } from 'lucide-react';

// Step 3: confirmation before deleting a prospect from every list and campaign.
export default function DeleteProspectDialog({ wizard }) {
    const {
        deleteConfirmProspectId, deleteProspectMutation, setDeleteConfirmProspectId
    } = wizard;
    return (
        <AnimatePresence>
            {deleteConfirmProspectId && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={() => setDeleteConfirmProspectId(null)}
                >
                    <DialogPanel
                        as={motion.div}
                        onClose={() => setDeleteConfirmProspectId(null)}
                        labelledBy="campaign-delete-prospect-title"
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.95 }}
                        className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <h3 id="campaign-delete-prospect-title" className="text-lg font-bold text-slate-900">Delete Prospect?</h3>
                        </div>
                        <p className="text-sm text-slate-600 mb-6">
                            This will permanently remove this prospect from all lists and campaigns. This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setDeleteConfirmProspectId(null)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => deleteProspectMutation.mutate(deleteConfirmProspectId)}
                                disabled={deleteProspectMutation.isPending}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                            >
                                {deleteProspectMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : null}
                                Delete
                            </Button>
                        </div>
                    </DialogPanel>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
