// src/components/campaigns/RevalidateModal.jsx
/**
 * Idea 2 — Bounce Re-validation Modal (Admin / Owner only)
 * Allows updating a bounced prospect's email and clearing the hard-bounce suppression.
 * Voluntary unsubscribes are blocked at the API layer AND shown clearly in the UI.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ShieldAlert, Mail, CheckCircle, AlertCircle, Loader2, AlertTriangle
} from 'lucide-react';
import { campaignApi } from '../../api/campaigns';

export default function RevalidateModal({ prospect, onClose, onSuccess }) {
    const [newEmail, setNewEmail] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!newEmail.trim() || !reason.trim()) return;

        setLoading(true);
        setError('');
        try {
            const result = await campaignApi.revalidateProspect(prospect.prospect_id, {
                newEmail: newEmail.trim(),
                reason: reason.trim(),
            });
            setDone(result);
        } catch (e) {
            const status = e.response?.status;
            const detail = e.response?.data?.detail || 'Request failed.';
            if (status === 403) {
                setError('🔒 ' + detail); // Highlight voluntary unsubscribe protection
            } else {
                setError(detail);
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            >
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between"
                    style={{ background: 'linear-gradient(90deg, #b45309, #f59e0b)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                            <ShieldAlert className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="text-white font-semibold text-sm">Re-validate Bounced Contact</p>
                            <p className="text-white/70 text-xs">Admin action — audit logged</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {!done ? (
                            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                {/* Current state */}
                                <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 mb-5">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-semibold text-rose-700">Bounced Contact</p>
                                            <p className="text-xs text-rose-600 mt-0.5 font-medium">{prospect.full_name}</p>
                                            <p className="text-[11px] text-rose-500 mt-0.5">{prospect.email}</p>
                                            {prospect.bounce_reason && (
                                                <p className="text-[10px] text-rose-400 mt-1 italic">"{prospect.bounce_reason}"</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Warning notice */}
                                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-5">
                                    <p className="text-xs text-amber-700 font-medium">Important</p>
                                    <p className="text-[11px] text-amber-600 mt-1 leading-relaxed">
                                        This clears the <strong>hard-bounce</strong> block only. Voluntary unsubscribes
                                        are permanently protected and cannot be overridden.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">
                                            New Email Address
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                            <input
                                                type="email"
                                                required
                                                value={newEmail}
                                                onChange={e => setNewEmail(e.target.value)}
                                                placeholder="new@company.com"
                                                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">
                                            Reason for Change (Audit Trail)
                                        </label>
                                        <textarea
                                            required
                                            minLength={5}
                                            rows={2}
                                            value={reason}
                                            onChange={e => setReason(e.target.value)}
                                            placeholder="e.g. Changed jobs — new email verified on LinkedIn"
                                            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 resize-none"
                                        />
                                    </div>

                                    {error && (
                                        <div className="flex items-start gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5">
                                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-2 pt-1">
                                        <button type="button" onClick={onClose}
                                            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading || !newEmail.trim() || !reason.trim()}
                                            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50"
                                            style={{ background: 'linear-gradient(90deg, #b45309, #f59e0b)' }}
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                                            Re-validate & Save
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div key="success"
                                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center py-8 gap-4 text-center">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                                    <CheckCircle className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <p className="text-base font-bold text-slate-800">Contact Re-validated</p>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Email updated to <span className="font-semibold text-emerald-600">{done.new_email}</span>
                                    </p>
                                    {done.campaigns_reset > 0 && (
                                        <p className="text-xs text-slate-400 mt-1">
                                            {done.campaigns_reset} campaign enrollment{done.campaigns_reset !== 1 ? 's' : ''} set to re-enroll eligible.
                                        </p>
                                    )}
                                    {!done.suppression_cleared && (
                                        <p className="text-xs text-amber-500 mt-2">Note: No suppression record found — nothing to clear.</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => { onSuccess?.(done); onClose(); }}
                                    className="px-6 py-2.5 text-sm font-semibold text-white rounded-xl"
                                    style={{ background: 'linear-gradient(90deg, #059669, #10b981)' }}
                                >
                                    Done
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
