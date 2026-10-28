import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { contactsApi, errorMessage } from '../../api/contacts';
import { getStoredUser } from '../../lib/authStorage';
import { CONTACT_FIELDS } from '../../lib/fieldValidation';
import { useFieldErrors } from '../../lib/useFieldErrors';
import {
    CountryOptions, CustomFieldInput, ErrorNote, Field, inputClass, Modal, OwnerSelect,
    PrimaryButton, SecondaryButton, TagInput, useCrmMeta,
} from './shared';

/** Manually add one contact. Company name links (or creates) the matching account. */
export default function ContactFormModal({
    onClose, onCreated, owners = [], fields = [], tagSuggestions = [], accountNames = [], lists = [],
    canAssign, defaults = {},
}) {
    const navigate = useNavigate();
    const me = getStoredUser();
    const { meta } = useCrmMeta();
    const [form, setForm] = useState({
        lifecycle_stage: 'LEAD', lead_status: 'NEW', lead_source: '', legal_basis: '',
        first_name: '', last_name: '', email: '', phone: '', mobile_phone: '', designation: '',
        company_name: '', linkedin_url: '', poc_city: '', poc_state: '', poc_country: '',
        owner_id: me?.user_id || null, list_id: '', tags: [], custom_fields: {},
        ...defaults,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [existingId, setExistingId] = useState(null);
    const [existingDeleted, setExistingDeleted] = useState(false);

    const set = (key) => (e) => setForm(f => ({ ...f, [key]: e?.target ? e.target.value : e }));
    // F-07 / F-08: inline rules per field; the server checks again and its 422 field errors land on the fields too
    const checks = useFieldErrors(CONTACT_FIELDS, form, setForm);

    const submit = async (e) => {
        e?.preventDefault();
        if (!checks.validate()) { setError(null); return; }
        setSaving(true); setError(null); setExistingId(null); setExistingDeleted(false);
        const payload = Object.fromEntries(
            Object.entries(checks.normalized()).filter(([k, v]) => !(typeof v === 'string' && !v.trim()) || k === 'owner_id')
        );
        if (!canAssign) delete payload.owner_id;
        const custom = Object.fromEntries(Object.entries(form.custom_fields).filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && !v.length)));
        if (Object.keys(custom).length) payload.custom_fields = custom; else delete payload.custom_fields;
        try {
            const contact = await contactsApi.create(payload);
            onCreated?.(contact);
        } catch (err) {
            checks.fromServer(err);
            setError(errorMessage(err, 'Could not add the contact.'));
            setExistingId(err?.response?.data?.detail_data?.prospect_id || null);
            setExistingDeleted(!!err?.response?.data?.detail_data?.deleted);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            title="Add contact"
            subtitle="Create a single contact without uploading a file"
            onClose={onClose}
            width="max-w-2xl"
            footer={<>
                <SecondaryButton onClick={onClose} className="flex-1">Cancel</SecondaryButton>
                <PrimaryButton onClick={submit} loading={saving} className="flex-1">
                    <UserPlus className="w-4 h-4" /> Add contact
                </PrimaryButton>
            </>}
        >
            <form ref={checks.formRef} onSubmit={submit} noValidate className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="First name" error={checks.errors.first_name}><input className={inputClass} {...checks.bind('first_name')} autoComplete="given-name" autoFocus /></Field>
                    <Field label="Last name" error={checks.errors.last_name}><input className={inputClass} {...checks.bind('last_name')} autoComplete="family-name" /></Field>
                    <Field label="Email *" className="sm:col-span-2" error={checks.errors.email}>
                        <input type="email" required className={inputClass} {...checks.bind('email')} placeholder="name@company.com" />
                    </Field>
                    <Field label="Phone" error={checks.errors.phone}><input type="tel" className={inputClass} {...checks.bind('phone')} placeholder="+44 20 7946 0958" /></Field>
                    <Field label="Mobile" error={checks.errors.mobile_phone}><input type="tel" className={inputClass} {...checks.bind('mobile_phone')} /></Field>
                    <Field label="Job title" error={checks.errors.designation}><input className={inputClass} {...checks.bind('designation')} /></Field>
                    <Field label="Company" hint="Links to the account with this name, creating it if needed" error={checks.errors.company_name}>
                        <input className={inputClass} {...checks.bind('company_name')} list="account-names" />
                        <datalist id="account-names">{accountNames.map(n => <option key={n} value={n} />)}</datalist>
                    </Field>
                    <Field label="City" error={checks.errors.poc_city}><input className={inputClass} {...checks.bind('poc_city')} /></Field>
                    <Field label="State" error={checks.errors.poc_state}><input className={inputClass} {...checks.bind('poc_state')} /></Field>
                    <Field label="Country" error={checks.errors.poc_country}><input className={inputClass} {...checks.bind('poc_country')} list="country-names" /></Field><CountryOptions />
                    <Field label="LinkedIn" error={checks.errors.linkedin_url}><input type="url" className={inputClass} {...checks.bind('linkedin_url')} placeholder="https://linkedin.com/in/…" /></Field>
                    {canAssign && (
                        <Field label="Owner"><OwnerSelect owners={owners} value={form.owner_id} onChange={set('owner_id')} /></Field>
                    )}
                    <Field label="Lifecycle stage">
                        <select className={inputClass} value={form.lifecycle_stage} onChange={set('lifecycle_stage')}>
                            {(meta?.lifecycle_stages || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Lead status">
                        <select className={inputClass} value={form.lead_status} onChange={set('lead_status')}>
                            {(meta?.lead_statuses || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Lead source" error={checks.errors.lead_source}><input className={inputClass} {...checks.bind('lead_source')} placeholder="e.g. Trade show" /></Field>
                    <Field label="Legal basis">
                        <select className={inputClass} value={form.legal_basis} onChange={set('legal_basis')}>
                            <option value="">Not recorded</option>
                            {(meta?.legal_bases || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </Field>
                    {lists.length > 0 && (
                        <Field label="Add to list">
                            <select className={inputClass} value={form.list_id} onChange={set('list_id')}>
                                <option value="">None</option>
                                {lists.map(l => <option key={l.list_id} value={l.list_id}>{l.list_name}</option>)}
                            </select>
                        </Field>
                    )}
                </div>
                <Field label="Tags"><TagInput value={form.tags} onChange={set('tags')} suggestions={tagSuggestions} /></Field>
                {Object.entries(fields.reduce((groups, f) => {
                    (groups[f.group_name || 'Other properties'] ||= []).push(f);
                    return groups;
                }, {})).map(([group, groupFields]) => (
                    <div key={group} className="pt-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">{group}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {groupFields.map(f => (
                                <Field key={f.field_id} label={`${f.label}${f.required ? ' *' : ''}`}>
                                    <CustomFieldInput field={f} value={form.custom_fields[f.field_key]}
                                        onChange={v => setForm(s => ({ ...s, custom_fields: { ...s.custom_fields, [f.field_key]: v } }))} />
                                </Field>
                            ))}
                        </div>
                    </div>
                ))}
                <ErrorNote message={error} />
                {existingId && (
                    <button type="button" onClick={() => navigate(existingDeleted ? '/app/recently-deleted' : `/app/contacts/${existingId}`)}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                        {existingDeleted ? 'Open Recently deleted →' : 'Open the existing contact →'}
                    </button>
                )}
                <button type="submit" className="hidden" />
            </form>
        </Modal>
    );
}
