import { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, Download, X } from 'lucide-react';

/**
 * Result of enrolling contacts into a campaign: how many were enrolled and, for every
 * contact that wasn't, the reason (BR-DF-02). Rejections come from the API as
 * [{prospect_id, email, name, reason_code, reason}].
 */
export default function EnrollmentResultModal({ title = 'Enrollment result', enrolled = 0, rejected = [], rejectedCount, note, limitNotice, onClose, closeLabel = 'Done' }) {
    const total = rejectedCount ?? rejected.length;
    const byReason = useMemo(() => {
        const groups = {};
        rejected.forEach(r => { groups[r.reason] = (groups[r.reason] || 0) + 1; });
        return Object.entries(groups).sort((a, b) => b[1] - a[1]);
    }, [rejected]);

    const downloadCsv = () => {
        const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const rows = [['Name', 'Email', 'Reason'], ...rejected.map(r => [r.name, r.email, r.reason])];
        const blob = new Blob([rows.map(r => r.map(escape).join(',')).join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), { href: url, download: 'not-enrolled.csv' });
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" role="dialog" aria-label={title}>
                <div className="h-1.5 w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, #2d6bbf, #73C8D2)' }} />
                <div className="px-6 pt-5 pb-3 flex items-start justify-between">
                    <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl" aria-label="Close"><X className="w-4 h-4" /></button>
                </div>
                <div className="px-6 pb-4 overflow-y-auto space-y-4">
                    {limitNotice && <p className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">{limitNotice}</p>}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Enrolled</p>
                            <p className="text-2xl font-bold text-emerald-800 mt-1">{enrolled.toLocaleString()}</p>
                        </div>
                        <div className={`rounded-2xl p-4 border ${total ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                            <p className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${total ? 'text-amber-700' : 'text-slate-500'}`}><AlertTriangle className="w-3.5 h-3.5" /> Not enrolled</p>
                            <p className={`text-2xl font-bold mt-1 ${total ? 'text-amber-800' : 'text-slate-700'}`}>{total.toLocaleString()}</p>
                        </div>
                    </div>
                    {note && <p className="text-sm text-slate-600">{note}</p>}
                    {byReason.length > 0 && (
                        <>
                            <ul className="space-y-1.5">
                                {byReason.map(([reason, count]) => (
                                    <li key={reason} className="flex justify-between text-sm"><span className="text-slate-700">{reason}</span><span className="font-semibold text-slate-800">{count}</span></li>
                                ))}
                            </ul>
                            <div className="border border-slate-100 rounded-2xl overflow-hidden">
                                <div className="max-h-72 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 sticky top-0">
                                            <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                <th className="px-4 py-2">Contact</th><th className="px-4 py-2">Reason</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {rejected.map((r, i) => (
                                                <tr key={`${r.prospect_id}-${i}`}>
                                                    <td className="px-4 py-2"><p className="font-medium text-slate-800">{r.name || '—'}</p><p className="text-xs text-slate-500">{r.email || r.prospect_id}</p></td>
                                                    <td className="px-4 py-2 text-slate-600">{r.reason}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            {total > rejected.length && <p className="text-xs text-slate-500">Showing the first {rejected.length.toLocaleString()}.</p>}
                        </>
                    )}
                </div>
                <div className="px-6 pb-6 pt-2 flex gap-2.5">
                    {rejected.length > 0 && (
                        <button onClick={downloadCsv} className="h-10 px-4 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-2">
                            <Download className="w-4 h-4" /> Download list
                        </button>
                    )}
                    <button onClick={onClose} className="ml-auto h-10 px-5 text-sm font-semibold text-white rounded-xl" style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>{closeLabel}</button>
                </div>
            </div>
        </div>
    );
}
