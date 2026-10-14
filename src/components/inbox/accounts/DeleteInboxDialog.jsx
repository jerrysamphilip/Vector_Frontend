import { AnimatePresence, motion } from 'framer-motion';
import DialogPanel from '../../common/DialogPanel';
import { AlertTriangle, Loader2 } from 'lucide-react';

// Confirmation before deleting a mailbox.
export default function DeleteInboxDialog({ accounts }) {
    const {
        deleteMutation, inboxToDelete, setInboxToDelete
    } = accounts;
    return (
        <AnimatePresence>
            {inboxToDelete && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <DialogPanel as={motion.div} onClose={() => setInboxToDelete(null)} labelledBy="delete-mailbox-title"
                        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                            <AlertTriangle size={22} className="text-red-600"/>
                        </div>
                        <h3 id="delete-mailbox-title" className="text-base font-bold text-gray-900">Delete Mailbox?</h3>
                        <p className="mt-2 text-sm text-gray-500">
                            Remove <strong>{inboxToDelete.email_address}</strong>? This also removes it from the warmup pool.
                        </p>
                        <div className="mt-5 flex justify-center gap-3">
                            <button onClick={() => setInboxToDelete(null)}
                                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteMutation.mutate(inboxToDelete.inbox_id)}
                                disabled={deleteMutation.isPending}
                                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-60">
                                {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin"/> : 'Delete'}
                            </button>
                        </div>
                    </DialogPanel>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
