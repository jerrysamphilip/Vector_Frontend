import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { accountsApi, contactsApi, errorMessage } from '../../api/contacts';
import { ErrorNote, PrimaryButton, SecondaryButton, inputClass } from './shared';
import { useConfirm } from '../ui/ConfirmDialog';

const LABEL_SUGGESTIONS = ['Decision maker', 'Billing', 'Influencer', 'Champion', 'Technical contact', 'Former employee'];

/** Company search box for the add form: type to search, click a result to choose it. */
function CompanyPicker({ value, onChange, exclude }) {
    const [q, setQ] = useState('');
    const [debounced, setDebounced] = useState('');
    useEffect(() => { const t = setTimeout(() => setDebounced(q), 200); return () => clearTimeout(t); }, [q]);
    const { data, isFetching } = useQuery({
        queryKey: ['accounts', 'picker', debounced],
        queryFn: () => accountsApi.list({ q: debounced, page_size: 8, sort_by: 'name' }),
        enabled: !value,
    });
    if (value) {
        return (
            <div className="flex items-center justify-between gap-2 h-9 px-3 border border-slate-200 rounded-lg text-sm bg-slate-50">
                <span className="truncate font-medium text-slate-800">{value.name}</span>
                <button onClick={() => onChange(null)} className="text-slate-400 hover:text-slate-700" aria-label="Choose another company"><X className="w-3.5 h-3.5" /></button>
            </div>
        );
    }
    const items = (data?.items || []).filter(a => !exclude.includes(a.account_id));
    return (
        <div>
            <input className={inputClass} value={q} onChange={e => setQ(e.target.value)} placeholder="Search companies…" aria-label="Search companies" autoFocus />
            <ul className="mt-1 max-h-48 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-50">
                {items.map(a => (
                    <li key={a.account_id}>
                        <button onClick={() => onChange(a)} className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50">
                            <span className="font-medium text-slate-800">{a.name}</span>
                            {a.domain && <span className="text-xs text-slate-400"> · {a.domain}</span>}
                        </button>
                    </li>
                ))}
                {!items.length && <li className="px-3 py-2 text-xs text-slate-400">{isFetching ? 'Searching…' : 'No matching companies'}</li>}
            </ul>
        </div>
    );
}

function LabelInput({ value, onChange, id }) {
    return (
        <>
            <input className={inputClass} value={value} onChange={e => onChange(e.target.value)} maxLength={100}
                placeholder="Label, e.g. Decision maker" aria-label="Association label" list={id} />
            <datalist id={id}>{LABEL_SUGGESTIONS.map(l => <option key={l} value={l} />)}</datalist>
        </>
    );
}

/** Every company the contact is associated with, with its label and the primary one first (CM-014). */
export default function ContactCompaniesCard({ contact, onChanged, card, cardShadow }) {
    const confirm = useConfirm();
    const id = contact.prospect_id;
    const companies = contact.companies || [];
    const [adding, setAdding] = useState(false);
    const [picked, setPicked] = useState(null);
    const [label, setLabel] = useState('');
    const [makePrimary, setMakePrimary] = useState(false);
    const [editing, setEditing] = useState(null); // account_id
    const [editLabel, setEditLabel] = useState('');
    const [removing, setRemoving] = useState(null); // primary being removed: choose a successor
    const [successor, setSuccessor] = useState('');
    const [error, setError] = useState(null);

    const done = () => { setError(null); onChanged(); };
    const fail = err => setError(errorMessage(err));
    const add = useMutation({
        mutationFn: () => contactsApi.addCompany(id, { account_id: picked.account_id, label: label.trim() || undefined, make_primary: makePrimary }),
        onSuccess: () => { setAdding(false); setPicked(null); setLabel(''); setMakePrimary(false); done(); },
        onError: fail,
    });
    const update = useMutation({
        mutationFn: ({ accountId, payload }) => contactsApi.updateCompany(id, accountId, payload),
        onSuccess: () => { setEditing(null); done(); },
        onError: fail,
    });
    const remove = useMutation({
        mutationFn: ({ accountId, newPrimaryId }) => contactsApi.removeCompany(id, accountId, newPrimaryId),
        onSuccess: () => { setRemoving(null); setSuccessor(''); done(); },
        onError: fail,
    });

    const askRemove = (c) => {
        if (c.is_primary) {
            if (companies.length < 2) { setError("This is the contact's only company. Add another company first, or clear the Company field in Details."); return; }
            setRemoving(c.account_id);
            setSuccessor(companies.find(x => !x.is_primary)?.account_id || '');
            return;
        }
        confirm({ title: `Remove the association with ${c.name}?`, confirmLabel: 'Remove' }).then(ok => ok && remove.mutate({ accountId: c.account_id }));
    };

    return (
        <div className={card} style={cardShadow} data-testid="contact-companies">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-800">Companies{companies.length > 1 ? ` (${companies.length})` : ''}</h2>
                {!adding && <button onClick={() => { setAdding(true); setError(null); }} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>}
            </div>
            {companies.length === 0 && !adding && <p className="text-sm text-slate-400">Not linked to a company.</p>}
            <ul className="space-y-3">
                {companies.map(c => (
                    <li key={c.account_id} className="text-sm">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <Link to={`/app/accounts/${c.account_id}`} className="font-semibold text-indigo-600 hover:text-indigo-800 break-words">{c.name}</Link>
                                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                    {c.is_primary && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-600 text-white">Primary</span>}
                                    {c.label && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{c.label}</span>}
                                    {c.domain && <span className="text-xs text-slate-400">{c.domain}</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                {!c.is_primary && (
                                    <button onClick={() => update.mutate({ accountId: c.account_id, payload: { is_primary: true } })} title="Make primary"
                                        aria-label={`Make ${c.name} the primary company`} className="p-1 text-slate-400 hover:text-indigo-600"><Star className="w-3.5 h-3.5" /></button>
                                )}
                                <button onClick={() => { setEditing(c.account_id); setEditLabel(c.label || ''); }} title="Edit label"
                                    aria-label={`Edit label for ${c.name}`} className="p-1 text-slate-400 hover:text-indigo-600"><Pencil className="w-3.5 h-3.5" /></button>
                                <button onClick={() => askRemove(c)} title="Remove" aria-label={`Remove ${c.name}`} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>
                        {editing === c.account_id && (
                            <div className="mt-2 space-y-2">
                                <LabelInput value={editLabel} onChange={setEditLabel} id={`labels-${c.account_id}`} />
                                <div className="flex gap-2">
                                    <PrimaryButton className="h-8 px-3 text-xs" loading={update.isPending}
                                        onClick={() => update.mutate({ accountId: c.account_id, payload: { label: editLabel.trim() || null } })}><Check className="w-3.5 h-3.5" /> Save</PrimaryButton>
                                    <SecondaryButton className="h-8 px-3 text-xs" onClick={() => setEditing(null)}>Cancel</SecondaryButton>
                                </div>
                            </div>
                        )}
                        {removing === c.account_id && (
                            <div className="mt-2 space-y-2 p-2 rounded-lg bg-amber-50 border border-amber-100">
                                <p className="text-xs text-amber-800">{c.name} is the primary company. Choose the new primary company:</p>
                                <select className={inputClass} value={successor} onChange={e => setSuccessor(e.target.value)} aria-label="New primary company">
                                    {companies.filter(x => x.account_id !== c.account_id).map(x => <option key={x.account_id} value={x.account_id}>{x.name}</option>)}
                                </select>
                                <div className="flex gap-2">
                                    <PrimaryButton className="h-8 px-3 text-xs" loading={remove.isPending} disabled={!successor}
                                        onClick={() => remove.mutate({ accountId: c.account_id, newPrimaryId: successor })}>Remove</PrimaryButton>
                                    <SecondaryButton className="h-8 px-3 text-xs" onClick={() => setRemoving(null)}>Cancel</SecondaryButton>
                                </div>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
            {adding && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <CompanyPicker value={picked} onChange={setPicked} exclude={companies.map(c => c.account_id)} />
                    <LabelInput value={label} onChange={setLabel} id="labels-new" />
                    {companies.length > 0 && (
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                            <input type="checkbox" className="accent-indigo-600" checked={makePrimary} onChange={e => setMakePrimary(e.target.checked)} /> Make this the primary company
                        </label>
                    )}
                    <div className="flex gap-2">
                        <PrimaryButton className="h-8 px-3 text-xs" disabled={!picked} loading={add.isPending} onClick={() => add.mutate()}>Add company</PrimaryButton>
                        <SecondaryButton className="h-8 px-3 text-xs" onClick={() => { setAdding(false); setPicked(null); setLabel(''); }}>Cancel</SecondaryButton>
                    </div>
                </div>
            )}
            <ErrorNote message={error} />
        </div>
    );
}
