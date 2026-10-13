import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { listsApi, errorMessage } from '../../api/contacts';
import { ErrorNote, Field, inputClass, Modal, PrimaryButton, SecondaryButton } from './shared';

/**
 * Rename a contact list or edit its description (PATCH /lists/{id}). Works for static,
 * active and uploaded lists; an active list's filter is edited on the Lists page.
 * `list` needs list_id and may carry list_name / description (else they are loaded).
 */
export default function ListRenameModal({ list, onClose, onSaved }) {
    const { data, isLoading } = useQuery({
        queryKey: ['list', list.list_id],
        queryFn: () => listsApi.get(list.list_id),
    });
    const [form, setForm] = useState({ list_name: list.list_name || '', description: list.description || '' });
    const [touched, setTouched] = useState(false);
    const [error, setError] = useState(null);

    // Fill in the stored values once loaded, unless the user already started typing
    useEffect(() => {
        if (data && !touched) setForm({ list_name: data.list_name || '', description: data.description || '' });
    }, [data, touched]);

    const set = key => e => { setTouched(true); setForm(f => ({ ...f, [key]: e.target.value })); };
    const name = form.list_name.trim();

    const save = useMutation({
        mutationFn: () => listsApi.update(list.list_id, { list_name: name, description: form.description.trim() }),
        onSuccess: saved => onSaved?.(saved),
        onError: err => setError(errorMessage(err)),
    });

    return (
        <Modal title="Rename list" subtitle="Change the list's name or description. Its contacts stay the same."
            onClose={onClose}
            footer={<>
                <SecondaryButton onClick={onClose} className="flex-1">Cancel</SecondaryButton>
                <PrimaryButton onClick={() => save.mutate()} loading={save.isPending} className="flex-1"
                    disabled={!name || name.length > 255 || form.description.length > 2000 || (isLoading && !touched)}>
                    Save
                </PrimaryButton>
            </>}>
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (name) save.mutate(); }}>
                <Field label="Name">
                    <input className={inputClass} value={form.list_name} onChange={set('list_name')} autoFocus
                        maxLength={255} aria-label="List name" placeholder="e.g. Q4 webinar invitees" />
                </Field>
                <Field label="Description" hint="Optional">
                    <textarea className={`${inputClass} h-20 py-2 resize-none`} value={form.description}
                        onChange={set('description')} maxLength={2000} aria-label="List description" />
                </Field>
                <ErrorNote message={error} />
            </form>
        </Modal>
    );
}
