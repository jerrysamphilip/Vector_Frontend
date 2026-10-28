import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Lock, Pencil, Plus, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { errorMessage } from '../../api/contacts';
import {
    TEXT_LIMITS, TYPE_LABELS, choicesOf, describeField, isChoiceType, isTextType, optionsPayload,
} from '../../lib/customProperties';
import { useConfirm } from '../ui/ConfirmDialog';
import { ErrorNote, Field, inputClass, Modal, PrimaryButton, SecondaryButton } from './shared';

const EMPTY = { label: '', field_type: 'TEXT', group_name: '', required: false, options: [{ label: '' }], max_length: '' };

function draftOf(field) {
    return {
        label: field.label, field_type: field.field_type, group_name: field.group_name || '', required: !!field.required,
        options: isChoiceType(field.field_type) ? choicesOf(field).map(c => ({ value: c.value, label: c.label })) : [{ label: '' }],
        max_length: field.max_length ?? '',
    };
}

/** '' or the message for the editor's max_length (blank = the type's default limit). */
function maxLengthError(draft) {
    if (!isTextType(draft.field_type) || draft.max_length === '' || draft.max_length == null) return '';
    const limit = TEXT_LIMITS[draft.field_type];
    const n = Number(draft.max_length);
    return Number.isInteger(n) && n >= 1 && n <= limit ? '' : `Enter a whole number from 1 to ${limit}`;
}

/** The POST / PATCH body for the editor; the data type is sent only when creating (it is fixed afterwards). */
function payloadOf(draft, creating) {
    const body = { label: draft.label.trim(), group_name: draft.group_name.trim() || null, required: draft.required };
    if (creating) body.field_type = draft.field_type;
    if (isChoiceType(draft.field_type)) body.options = optionsPayload(draft.options);
    if (isTextType(draft.field_type)) body.max_length = draft.max_length === '' ? null : Number(draft.max_length);
    return body;
}

function StatusTag({ icon: Icon, children, tone, title }) {
    return (
        <span title={title} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${tone}`}>
            <Icon className="w-3 h-3" aria-hidden="true" />{children}
        </span>
    );
}

/** Option rows of a choice property: rename a label (its stored value is kept), remove one, add new ones. */
function OptionsEditor({ options, onChange, placeholder }) {
    const set = (i, label) => onChange(options.map((o, j) => (j === i ? { ...o, label } : o)));
    return (
        <fieldset className="space-y-2">
            <legend className="block text-xs font-medium text-slate-600 mb-1.5">Choices</legend>
            {options.map((o, i) => (
                <div key={o.value ?? `new-${i}`} className="flex items-center gap-2">
                    <input className={inputClass} value={o.label} onChange={e => set(i, e.target.value)} maxLength={100}
                        aria-label={`Choice ${i + 1}`} placeholder={i === 0 ? placeholder : ''} />
                    {options.length > 1 && (
                        <button type="button" onClick={() => onChange(options.filter((_, j) => j !== i))} aria-label={`Remove choice ${o.label || i + 1}`}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><X className="w-4 h-4" /></button>
                    )}
                </div>
            ))}
            <button type="button" onClick={() => onChange([...options, { label: '' }])}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add choice
            </button>
            {options.some(o => o.value) && (
                <p className="text-xs text-gray-400">Renaming a choice keeps the values already saved. A removed choice stays on the records that have it.</p>
            )}
        </fieldset>
    );
}

function PropertyEditor({ draft, setDraft, editing, groups, placeholders }) {
    const set = key => e => setDraft(d => ({ ...d, [key]: e.target.value }));
    const lengthError = maxLengthError(draft);
    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_170px] gap-3">
                <Field label="Label"><input className={inputClass} value={draft.label} onChange={set('label')} maxLength={100} placeholder={placeholders.label} /></Field>
                <Field label="Type" hint={editing ? "Can't be changed after creation" : undefined}>
                    <select className={inputClass} value={draft.field_type} onChange={set('field_type')} disabled={editing}>
                        {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                <Field label="Group" hint="e.g. Sales, Compliance (optional)">
                    <input className={inputClass} value={draft.group_name} onChange={set('group_name')} list="property-groups" maxLength={100} />
                </Field>
                <datalist id="property-groups">{groups.map(g => <option key={g} value={g} />)}</datalist>
                <label className="flex items-center gap-2 text-sm text-slate-700 h-10">
                    <input type="checkbox" className="accent-indigo-600" checked={draft.required} onChange={e => setDraft(d => ({ ...d, required: e.target.checked }))} /> Required on create
                </label>
            </div>
            {isTextType(draft.field_type) && (
                <Field label="Maximum length" error={lengthError}
                    hint={`Characters, up to ${TEXT_LIMITS[draft.field_type].toLocaleString()}; leave blank for the default`}>
                    <input type="number" min={1} max={TEXT_LIMITS[draft.field_type]} className={inputClass} value={draft.max_length} onChange={set('max_length')} />
                </Field>
            )}
            {isChoiceType(draft.field_type) && (
                <OptionsEditor options={draft.options} onChange={options => setDraft(d => ({ ...d, options }))} placeholder={placeholders.choice} />
            )}
        </>
    );
}

/**
 * Settings for the custom properties of one object type (contacts or companies; C-16, C-17): the list with
 * inactive ones (GET ...?include_inactive=true), add, edit (label, group, choices, limit; the data type is fixed),
 * deactivate (DELETE: values are kept) and reactivate (PATCH is_active: true). System properties cannot be
 * deactivated.
 *   api: { list(params), create(body), update(id, body), remove(id) }
 *   queryKey: the property list's key; the settings list is [...queryKey, 'all'], so invalidating queryKey
 *   refreshes the forms' active list as well.
 */
export default function PropertySettingsModal({ title, subtitle, noun, nounPlural, api, queryKey, emptyText, placeholders, onClose, onChanged }) {
    const confirm = useConfirm();
    const queryClient = useQueryClient();
    const { data = [] } = useQuery({ queryKey: [...queryKey, 'all'], queryFn: () => api.list({ include_inactive: true }) });
    const fields = [...data].sort((a, b) => Number(a.is_active === false) - Number(b.is_active === false));
    const [editingId, setEditingId] = useState(null);
    const [draft, setDraft] = useState(EMPTY);
    const [error, setError] = useState(null);
    const editing = fields.find(f => f.field_id === editingId) || null;
    const groups = [...new Set(fields.map(f => f.group_name).filter(Boolean))];

    const reset = () => { setEditingId(null); setDraft(EMPTY); setError(null); };
    const refresh = () => { queryClient.invalidateQueries({ queryKey }); onChanged?.(); };
    const onError = err => setError(errorMessage(err));

    const save = useMutation({
        mutationFn: () => (editing ? api.update(editing.field_id, payloadOf(draft, false)) : api.create(payloadOf(draft, true))),
        onSuccess: () => { reset(); refresh(); },
        onError,
    });
    const deactivate = useMutation({ mutationFn: api.remove, onSuccess: () => { setError(null); refresh(); }, onError });
    const reactivate = useMutation({
        mutationFn: f => api.update(f.field_id, { label: f.label, group_name: f.group_name || null, required: !!f.required, is_active: true }),
        onSuccess: () => { setError(null); refresh(); },
        onError,
    });

    const startEdit = f => { setEditingId(f.field_id); setDraft(draftOf(f)); setError(null); };
    const askDeactivate = async f => {
        const ok = await confirm({
            title: `Deactivate "${f.label}"?`,
            message: `It is hidden from ${noun} forms, filters and imports. Values already saved on ${nounPlural} are kept and still exported; you can reactivate it at any time.`,
            confirmLabel: 'Deactivate', danger: true,
        });
        if (ok) deactivate.mutate(f.field_id);
    };
    const canSave = draft.label.trim() && !maxLengthError(draft)
        && (!isChoiceType(draft.field_type) || optionsPayload(draft.options).length > 0);

    return (
        <Modal title={title} subtitle={subtitle} onClose={onClose}
            footer={<SecondaryButton onClick={onClose} className="ml-auto">Done</SecondaryButton>}>
            <div className="space-y-4">
                {fields.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-500">
                        <SlidersHorizontal className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                        {emptyText}
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100 border border-slate-100 rounded-2xl" aria-label="Properties">
                        {fields.map(f => {
                            const inactive = f.is_active === false;
                            return (
                                <li key={f.field_id} className={`flex items-center gap-3 px-4 py-3 ${inactive ? 'bg-slate-50' : ''}`}>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold flex items-center gap-1.5 flex-wrap ${inactive ? 'text-slate-500' : 'text-slate-800'}`}>
                                            {f.label}
                                            {inactive && <StatusTag icon={Ban} tone="bg-slate-200 text-slate-600" title="Hidden from forms; saved values are kept">Inactive</StatusTag>}
                                            {f.is_system && <StatusTag icon={Lock} tone="bg-indigo-50 text-indigo-700" title="System properties can't be deactivated">System</StatusTag>}
                                        </p>
                                        <p className="text-xs text-slate-400">{describeField(f)}</p>
                                    </div>
                                    {inactive ? (
                                        <SecondaryButton onClick={() => reactivate.mutate(f)} disabled={reactivate.isPending} aria-label={`Reactivate ${f.label}`}>
                                            <RotateCcw className="w-3.5 h-3.5" /> Reactivate
                                        </SecondaryButton>
                                    ) : (
                                        <>
                                            <button type="button" onClick={() => startEdit(f)} aria-label={`Edit ${f.label}`}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                                            {!f.is_system && (
                                                <button type="button" onClick={() => askDeactivate(f)} aria-label={`Deactivate ${f.label}`}
                                                    className="h-8 px-2.5 text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg inline-flex items-center gap-1">
                                                    <Ban className="w-3.5 h-3.5" /> Deactivate
                                                </button>
                                            )}
                                        </>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}

                <div className="p-4 bg-slate-50 rounded-2xl space-y-3" aria-label={editing ? `Edit ${editing.label}` : 'New property'} role="group">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{editing ? `Edit "${editing.label}"` : 'New property'}</p>
                    <PropertyEditor key={editingId || 'new'} draft={draft} setDraft={setDraft} editing={!!editing} groups={groups} placeholders={placeholders} />
                    <ErrorNote message={error} />
                    <div className="flex gap-2">
                        <PrimaryButton onClick={() => save.mutate()} loading={save.isPending} disabled={!canSave}>
                            {editing ? 'Save property' : <><Plus className="w-4 h-4" /> Add property</>}
                        </PrimaryButton>
                        {editing && <SecondaryButton onClick={reset}>Cancel</SecondaryButton>}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
