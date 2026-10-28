import { useState } from 'react';
import { GitMerge, History, Mail } from 'lucide-react';
import { duplicatesApi } from '../../../api/duplicates';
import { useApiQuery } from '../../../lib/useApiQuery';
import { formatDateTime, relativeDate } from '../shared';

const STATUS_LABELS = { RETIRED: 'Old address', MERGED: 'From a merged record', ACTIVE: 'Current' };

/** Past e-mail addresses (C-11): retired ones and those of records merged into this contact. */
export function PastEmails({ prospectId }) {
    const { data, isLoading } = useApiQuery(['contact-emails', prospectId], () => duplicatesApi.emailHistory(prospectId));
    const items = data?.items || [];
    if (isLoading || !items.length) return null;
    return (
        <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />Past e-mail addresses</p>
            <ul className="space-y-1.5">
                {items.map(item => (
                    <li key={item.email} className="text-sm flex items-center justify-between gap-3">
                        <span className="text-slate-700 break-all">{item.email}</span>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap" title={formatDateTime(item.updated_at)}>
                            {STATUS_LABELS[item.status] || item.status} · {relativeDate(item.updated_at)}
                        </span>
                    </li>
                ))}
            </ul>
            <p className="text-[11px] text-slate-400 mt-1.5">Imports and replies from these addresses are matched to this contact.</p>
        </div>
    );
}

/** Merge history (C-10): who merged which records into this contact, with what moved. */
export function MergeHistory({ prospectId }) {
    const [open, setOpen] = useState(null);
    const { data, isLoading } = useApiQuery(['contact-merges', prospectId], () => duplicatesApi.mergeHistory(prospectId));
    const items = data?.items || [];
    if (isLoading || !items.length) return null;
    return (
        <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><History className="w-3.5 h-3.5" />Merge history</p>
            <ul className="space-y-2">
                {items.map(log => (
                    <li key={log.merge_id} className="text-sm border border-slate-100 rounded-xl px-3 py-2">
                        <button type="button" className="w-full text-left flex items-start gap-2" onClick={() => setOpen(o => (o === log.merge_id ? null : log.merge_id))}
                            aria-expanded={open === log.merge_id}>
                            <GitMerge className="w-4 h-4 mt-0.5 text-indigo-500 flex-shrink-0" />
                            <span className="flex-1 min-w-0">
                                <span className="text-slate-700">Merged {log.merged.map(m => m.name || m.email).join(', ')}</span>
                                <span className="block text-[11px] text-slate-400">{log.merged_by_name || 'System'} · {relativeDate(log.merged_at)}</span>
                            </span>
                        </button>
                        {open === log.merge_id && (
                            <div className="mt-2 pl-6 space-y-1 text-xs text-slate-500">
                                {log.merged.map(m => <p key={m.prospect_id}>{m.name || '—'} &lt;{m.email}&gt;</p>)}
                                {Object.keys(log.moved || {}).length > 0 && (
                                    <p>Moved: {Object.entries(log.moved).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(', ') || 'nothing'}</p>
                                )}
                                {Object.keys(log.choices || {}).length > 0 && <p>Values taken from merged records: {Object.keys(log.choices).join(', ')}</p>}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** Both, as one card for the contact record page (renders nothing when there is no history). */
export default function ContactIdentityCard({ prospectId }) {
    return (
        <div className="space-y-4" data-testid="contact-identity">
            <PastEmails prospectId={prospectId} />
            <MergeHistory prospectId={prospectId} />
        </div>
    );
}
