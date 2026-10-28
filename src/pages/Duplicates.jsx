import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight, GitMerge, Loader2, RefreshCw, RotateCcw, UserX } from 'lucide-react';
import { DUPLICATE_PAGE_SIZE, duplicatesApi } from '../api/duplicates';
import { errorMessage } from '../api/contacts';
import { useAuth } from '../auth/AuthProvider';
import { useApiQuery } from '../lib/useApiQuery';
import LoadError from '../components/ui/LoadError';
import MergePreviewModal from '../components/contacts/merge/MergePreviewModal';
import { Avatar, ErrorNote, relativeDate } from '../components/contacts/shared';

const TABS = [['OPEN', 'To review'], ['DISMISSED', 'Not duplicates'], ['MERGED', 'Merged']];
const CONFIDENCE = [['', 'Any confidence'], ['HIGH', 'High'], ['MEDIUM', 'Medium']];
const TONE = { HIGH: 'bg-red-50 text-red-700', MEDIUM: 'bg-amber-50 text-amber-700' };

function ContactCell({ contact, keep, onKeep, selectable }) {
    return (
        <div className={`flex-1 min-w-0 flex items-center gap-3 rounded-xl px-3 py-2 ${keep ? 'bg-indigo-50/60' : ''}`}>
            {selectable && (
                <input type="radio" className="accent-indigo-600" checked={keep} onChange={onKeep}
                    aria-label={`Keep ${contact.full_name}`} />
            )}
            <Avatar first={contact.first_name} last={contact.last_name} seed={contact.email} size="sm" />
            <div className="min-w-0">
                <Link to={`/app/contacts/${contact.prospect_id}`} className="text-sm font-semibold text-slate-800 hover:text-indigo-700 truncate block">
                    {contact.full_name}
                </Link>
                <p className="text-xs text-slate-500 truncate">
                    {contact.email}{contact.company_name ? ` · ${contact.company_name}` : ''}{contact.phone ? ` · ${contact.phone}` : ''}
                </p>
                <p className="text-[11px] text-slate-400">{contact.owner_name || 'Unassigned'} · added {relativeDate(contact.created_at)}</p>
            </div>
        </div>
    );
}

function PairCard({ pair, onChanged, onMerge }) {
    const [keepId, setKeepId] = useState(pair.contacts[0]?.prospect_id);
    const [error, setError] = useState(null);
    const act = useMutation({
        mutationFn: (kind) => (kind === 'dismiss' ? duplicatesApi.dismiss(pair.pair_id) : duplicatesApi.reopen(pair.pair_id)),
        onSuccess: onChanged,
        onError: err => setError(errorMessage(err)),
    });
    const open = pair.status === 'OPEN';
    const other = pair.contacts.find(c => c.prospect_id !== keepId);
    return (
        <li className="border border-slate-100 rounded-2xl overflow-hidden" aria-label={`Possible duplicate: ${pair.contacts.map(c => c.full_name).join(' and ')}`}>
            <div className="px-4 py-2.5 bg-slate-50 flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${TONE[pair.confidence] || TONE.MEDIUM}`}>
                    {pair.confidence === 'HIGH' ? 'High' : 'Medium'} confidence · {pair.score}
                </span>
                <span className="text-xs text-slate-600">{pair.reasons.join(' · ')}</span>
                {pair.resolved_by_name && <span className="ml-auto text-[11px] text-slate-400">by {pair.resolved_by_name} {relativeDate(pair.resolved_at)}</span>}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 p-2">
                {pair.contacts.map(c => (
                    <ContactCell key={c.prospect_id} contact={c} keep={open && c.prospect_id === keepId}
                        onKeep={() => setKeepId(c.prospect_id)} selectable={open && pair.contacts.length === 2} />
                ))}
            </div>
            <div className="px-4 py-2.5 flex items-center gap-2 justify-end border-t border-slate-50">
                {open ? <>
                    <button type="button" onClick={() => act.mutate('dismiss')} disabled={act.isPending}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm text-slate-600 border border-slate-200 hover:bg-slate-50">
                        <UserX className="w-4 h-4" /> Not the same person
                    </button>
                    <button type="button" onClick={() => onMerge(keepId, other.prospect_id)} disabled={!other || pair.contacts.length < 2}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                        <GitMerge className="w-4 h-4" /> Review &amp; merge
                    </button>
                </> : pair.status === 'DISMISSED' && (
                    <button type="button" onClick={() => act.mutate('reopen')} disabled={act.isPending}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm text-slate-600 border border-slate-200 hover:bg-slate-50">
                        <RotateCcw className="w-4 h-4" /> Reopen
                    </button>
                )}
            </div>
            {error && <div className="px-4 pb-3"><ErrorNote message={error} /></div>}
        </li>
    );
}

/** Duplicate review (C-08, C-09, F-21): stored suggestions with confidence and reasons; dismiss, reopen, merge. */
export default function Duplicates() {
    const queryClient = useQueryClient();
    const { hasPermission } = useAuth();
    const canManage = hasPermission('manage_prospects');
    const [status, setStatus] = useState('OPEN');
    const [confidence, setConfidence] = useState('');
    const [page, setPage] = useState(1);
    const [merging, setMerging] = useState(null); // { primaryId, duplicateId }
    const [notice, setNotice] = useState(null);
    const [error, setError] = useState(null);

    const { data, error: loadError, isLoading, refetch } = useApiQuery(
        ['duplicate-pairs', status, confidence, page],
        () => duplicatesApi.pairs({ status, confidence, page }),
        { enabled: canManage },
    );
    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['duplicate-pairs'] });
        queryClient.invalidateQueries({ queryKey: ['contact-duplicates'] });
    };
    const scan = useMutation({
        mutationFn: duplicatesApi.scan,
        onSuccess: (stats) => {
            setNotice(`Scan finished: ${stats.pairs_found} possible duplicate pair${stats.pairs_found === 1 ? '' : 's'} (${stats.new} new).`);
            refresh();
        },
        onError: err => setError(errorMessage(err)),
    });

    if (!canManage) {
        return <p className="text-sm text-slate-500">Reviewing duplicates needs the “manage prospects” permission.</p>;
    }
    const items = data?.items || [];
    const total = data?.total || 0;
    const pages = Math.max(1, Math.ceil(total / DUPLICATE_PAGE_SIZE));
    const choose = (next) => { setStatus(next); setPage(1); };

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <Link to="/app/contacts" className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><ChevronLeft className="w-3 h-3" />Contacts</Link>
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900">Duplicates</h1>
                    <p className="text-sm text-gray-400 mt-1">Contacts that look like the same person, with the reasons. Nothing is merged without you.</p>
                </div>
                <button type="button" onClick={() => scan.mutate()} disabled={scan.isPending}
                    className="flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50">
                    {scan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Scan now
                </button>
            </div>
            {notice && <p role="status" className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-2">{notice}</p>}
            <ErrorNote message={error} />

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="px-5 py-4 flex items-center gap-3 flex-wrap border-b border-slate-50">
                    <div className="flex bg-white rounded-xl border border-slate-200 p-0.5" role="tablist">
                        {TABS.map(([value, label]) => (
                            <button key={value} type="button" role="tab" aria-selected={status === value} onClick={() => choose(value)}
                                className={`px-3 h-8 text-sm font-medium rounded-lg ${status === value ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</button>
                        ))}
                    </div>
                    <select aria-label="Confidence" value={confidence} onChange={e => { setConfidence(e.target.value); setPage(1); }}
                        className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-sm">
                        {CONFIDENCE.map(([value, label]) => <option key={label} value={value}>{label}</option>)}
                    </select>
                    <span className="ml-auto text-sm text-slate-500">{total} pair{total === 1 ? '' : 's'}</span>
                </div>
                {isLoading ? (
                    <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                ) : loadError && !data ? (
                    <LoadError error={loadError} onRetry={refetch} title="Couldn't load duplicates" />
                ) : items.length === 0 ? (
                    <div className="py-16 text-center">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                        <p className="font-semibold text-slate-800">{status === 'OPEN' ? 'No duplicates to review' : 'Nothing here'}</p>
                        <p className="text-sm text-slate-500 mt-1">{status === 'OPEN' ? 'Run a scan after an import to check again.' : 'Suggestions you act on are listed here.'}</p>
                    </div>
                ) : (
                    <ul className="p-4 space-y-3">
                        {items.map(pair => (
                            <PairCard key={pair.pair_id} pair={pair} onChanged={refresh}
                                onMerge={(primaryId, duplicateId) => setMerging({ primaryId, duplicateId })} />
                        ))}
                    </ul>
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

            {merging && (
                <MergePreviewModal primaryId={merging.primaryId} duplicateIds={[merging.duplicateId]}
                    onClose={() => setMerging(null)}
                    onMerged={() => { setMerging(null); setNotice('Merged. The other record was removed and its history moved.'); refresh(); }} />
            )}
        </div>
    );
}
