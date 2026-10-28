import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { GitMerge, CheckCircle2, Loader2, UserX } from 'lucide-react';
import { contactsApi, errorMessage } from '../../api/contacts';
import { duplicatesApi } from '../../api/duplicates';
import MergePreviewModal from './merge/MergePreviewModal';
import { Avatar, ErrorNote, Modal, PrimaryButton, SecondaryButton, TagChips, relativeDate } from './shared';

const TONE = { HIGH: 'bg-red-50 text-red-700', MEDIUM: 'bg-amber-50 text-amber-700' };

function DuplicateGroup({ group, onMerged }) {
    const contacts = group.contacts;
    const [primaryId, setPrimaryId] = useState(contacts[0].prospect_id);
    const [selected, setSelected] = useState(contacts.map(c => c.prospect_id));
    const [reviewing, setReviewing] = useState(false);
    const [error, setError] = useState(null);

    // "Not the same person": the stored pair is never suggested again (C-09)
    const dismiss = useMutation({
        mutationFn: () => duplicatesApi.dismiss(group.pair_id),
        onSuccess: onMerged,
        onError: err => setError(errorMessage(err)),
    });

    const toMerge = selected.filter(id => id !== primaryId);

    return (
        <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {group.confidence && <span className={`mr-2 px-2 py-0.5 rounded-full normal-case text-[11px] ${TONE[group.confidence] || TONE.MEDIUM}`}>{group.confidence === 'HIGH' ? 'High' : 'Medium'} confidence</span>}
                    {group.reasons.join(' · ')}
                </span>
                <span className="text-xs text-slate-400">Pick the record to keep</span>
            </div>
            <div className="divide-y divide-slate-50">
                {contacts.map(c => {
                    const isPrimary = c.prospect_id === primaryId;
                    return (
                        <div key={c.prospect_id} className={`flex items-center gap-3 px-4 py-3 ${isPrimary ? 'bg-indigo-50/50' : ''}`}>
                            <input type="radio" name={`primary-${contacts[0].prospect_id}`} checked={isPrimary}
                                onChange={() => { setPrimaryId(c.prospect_id); setSelected(s => s.includes(c.prospect_id) ? s : [...s, c.prospect_id]); }}
                                className="accent-indigo-600" aria-label="Keep this record" />
                            <Avatar first={c.first_name} last={c.last_name} seed={c.email} size="sm" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                    {c.full_name} {isPrimary && <span className="ml-1 text-[11px] font-semibold text-indigo-600">KEEP</span>}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                    {c.email}{c.phone ? ` · ${c.phone}` : ''}{c.company_name ? ` · ${c.company_name}` : ''}
                                </p>
                                <div className="mt-1"><TagChips tags={c.tags} max={4} /></div>
                            </div>
                            <div className="text-right text-xs text-slate-400 hidden sm:block">
                                <p>{c.owner_name || 'Unassigned'}</p>
                                <p>Added {relativeDate(c.created_at)}</p>
                            </div>
                            {!isPrimary && (
                                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <input type="checkbox" className="accent-indigo-600" checked={selected.includes(c.prospect_id)}
                                        onChange={() => setSelected(s => s.includes(c.prospect_id) ? s.filter(x => x !== c.prospect_id) : [...s, c.prospect_id])} />
                                    Merge
                                </label>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="px-4 py-3 flex items-center justify-between gap-3 bg-white">
                <p className="text-xs text-slate-500">
                    Lists, campaigns, emails, activity and tasks move to the kept record. The others are removed.
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {group.pair_id && (
                        <SecondaryButton onClick={() => dismiss.mutate()} disabled={dismiss.isPending}>
                            <UserX className="w-4 h-4" /> Not the same person
                        </SecondaryButton>
                    )}
                    <PrimaryButton onClick={() => setReviewing(true)} disabled={!toMerge.length}>
                        <GitMerge className="w-4 h-4" /> Merge {toMerge.length || ''}
                    </PrimaryButton>
                </div>
            </div>
            {error && <div className="px-4 pb-3"><ErrorNote message={error} /></div>}
            {reviewing && (
                <MergePreviewModal primaryId={primaryId} duplicateIds={toMerge} onClose={() => setReviewing(false)}
                    onMerged={() => { setReviewing(false); onMerged(); }} />
            )}
        </div>
    );
}

export default function MergeDuplicatesModal({ onClose }) {
    const queryClient = useQueryClient();
    const { data, isLoading, refetch } = useQuery({ queryKey: ['contact-duplicates'], queryFn: contactsApi.duplicates });
    const groups = data?.groups || [];

    const onMerged = () => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['duplicate-pairs'] });
    };

    return (
        <Modal title="Find duplicates" subtitle="Same email, LinkedIn or phone, or a similar name (nicknames, initials, typos) at the same company"
            onClose={onClose} width="max-w-3xl"
            footer={<>
                <Link to="/app/contacts/duplicates" onClick={onClose} className="text-sm text-indigo-600 hover:text-indigo-800 self-center">
                    Open the duplicates review page
                </Link>
                <SecondaryButton onClick={onClose} className="ml-auto">Done</SecondaryButton>
            </>}>
            {isLoading ? (
                <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
            ) : groups.length === 0 ? (
                <div className="py-14 text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                    <p className="font-semibold text-slate-800">No duplicates found</p>
                    <p className="text-sm text-slate-500 mt-1">Every contact looks unique.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {groups.map(g => <DuplicateGroup key={g.pair_id || g.contacts.map(c => c.prospect_id).join()} group={g} onMerged={onMerged} />)}
                </div>
            )}
        </Modal>
    );
}
