import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { companiesApi } from '../../api/accounts';
import { errorMessage } from '../../api/contacts';
import { useConfirm } from '../ui/ConfirmDialog';
import { ErrorNote, Field, inputClass, Modal, PrimaryButton, SecondaryButton } from '../contacts/shared';

const TYPE_LABELS = { TEXT: 'Text', NUMBER: 'Number', DATE: 'Date', SELECT: 'Dropdown', RADIO: 'Radio select', MULTI_CHECKBOX: 'Multiple checkboxes', PHONE: 'Phone number', URL: 'Link' };
const CHOICE_TYPES = ['SELECT', 'RADIO', 'MULTI_CHECKBOX'];
export const COMPANY_FIELDS_KEY = ['company-fields'];

/** Define the extra properties every company in the workspace can have (C-16). Managers only. */
export default function CompanyPropertiesModal({ onClose, onChanged }) {
    const queryClient = useQueryClient();
    const { data: fields = [] } = useQuery({ queryKey: COMPANY_FIELDS_KEY, queryFn: companiesApi.fields });
    const [label, setLabel] = useState('');
    const [type, setType] = useState('TEXT');
    const [options, setOptions] = useState('');
    const [group, setGroup] = useState('');
    const [required, setRequired] = useState(false);
    const [error, setError] = useState(null);

    const refresh = () => { queryClient.invalidateQueries({ queryKey: COMPANY_FIELDS_KEY }); onChanged?.(); };
    const create = useMutation({
        mutationFn: () => companiesApi.createField({
            label: label.trim(), field_type: type, group_name: group.trim() || null, required,
            options: CHOICE_TYPES.includes(type) ? options.split(',').map(o => o.trim()).filter(Boolean) : undefined,
        }),
        onSuccess: () => { setLabel(''); setOptions(''); setType('TEXT'); setRequired(false); setError(null); refresh(); },
        onError: err => setError(errorMessage(err)),
    });
    const confirm = useConfirm();
    const remove = useMutation({ mutationFn: companiesApi.deleteField, onSuccess: refresh, onError: err => setError(errorMessage(err)) });

    return (
        <Modal title="Company properties" subtitle="Extra details you want to track on every company" onClose={onClose}
            footer={<SecondaryButton onClick={onClose} className="ml-auto">Done</SecondaryButton>}>
            <div className="space-y-4">
                {fields.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-500">
                        <SlidersHorizontal className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                        No company properties yet. Add one below, e.g. "Tier" or "Contract renewal".
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl">
                        {fields.map(f => (
                            <div key={f.field_id} className="flex items-center gap-3 px-4 py-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800">{f.label}</p>
                                    <p className="text-xs text-slate-400">
                                        {f.group_name ? `${f.group_name} · ` : ''}{TYPE_LABELS[f.field_type] || f.field_type}{f.options?.length ? ` · ${f.options.join(', ')}` : ''}{f.required ? ' · required' : ''}
                                    </p>
                                </div>
                                <button onClick={async () => { if (await confirm({ title: `Delete "${f.label}"?`, message: 'Values already saved on companies will be hidden.', confirmLabel: 'Delete', danger: true })) remove.mutate(f.field_id); }}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" aria-label={`Delete ${f.label}`}>
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">New property</p>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
                        <Field label="Label"><input className={inputClass} value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Tier" /></Field>
                        <Field label="Type">
                            <select className={inputClass} value={type} onChange={e => setType(e.target.value)}>
                                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </Field>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                        <Field label="Group" hint="optional"><input className={inputClass} value={group} onChange={e => setGroup(e.target.value)} /></Field>
                        <label className="flex items-center gap-2 text-sm text-slate-700 h-10"><input type="checkbox" className="accent-indigo-600" checked={required} onChange={e => setRequired(e.target.checked)} /> Required on create</label>
                    </div>
                    {CHOICE_TYPES.includes(type) && (
                        <Field label="Choices" hint="Separate with commas">
                            <input className={inputClass} value={options} onChange={e => setOptions(e.target.value)} placeholder="Gold, Silver, Bronze" />
                        </Field>
                    )}
                    <ErrorNote message={error} />
                    <PrimaryButton onClick={() => create.mutate()} loading={create.isPending} disabled={!label.trim()}>
                        <Plus className="w-4 h-4" /> Add property
                    </PrimaryButton>
                </div>
            </div>
        </Modal>
    );
}
