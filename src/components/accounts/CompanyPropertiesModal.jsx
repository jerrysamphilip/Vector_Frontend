import { companiesApi } from '../../api/accounts';
import PropertySettingsModal from '../contacts/PropertySettingsModal';

export const COMPANY_FIELDS_KEY = ['company-fields'];
const API = { list: companiesApi.fields, create: companiesApi.createField, update: companiesApi.updateField, remove: companiesApi.deleteField };

/** Define the extra properties every company in the workspace can have (C-16, C-17). Managers only. */
export default function CompanyPropertiesModal({ onClose, onChanged }) {
    return (
        <PropertySettingsModal title="Company properties" subtitle="Extra details you want to track on every company"
            noun="company" nounPlural="companies" api={API} queryKey={COMPANY_FIELDS_KEY}
            emptyText='No company properties yet. Add one below, e.g. "Tier" or "Contract renewal".'
            placeholders={{ label: 'e.g. Tier', choice: 'e.g. Gold' }} onClose={onClose} onChanged={onChanged} />
    );
}
