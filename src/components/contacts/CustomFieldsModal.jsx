import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, SlidersHorizontal } from 'lucide-react';
import { contactsApi, errorMessage } from '../../api/contacts';
import { ErrorNote, Field, inputClass, Modal, PrimaryButton, SecondaryButton } from './shared';

const TYPE_LABELS = { TEXT: 'Text', NUMBER: 'Number', DATE: 'Date', URL: 'Link', SELECT: 'Choice' };

/** Define the extra fields every contact in the workspace can have. */
export default function CustomFieldsModal({ onClose }) {
    const queryClient = useQueryClient();
    const { data: fields = [] } = useQuery({ queryKey: ['contact-fields'], queryFn: contactsApi.fields });
    const [label, setLabel] = useState('');
    const [type, setType] = useState('TEXT');
    const [options, setOptions] = useState('');
    const [error, setError] = useState(null);

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['contact-fields'] });

    const create = useMutation({
        mutationFn: () => contactsApi.createField({
            label: label.trim(),
            field_type: type,
            options: type === 'SELECT' ? options.split(',').map(o => o.trim()).filter(Boolean) : undefined,
        }),
        onSuccess: () => { setLabel(''); setOptions(''); setType('TEXT'); setError(null); refresh(); },
        onError: err => setError(errorMessage(err)),
    });
    const remove = useMutation({ mutationFn: contactsApi.deleteField, onSuccess: refresh });

    return (
        <Modal title="Custom fields" subtitle="Extra details you want to track on every contact" onClose={onClose}
            footer={<SecondaryButton onClick={onClose} className="ml-auto">Done</SecondaryButton>}>
            <div className="space-y-4">
                {fields.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-500">
                        <SlidersHorizontal className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                        No custom fields yet. Add one below, e.g. "Lead stage" or "Budget".
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl">
                        {fields.map(f => (
                            <div key={f.field_id} className="flex items-center gap-3 px-4 py-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800">{f.label}</p>
                                    <p className="text-xs text-slate-400">
                                        {TYPE_LABELS[f.field_type]}{f.options.length ? ` · ${f.options.join(', ')}` : ''}
                                    </p>
                                </div>
                                <button onClick={() => window.confirm(`Delete "${f.label}"? Values already saved on contacts will be hidden.`) && remove.mutate(f.field_id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" aria-label={`Delete ${f.label}`}>
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">New field</p>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
                        <Field label="Label"><input className={inputClass} value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Lead stage" /></Field>
                        <Field label="Type">
                            <select className={inputClass} value={type} onChange={e => setType(e.target.value)}>
                                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </Field>
                    </div>
                    {type === 'SELECT' && (
                        <Field label="Choices" hint="Separate with commas">
                            <input className={inputClass} value={options} onChange={e => setOptions(e.target.value)} placeholder="Lead, MQL, SQL, Customer" />
                        </Field>
                    )}
                    <ErrorNote message={error} />
                    <PrimaryButton onClick={() => create.mutate()} loading={create.isPending} disabled={!label.trim()}>
                        <Plus className="w-4 h-4" /> Add field
                    </PrimaryButton>
                </div>
            </div>
        </Modal>
    );
}
