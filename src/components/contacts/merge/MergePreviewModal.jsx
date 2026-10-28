import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowRightLeft, GitMerge, Loader2 } from 'lucide-react';
import { duplicatesApi } from '../../../api/duplicates';
import { errorMessage } from '../../../api/contacts';
import { useApiQuery } from '../../../lib/useApiQuery';
import { ErrorNote, Modal, PrimaryButton, SecondaryButton } from '../shared';

const MOVE_LABELS = [
    ['lists', 'list memberships'], ['campaigns', 'campaign enrollments'], ['emails', 'emails'],
    ['activities', 'activities'], ['tasks', 'tasks'], ['leads', 'leads'], ['deals', 'deals'],
];

function display(value) {
    if (value === null || value === undefined || value === '') return null;
    return String(value);
}

/** Per-property choices: only the properties where the records differ are shown; the default is preselected. */
function PropertyChoices({ properties, choices, setChoices }) {
    const differing = properties.filter(p => p.differs);
    if (!differing.length) {
        return <p className="text-xs text-slate-500">No conflicting values: blanks on the kept record are filled from the others.</p>;
    }
    return (
        <table className="w-full text-sm">
            <tbody>
                {differing.map(p => {
                    const chosen = choices[p.field] || p.default;
                    return (
                        <tr key={p.field} className="border-t border-slate-100 first:border-0">
                            <td className="py-1.5 pr-3 text-xs font-semibold text-slate-500 w-32 align-top">{p.label}</td>
                            {p.values.map(v => (
                                <td key={v.prospect_id} className="py-1.5 pr-3 align-top">
                                    {display(v.value) ? (
                                        <label className="flex items-start gap-1.5 text-slate-700">
                                            <input type="radio" className="accent-indigo-600 mt-1" name={`choice-${p.field}`}
                                                checked={chosen === v.prospect_id}
                                                onChange={() => setChoices(c => ({ ...c, [p.field]: v.prospect_id }))}
                                                aria-label={`${p.label}: ${display(v.display)}`} />
                                            <span className="break-all">{display(v.display)}</span>
                                        </label>
                                    ) : <span className="text-slate-300 pl-5">—</span>}
                                </td>
                            ))}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

function MovesSummary({ moves }) {
    const parts = MOVE_LABELS.filter(([key]) => moves?.[key]).map(([key, label]) => `${moves[key]} ${label}`);
    return (
        <p className="text-sm text-slate-600 flex items-start gap-2">
            <ArrowRightLeft className="w-4 h-4 mt-0.5 text-indigo-500 flex-shrink-0" />
            <span>{parts.length ? `Moves to the kept record: ${parts.join(', ')}.` : 'Nothing else to move: only the property values are combined.'}</span>
        </p>
    );
}

/**
 * Merge preview (C-19): what each record has per property, the value kept by default, what moves and
 * warnings; the user can pick another value per property, then merge. Props: primaryId (the record kept),
 * duplicateIds, onClose, onMerged(result).
 */
export default function MergePreviewModal({ primaryId, duplicateIds, onClose, onMerged }) {
    const queryClient = useQueryClient();
    const [choices, setChoices] = useState({});
    const [error, setError] = useState(null);
    const key = useMemo(() => ['merge-preview', primaryId, ...duplicateIds], [primaryId, duplicateIds]);
    const { data, error: loadError, isLoading } = useApiQuery(key, () => duplicatesApi.preview(primaryId, duplicateIds));

    const merge = useMutation({
        mutationFn: () => {
            // Only send choices that differ from the kept record's own value
            const picked = Object.fromEntries(Object.entries(choices).filter(([, id]) => id !== primaryId));
            return duplicatesApi.merge(primaryId, duplicateIds, picked);
        },
        onSuccess: (result) => {
            ['contacts', 'contact-duplicates', 'duplicate-pairs', 'accounts'].forEach(k =>
                queryClient.invalidateQueries({ queryKey: [k] }));
            onMerged?.(result);
        },
        onError: err => setError(errorMessage(err, 'Merge failed.')),
    });

    const survivor = data?.survivor;
    return (
        <Modal title="Review merge" subtitle={survivor ? `Keep ${survivor.full_name} <${survivor.email}>` : 'Loading the records…'}
            onClose={onClose} width="max-w-3xl"
            footer={<>
                <SecondaryButton onClick={onClose} className="flex-1">Cancel</SecondaryButton>
                <PrimaryButton onClick={() => merge.mutate()} loading={merge.isPending} disabled={!data} className="flex-1">
                    <GitMerge className="w-4 h-4" /> Merge {duplicateIds.length + 1} records
                </PrimaryButton>
            </>}>
            {isLoading ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
            ) : loadError ? (
                <ErrorNote message={loadError.message} />
            ) : data && (
                <div className="space-y-4">
                    <div className="grid gap-2" style={{ gridTemplateColumns: `8rem repeat(${data.merging.length + 1}, minmax(0, 1fr))` }}>
                        <span />
                        {[data.survivor, ...data.merging].map((c, i) => (
                            <div key={c.prospect_id} className={`text-xs rounded-lg px-2 py-1.5 ${i === 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-600'}`}>
                                <p className="font-semibold truncate">{c.full_name}{i === 0 && ' (kept)'}</p>
                                <p className="truncate">{c.email}</p>
                            </div>
                        ))}
                    </div>
                    <PropertyChoices properties={data.properties} choices={choices} setChoices={setChoices} />
                    {data.tags?.length > 0 && <p className="text-xs text-slate-500">Tags combined: {data.tags.join(', ')}</p>}
                    <MovesSummary moves={data.moves} />
                    {data.warnings?.length > 0 && (
                        <ul className="space-y-1 rounded-xl bg-amber-50 px-4 py-3" aria-label="Merge warnings">
                            {data.warnings.map(w => (
                                <li key={w} className="text-xs text-amber-800 flex gap-2"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{w}</li>
                            ))}
                        </ul>
                    )}
                    <ErrorNote message={error} />
                </div>
            )}
        </Modal>
    );
}
