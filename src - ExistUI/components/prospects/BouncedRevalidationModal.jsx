import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    ShieldCheck,
    Loader2,
    AlertTriangle,
    Mail,
    Building2,
    RefreshCw,
    UserCheck,
} from 'lucide-react';
import { campaignApi } from '../../api/campaigns';
import RevalidateModal from '../campaigns/RevalidateModal';

function formatDate(value) {
    if (!value) return '-';
    try {
        return new Date(value).toLocaleString();
    } catch {
        return '-';
    }
}

export default function BouncedRevalidationModal({ onClose }) {
    const [selectedProspect, setSelectedProspect] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const {
        data: candidates = [],
        isLoading,
        isFetching,
        error,
        refetch,
    } = useQuery({
        queryKey: ['bounced-revalidation-candidates'],
        queryFn: async () => {
            const data = await campaignApi.listBouncedCandidates();
            return data?.candidates || [];
        },
    });

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 10 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden"
                >
                    <div
                        className="px-6 py-4 flex items-center justify-between"
                        style={{ background: 'linear-gradient(90deg, #b45309, #f59e0b)' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                                <ShieldCheck className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="text-white font-semibold text-sm">Bounced Prospect Revalidation</p>
                                <p className="text-white/75 text-xs">Admin/Super Admin compliance-safe recovery flow</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-800">
                                {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-slate-500">Only hard-bounce suppressions are shown.</p>
                        </div>
                        <button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>

                    {successMessage && (
                        <div className="mx-6 mt-4 mb-0 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm">
                            {successMessage}
                        </div>
                    )}

                    <div className="p-6 max-h-[65vh] overflow-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Loading revalidation candidates...
                            </div>
                        ) : error ? (
                            <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-sm">
                                <AlertTriangle className="w-4 h-4" />
                                {error?.response?.data?.detail || error?.message || 'Failed to load candidates.'}
                            </div>
                        ) : candidates.length === 0 ? (
                            <div className="py-14 text-center">
                                <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                                    <UserCheck className="w-5 h-5 text-slate-400" />
                                </div>
                                <p className="text-sm font-semibold text-slate-700">No hard-bounce candidates found</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Prospects with voluntary unsubscribe suppressions are intentionally excluded.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-100">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Prospect</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Company</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Bounce Reason</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Suppressed At</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {candidates.map((p) => (
                                            <tr key={p.prospect_id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-slate-800">{p.full_name || 'Unknown'}</p>
                                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <Mail className="w-3.5 h-3.5" />
                                                        {p.email}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                        {p.company_name || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 max-w-[320px]">
                                                    <span className="line-clamp-2" title={p.bounce_reason}>
                                                        {p.bounce_reason || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">
                                                    {formatDate(p.suppressed_at)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => setSelectedProspect(p)}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                                                        style={{ background: 'linear-gradient(90deg, #b45309, #f59e0b)' }}
                                                    >
                                                        Revalidate
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            <AnimatePresence>
                {selectedProspect && (
                    <RevalidateModal
                        prospect={selectedProspect}
                        onClose={() => setSelectedProspect(null)}
                        onSuccess={(result) => {
                            setSuccessMessage(
                                `Revalidated ${selectedProspect.email} -> ${result?.new_email || 'updated email'}.`
                            );
                            setSelectedProspect(null);
                            refetch();
                        }}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
