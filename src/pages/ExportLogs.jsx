import { useState } from 'react';
import { ChevronLeft, ChevronRight, FileDown, Loader2 } from 'lucide-react';
import { EXPORT_LOG_PAGE_SIZE, exportLogsApi } from '../api/exportLogs';
import { useAuth } from '../auth/AuthProvider';
import { useApiQuery } from '../lib/useApiQuery';
import LoadError from '../components/ui/LoadError';
import { formatDateTime } from '../components/contacts/shared';

const TYPES = [['', 'Everything'], ['CONTACT', 'Contacts'], ['LIST', 'Lists'], ['COMPANY', 'Companies']];
const TYPE_LABEL = { CONTACT: 'Contacts', LIST: 'List', COMPANY: 'Companies' };

/** Export audit log (C-07): who exported which records, with which view, how many rows, when. Admins only. */
export default function ExportLogs() {
    const { isAdmin } = useAuth();
    const [objectType, setObjectType] = useState('');
    const [page, setPage] = useState(1);
    const { data, error, isLoading, refetch } = useApiQuery(
        ['export-logs', objectType, page], () => exportLogsApi.list({ objectType, page }), { enabled: isAdmin });

    const header = (
        <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Export log</h1>
            <p className="text-sm text-gray-400 mt-1">Every export of contacts and lists: who, what, how many rows and when.</p>
        </div>
    );
    if (!isAdmin) {
        return <div className="space-y-6">{header}<p className="text-sm text-slate-500">Only admins can see the export log.</p></div>;
    }
    const items = data?.items || [];
    const total = data?.total || 0;
    const pages = Math.max(1, Math.ceil(total / EXPORT_LOG_PAGE_SIZE));

    return (
        <div className="w-full space-y-6">
            {header}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-50">
                    <select aria-label="Exported records" value={objectType} onChange={e => { setObjectType(e.target.value); setPage(1); }}
                        className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-sm">
                        {TYPES.map(([value, label]) => <option key={label} value={value}>{label}</option>)}
                    </select>
                    <span className="ml-auto text-sm text-slate-500">{total} export{total === 1 ? '' : 's'}</span>
                </div>
                {isLoading ? (
                    <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                ) : error && !data ? (
                    <LoadError error={error} onRetry={refetch} title="Couldn't load the export log" />
                ) : items.length === 0 ? (
                    <div className="py-16 text-center">
                        <FileDown className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="font-semibold text-slate-800">No exports yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-left text-slate-400 uppercase tracking-wide">
                                    <th className="pl-5 pr-3 py-3">When</th>
                                    <th className="px-3 py-3">Who</th>
                                    <th className="px-3 py-3">What</th>
                                    <th className="px-3 py-3">View / filter</th>
                                    <th className="px-3 py-3 text-right">Rows</th>
                                    <th className="px-3 pr-5 py-3">Format</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {items.map(log => (
                                    <tr key={log.export_id}>
                                        <td className="pl-5 pr-3 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                                        <td className="px-3 py-3 text-sm text-slate-800">{log.user_name || '—'}</td>
                                        <td className="px-3 py-3 text-sm text-slate-600">{TYPE_LABEL[log.object_type] || log.object_type}</td>
                                        <td className="px-3 py-3 text-xs text-slate-500 max-w-md break-words">{log.filter_summary || '—'}</td>
                                        <td className="px-3 py-3 text-sm text-slate-800 text-right">{log.row_count.toLocaleString()}</td>
                                        <td className="px-3 pr-5 py-3 text-xs font-semibold uppercase text-slate-500">{log.format}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {pages > 1 && (
                    <div className="px-5 py-3 flex items-center justify-end gap-2 border-t border-slate-50 text-sm text-slate-500">
                        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                            className="p-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                        <span>Page {page} of {pages}</span>
                        <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => setPage(p => p + 1)}
                            className="p-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                )}
            </div>
        </div>
    );
}
