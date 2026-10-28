// Imports page: the import history (with live progress of running imports) and the import wizard drawer
// (src/components/import/ImportDrawer.jsx). /app/import?new=1 opens the wizard straight away (Contacts → Import).
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, History, Loader2, Upload } from 'lucide-react';
import { backgroundImportsApi as api, isActive } from '../api/imports';
import { errorMessage } from '../api/contacts';
import ImportDrawer, { ProgressBar } from '../components/import/ImportDrawer';
import { ErrorNote, PrimaryButton, formatDateTime, relativeDate } from '../components/contacts/shared';

const cardStyle = { boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };
const STATUS_STYLE = {
    COMPLETED: 'bg-emerald-50 text-emerald-700', FAILED: 'bg-red-50 text-red-700', CANCELLED: 'bg-slate-100 text-slate-600',
    RUNNING: 'bg-indigo-50 text-indigo-700', QUEUED: 'bg-amber-50 text-amber-700', UPLOADED: 'bg-slate-100 text-slate-500',
};

function StatusBadge({ job }) {
    const running = isActive(job);
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[job.status] || 'bg-amber-50 text-amber-700'}`}>
            {running && <Loader2 className="w-3 h-3 animate-spin" />}
            {job.status.toLowerCase()}{job.status === 'RUNNING' ? ` ${job.progress ?? 0}%` : ''}
        </span>
    );
}

function ImportHistory({ onOpen }) {
    const { data, error, isLoading } = useQuery({
        queryKey: ['imports'], queryFn: () => api.history({ page_size: 20 }),
        // Running imports show live progress
        refetchInterval: q => ((q.state.data?.items || []).some(isActive) ? 3000 : false),
    });
    if (isLoading) return <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading imports…</p>;
    if (error) return <ErrorNote message={errorMessage(error, 'Could not load the import history.')} />;
    const items = (data?.items || []).filter(j => j.status !== 'UPLOADED');
    if (!items.length) return <p className="text-sm text-slate-500">No imports yet.</p>;
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={cardStyle}>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 px-5 py-4 border-b border-slate-100"><History className="w-4 h-4 text-indigo-500" /> Past imports</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead><tr className="text-xs font-semibold text-left text-slate-400 uppercase tracking-wide bg-slate-50/80">
                        <th className="pl-5 pr-3 py-2.5">File</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Created</th>
                        <th className="px-3 py-2.5">Updated</th><th className="px-3 py-2.5">Errors</th><th className="px-3 py-2.5">By</th><th className="px-3 pr-5 py-2.5">When</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {items.map(j => (
                            <tr key={j.import_id}>
                                <td className="pl-5 pr-3 py-2.5 font-medium text-slate-800">
                                    {j.background ? <button className="text-left hover:text-indigo-700 underline-offset-2 hover:underline" onClick={() => onOpen(j)}>{j.file_name}</button> : j.file_name}
                                    {isActive(j) && <div className="mt-1.5 max-w-[220px]"><ProgressBar job={j} /></div>}
                                </td>
                                <td className="px-3 py-2.5"><StatusBadge job={j} /></td>
                                <td className="px-3 py-2.5 text-slate-600">{(j.contacts_created || 0) + (j.companies_created || 0)}</td>
                                <td className="px-3 py-2.5 text-slate-600">{(j.contacts_updated || 0) + (j.companies_updated || 0)}</td>
                                <td className="px-3 py-2.5">{j.error_count ? <button onClick={() => api.downloadErrors(j.import_id)} className="font-semibold text-red-600 hover:text-red-800">{j.error_count} ↓</button> : <span className="text-slate-400">0</span>}</td>
                                <td className="px-3 py-2.5 text-slate-600">{j.created_by_name || '—'}</td>
                                <td className="px-3 pr-5 py-2.5 text-slate-500 whitespace-nowrap" title={formatDateTime(j.started_at)}>{relativeDate(j.started_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function ImportContacts() {
    const [params, setParams] = useSearchParams();
    const [drawer, setDrawer] = useState(params.get('new') === '1' ? { job: null } : null);
    const close = () => {
        setDrawer(null);
        if (params.get('new')) setParams({}, { replace: true });
    };
    return (
        <div className="w-full max-w-5xl space-y-6">
            <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                    <Link to="/app/contacts" className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1.5 mb-3"><ArrowLeft className="w-4 h-4" /> Contacts</Link>
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900">Import contacts and companies</h1>
                    <p className="text-sm text-gray-400 mt-1">CSV or Excel, up to 50,000 rows. Check the result before anything is written; large files import in the background.</p>
                </div>
                <PrimaryButton onClick={() => setDrawer({ job: null })}><Upload className="w-4 h-4" /> New import</PrimaryButton>
            </div>
            <ImportHistory onOpen={job => setDrawer({ job })} />
            {drawer && <ImportDrawer key={drawer.job?.import_id || 'new'} initialJob={drawer.job} onClose={close} />}
        </div>
    );
}
