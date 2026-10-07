import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { contactsApi, errorMessage } from '../../api/contacts';
import { getStoredUser } from '../../lib/authStorage';
import {
    CustomFieldInput, ErrorNote, Field, inputClass, Modal, OwnerSelect,
    PrimaryButton, SecondaryButton, TagInput,
} from './shared';

/** Manually add one contact. Company name links (or creates) the matching account. */
export default function ContactFormModal({
    onClose, onCreated, owners = [], fields = [], tagSuggestions = [], accountNames = [], lists = [],
    canAssign, defaults = {},
}) {
    const navigate = useNavigate();
    const me = getStoredUser();
    const [form, setForm] = useState({
        first_name: '', last_name: '', email: '', phone: '', mobile_phone: '', designation: '',
        company_name: '', linkedin_url: '', poc_city: '', poc_state: '', poc_country: '',
        owner_id: me?.user_id || null, list_id: '', tags: [], custom_fields: {},
        ...defaults,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [existingId, setExistingId] = useState(null);

    const set = (key) => (e) => setForm(f => ({ ...f, [key]: e?.target ? e.target.value : e }));

    const submit = async (e) => {
        e?.preventDefault();
        if (!form.email.trim()) { setError('Email is required'); return; }
        setSaving(true); setError(null); setExistingId(null);
        const payload = Object.fromEntries(
            Object.entries(form).filter(([k, v]) => !(typeof v === 'string' && !v.trim()) || k === 'owner_id')
        );
        if (!canAssign) delete payload.owner_id;
        const custom = Object.fromEntries(Object.entries(form.custom_fields).filter(([, v]) => v !== '' && v != null));
        if (Object.keys(custom).length) payload.custom_fields = custom; else delete payload.custom_fields;
        try {
            const contact = await contactsApi.create(payload);
            onCreated?.(contact);
        } catch (err) {
            setError(errorMessage(err, 'Could not add the contact.'));
            setExistingId(err?.response?.data?.detail?.prospect_id || null);
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
            <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="First name"><input className={inputClass} value={form.first_name} onChange={set('first_name')} autoFocus /></Field>
                    <Field label="Last name"><input className={inputClass} value={form.last_name} onChange={set('last_name')} /></Field>
                    <Field label="Email *" className="sm:col-span-2">
                        <input type="email" required className={inputClass} value={form.email} onChange={set('email')} placeholder="name@company.com" />
                    </Field>
                    <Field label="Phone"><input type="tel" className={inputClass} value={form.phone} onChange={set('phone')} placeholder="+1 415 555 0101" /></Field>
                    <Field label="Mobile"><input type="tel" className={inputClass} value={form.mobile_phone} onChange={set('mobile_phone')} /></Field>
                    <Field label="Job title"><input className={inputClass} value={form.designation} onChange={set('designation')} /></Field>
                    <Field label="Company" hint="Links to the account with this name, creating it if needed">
                        <input className={inputClass} value={form.company_name} onChange={set('company_name')} list="account-names" />
                        <datalist id="account-names">{accountNames.map(n => <option key={n} value={n} />)}</datalist>
                    </Field>
                    <Field label="City"><input className={inputClass} value={form.poc_city} onChange={set('poc_city')} /></Field>
                    <Field label="State"><input className={inputClass} value={form.poc_state} onChange={set('poc_state')} /></Field>
                    <Field label="Country"><input className={inputClass} value={form.poc_country} onChange={set('poc_country')} /></Field>
                    <Field label="LinkedIn"><input type="url" className={inputClass} value={form.linkedin_url} onChange={set('linkedin_url')} placeholder="https://linkedin.com/in/…" /></Field>
                    {canAssign && (
                        <Field label="Owner"><OwnerSelect owners={owners} value={form.owner_id} onChange={set('owner_id')} /></Field>
                    )}
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
                {fields.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {fields.map(f => (
                            <Field key={f.field_id} label={f.label}>
                                <CustomFieldInput field={f} value={form.custom_fields[f.field_key]}
                                    onChange={v => setForm(s => ({ ...s, custom_fields: { ...s.custom_fields, [f.field_key]: v } }))} />
                            </Field>
                        ))}
                    </div>
                )}
                <ErrorNote message={error} />
                {existingId && (
                    <button type="button" onClick={() => navigate(`/app/contacts/${existingId}`)}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                        Open the existing contact →
                    </button>
                )}
                <button type="submit" className="hidden" />
            </form>
        </Modal>
    );
}
