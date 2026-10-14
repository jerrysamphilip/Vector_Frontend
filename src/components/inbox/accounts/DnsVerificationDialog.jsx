import { AnimatePresence, motion } from 'framer-motion';
import DialogPanel from '../../common/DialogPanel';
import { ShieldCheck, X } from 'lucide-react';

// DNS records to publish after adding a mailbox on an unverified domain.
export default function DnsVerificationDialog({ accounts }) {
    const {
        setVerificationData, verificationData
    } = accounts;
    return (
        <AnimatePresence>
            {verificationData && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <DialogPanel as={motion.div} onClose={() => setVerificationData(null)} labelledBy="verify-domain-title"
                        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-start justify-between p-5 text-white"
                             style={{ background: 'linear-gradient(135deg,#0046FF,#73C8D2)' }}>
                            <div>
                                <h2 id="verify-domain-title" className="flex items-center gap-2 text-lg font-bold">
                                    <ShieldCheck size={18}/> Verify Domain Ownership
                                </h2>
                                <p className="mt-1 text-sm text-white/80">
                                    Add these DNS records to activate sending for <strong>{verificationData.domain}</strong>.
                                </p>
                            </div>
                            <button onClick={() => setVerificationData(null)} aria-label="Close" className="text-white/70 hover:text-white transition">
                                <X size={20}/>
                            </button>
                        </div>
                        <div className="max-h-[55vh] space-y-3 overflow-y-auto p-5">
                            {verificationData.dns_records.map((record, idx) => (
                                <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{record.type} Record</span>
                                        <span className="rounded-full bg-[#eff3ff] px-2.5 py-0.5 text-xs font-semibold text-[#0046FF]">Required</span>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Host</p>
                                            <code className="block rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 overflow-x-auto">{record.host}</code>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Value</p>
                                            <code className="block rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 overflow-x-auto">{record.value}</code>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-4">
                            <p className="text-xs text-gray-400">You can reopen these from Domain Health later.</p>
                            <button onClick={() => setVerificationData(null)}
                                className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                                style={{ background: 'linear-gradient(135deg,#0046FF,#73C8D2)' }}>
                                Done
                            </button>
                        </div>
                    </DialogPanel>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
