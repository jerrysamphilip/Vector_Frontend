import { contactsApi } from '../../api/contacts';
import PropertySettingsModal from './PropertySettingsModal';

export const CONTACT_FIELDS_KEY = ['contact-fields'];
const API = { list: contactsApi.fields, create: contactsApi.createField, update: contactsApi.updateField, remove: contactsApi.deleteField };

/** Define the extra fields every contact in the workspace can have (BR-CM-09/10, C-17). */
export default function CustomFieldsModal({ onClose, onChanged }) {
    return (
        <PropertySettingsModal title="Contact properties" subtitle="Extra details you want to track on every contact"
            noun="contact" nounPlural="contacts" api={API} queryKey={CONTACT_FIELDS_KEY}
            emptyText='No custom fields yet. Add one below, e.g. "Lead stage" or "Budget".'
            placeholders={{ label: 'e.g. Lead stage', choice: 'e.g. MQL' }} onClose={onClose} onChanged={onChanged} />
    );
}
