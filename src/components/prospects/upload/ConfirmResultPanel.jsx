import { AlertCircle, CheckCircle2 } from 'lucide-react';

/** After "Confirm Upload": what was saved and every row the API did not add, with its reason. */
export default function ConfirmResultPanel({ summary, onDone }) {
    const nothingSaved = summary.inserted === 0;
    const title = summary.status === 'NO_ACCEPTED_RECORDS' ? 'No accepted rows were sent, so nothing was saved.'
        : nothingSaved ? 'No contacts were added.'
            : `Saved ${summary.inserted} contact${summary.inserted === 1 ? '' : 's'} (${summary.newProspects} new, ${summary.updated} updated).`;
    return (
        <section role="status" aria-label="Upload result" data-testid="upload-confirm-result"
            className={`rounded-xl border px-4 py-3 space-y-3 ${nothingSaved ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-start gap-2">
                {nothingSaved ? <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />}
                <div className="text-sm text-slate-800 space-y-1">
                    <p className="font-semibold">{title}</p>
                    <p className="text-slate-600">
                        Not added: {summary.notAdded.length}
                        {' · '}Rejected on re-check: {summary.rejected}
                        {' · '}Refused by the database: {summary.failed}
                        {summary.unsubscribed > 0 && <>{' · '}Unsubscribed: {summary.unsubscribed}</>}
                    </p>
                </div>
                {onDone && (
                    <button type="button" onClick={onDone}
                        className="ml-auto shrink-0 h-8 px-3 rounded-lg text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
                        Go to prospects
                    </button>
                )}
            </div>
            {summary.notAdded.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                        <caption className="sr-only">Rows not added</caption>
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                <th scope="col" className="py-2 px-3 font-semibold w-16">Row</th>
                                <th scope="col" className="py-2 px-3 font-semibold">Email</th>
                                <th scope="col" className="py-2 px-3 font-semibold">Reason</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {summary.notAdded.map((r, i) => (
                                <tr key={`${r.row ?? 'x'}-${r.email ?? ''}-${i}`}>
                                    <td className="py-1.5 px-3 text-slate-500">{r.row ?? '—'}</td>
                                    <td className="py-1.5 px-3 text-slate-800">{r.email || '—'}</td>
                                    <td className="py-1.5 px-3 text-slate-600">{r.reason || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
