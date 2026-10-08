import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GitMerge, CheckCircle2, Loader2 } from 'lucide-react';
import { contactsApi, errorMessage } from '../../api/contacts';
import { Avatar, ErrorNote, Modal, PrimaryButton, SecondaryButton, TagChips, relativeDate } from './shared';

// Properties the API lets you pick per record (BR-CM-33)
const CHOOSABLE = [
    ['email', 'Email'], ['phone', 'Phone'], ['mobile_phone', 'Mobile'], ['first_name', 'First name'], ['last_name', 'Last name'],
    ['designation', 'Job title'], ['company_name', 'Company'], ['owner_id', 'Owner', 'owner_name'], ['lifecycle_stage', 'Lifecycle stage'],
    ['lead_status', 'Lead status'], ['lead_source', 'Lead source'], ['industry', 'Industry'], ['linkedin_url', 'LinkedIn'],
    ['poc_city', 'City'], ['poc_state', 'State'], ['poc_country', 'Country'], ['legal_basis', 'Legal basis'],
];

function PropertyChooser({ contacts, merging, primaryId, choices, setChoices }) {
    const rows = useMemo(() => CHOOSABLE.filter(([key]) => {
        const values = new Set(contacts.filter(c => merging.includes(c.prospect_id)).map(c => c[key] || ''));
        values.delete('');
        return values.size > 1;
    }), [contacts, merging]);
    if (!rows.length) return <p className="text-xs text-slate-500 px-4 py-2">No conflicting values: blanks on the kept record are filled from the others.</p>;
    const involved = contacts.filter(c => merging.includes(c.prospect_id));
    return (
        <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-2">Choose the value to keep where the records differ</p>
            <table className="w-full text-sm">
                <tbody>
                    {rows.map(([key, label, display]) => {
                        const chosen = choices[key] || primaryId;
                        return (
                            <tr key={key} className="border-t border-slate-100 first:border-0">
                                <td className="py-1.5 pr-3 text-xs font-semibold text-slate-500 w-28 align-top">{label}</td>
                                {involved.map(c => (
                                    <td key={c.prospect_id} className="py-1.5 pr-3 align-top">
                                        {c[key] ? (
                                            <label className="flex items-start gap-1.5 text-slate-700">
                                                <input type="radio" className="accent-indigo-600 mt-1" name={`${key}-${involved[0].prospect_id}`} checked={chosen === c.prospect_id}
                                                    onChange={() => setChoices(ch => ({ ...ch, [key]: c.prospect_id }))} />
                                                <span className="break-all">{c[display || key]}</span>
                                            </label>
                                        ) : <span className="text-slate-300 pl-5">—</span>}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function DuplicateGroup({ group, onMerged }) {
    const contacts = group.contacts;
    const [primaryId, setPrimaryId] = useState(contacts[0].prospect_id);
    const [selected, setSelected] = useState(contacts.map(c => c.prospect_id));
    const [choices, setChoices] = useState({});
    const [error, setError] = useState(null);

    const merge = useMutation({
        mutationFn: () => {
            const merging = selected.filter(id => id !== primaryId);
            const picked = Object.fromEntries(Object.entries(choices).filter(([, id]) => id !== primaryId && merging.includes(id)));
            return contactsApi.merge(primaryId, merging, picked);
        },
        onSuccess: onMerged,
        onError: err => setError(errorMessage(err, 'Merge failed.')),
    });

    const toMerge = selected.filter(id => id !== primaryId);

    return (
        <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{group.reasons.join(' · ')}</span>
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
            {toMerge.length > 0 && <PropertyChooser contacts={contacts} merging={[primaryId, ...toMerge]} primaryId={primaryId} choices={choices} setChoices={setChoices} />}
            <div className="px-4 py-3 flex items-center justify-between gap-3 bg-white">
                <p className="text-xs text-slate-500">
                    Lists, campaigns, emails, activity and tasks move to the kept record. The others are removed.
                </p>
                <PrimaryButton onClick={() => merge.mutate()} loading={merge.isPending} disabled={!toMerge.length} className="flex-shrink-0">
                    <GitMerge className="w-4 h-4" /> Merge {toMerge.length || ''}
                </PrimaryButton>
            </div>
            {error && <div className="px-4 pb-3"><ErrorNote message={error} /></div>}
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
    };

    return (
        <Modal title="Find duplicates" subtitle="Same email (ignoring case and dots), similar name at the same company, or the same phone number"
            onClose={onClose} width="max-w-3xl"
            footer={<SecondaryButton onClick={onClose} className="ml-auto">Done</SecondaryButton>}>
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
                    {groups.map(g => <DuplicateGroup key={g.contacts.map(c => c.prospect_id).join()} group={g} onMerged={onMerged} />)}
                </div>
            )}
        </Modal>
    );
}
