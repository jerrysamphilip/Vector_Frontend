import { useMutation } from '@tanstack/react-query';
import { Download, Loader2, SearchCheck } from 'lucide-react';
import { campaignWizardApi } from '../../../api/campaignWizard';
import { downloadCsv } from '../../../lib/csv';
import { errorMessage } from '../../../lib/apiErrors';
import { mergeEnrollmentChecks, skippedCsvRows } from './enrollmentCheck';

const SHOWN = 50;

/**
 * Wizard launch step: dry run of the enrolment launch will do (same lists, same arguments, same rules,
 * nothing written), with the contacts that will be skipped and why, downloadable as CSV.
 */
export default function EnrollmentCheckPanel({ campaignId, selectedLists, excludedProspectIds }) {
    const check = useMutation({
        mutationFn: async () => {
            const exclusions = excludedProspectIds?.length ? excludedProspectIds : null;
            const results = [];
            for (const listId of selectedLists) {
                // Same arguments as the launch's enrolProspects: all personas, no personal emails, no cool-off
                results.push(await campaignWizardApi.checkEnrollment(campaignId, listId, null, true, 0, exclusions));
            }
            return mergeEnrollmentChecks(results);
        },
    });
    const result = check.data;

    return (
        <section aria-label="Enrolment check" className="border border-gray-100 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Enrolment check</p>
                    <p className="text-sm text-gray-500">See who will be enrolled and who will be skipped before you launch.</p>
                </div>
                <button type="button" onClick={() => check.mutate()} disabled={check.isPending || !selectedLists?.length}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                    {check.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchCheck className="w-4 h-4" />}
                    {result ? 'Check again' : 'Check contacts'}
                </button>
            </div>
            {check.error && <p role="alert" className="text-sm text-red-600">{errorMessage(check.error)}</p>}
            {result && (
                <div className="space-y-3" role="status">
                    <p className="text-sm text-gray-700">
                        <span className="font-bold text-emerald-700">{result.wouldEnroll}</span> will be enrolled,{' '}
                        <span className="font-bold text-amber-700">{result.rejected.length}</span> will be skipped
                        {result.truncated && ' (first results shown)'}.
                    </p>
                    {result.byReason.length > 0 && (
                        <>
                            <ul className="text-sm space-y-1">
                                {result.byReason.map(([reason, count]) => (
                                    <li key={reason} className="flex justify-between"><span className="text-gray-600">{reason}</span><span className="font-semibold">{count}</span></li>
                                ))}
                            </ul>
                            <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-xl">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 sticky top-0 text-left text-xs text-gray-500 uppercase">
                                        <tr><th className="px-3 py-2">Contact</th><th className="px-3 py-2">Reason</th></tr>
                                    </thead>
                                    <tbody>
                                        {result.rejected.slice(0, SHOWN).map(r => (
                                            <tr key={r.prospect_id} className="border-t border-gray-50">
                                                <td className="px-3 py-1.5"><span className="text-gray-800">{r.name || r.email || r.prospect_id}</span>{r.name && r.email && <span className="block text-xs text-gray-400">{r.email}</span>}</td>
                                                <td className="px-3 py-1.5 text-gray-600">{r.reason}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <button type="button" onClick={() => downloadCsv('skipped-contacts.csv', skippedCsvRows(result.rejected))}
                                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800">
                                <Download className="w-4 h-4" /> Download skipped contacts (CSV)
                            </button>
                        </>
                    )}
                </div>
            )}
        </section>
    );
}
