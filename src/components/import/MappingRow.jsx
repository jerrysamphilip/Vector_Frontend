import { inputClass } from '../contacts/shared';

export const NEW_TYPES = { TEXT: 'Text', NUMBER: 'Number', DATE: 'Date', SELECT: 'Dropdown', MULTI_CHECKBOX: 'Multiple checkboxes', PHONE: 'Phone', URL: 'Link' };

/** Column → property picker; "Create new property" asks for a type and label (BR-CM-26). */
export default function MappingRow({ header, sample, value, targets, onChange }) {
    const isNew = value?.startsWith('new:');
    const parts = isNew ? value.split(':') : [];
    const newType = parts[1] || 'TEXT';
    const label = isNew ? parts.slice(2).join(':') : header;
    return (
        <tr className="border-t border-slate-100 align-top">
            <td className="py-2.5 pr-3">
                <p className="text-sm font-semibold text-slate-800">{header}</p>
                <p className="text-xs text-slate-400 truncate max-w-[220px]">{sample.filter(v => v != null && v !== '').slice(0, 3).join(' · ') || 'empty'}</p>
            </td>
            <td className="py-2.5">
                <select className={inputClass} aria-label={`Import ${header} as`} value={isNew ? '__new__' : value || 'skip'}
                    onChange={e => onChange(e.target.value === '__new__' ? `new:TEXT:${header}` : e.target.value)}>
                    <option value="skip">Don’t import</option>
                    <optgroup label="Contact">{targets.contact.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</optgroup>
                    <optgroup label="Company">{targets.company.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</optgroup>
                    {targets.custom.length > 0 && <optgroup label="Custom properties">{targets.custom.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</optgroup>}
                    <option value="__new__">+ Create new property…</option>
                </select>
                {isNew && (
                    <div className="grid grid-cols-[1fr_150px] gap-2 mt-2">
                        <input className={inputClass} value={label} placeholder="Property label" aria-label="New property label"
                            onChange={e => onChange(`new:${newType}:${e.target.value}`)} />
                        <select className={inputClass} value={newType} aria-label="New property type" onChange={e => onChange(`new:${e.target.value}:${label}`)}>
                            {Object.entries(NEW_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                )}
            </td>
        </tr>
    );
}

/** What blocks an import with this mapping (shown as warnings; empty when it can run). */
export function mappingProblems(mapping) {
    const mapped = Object.values(mapping);
    const hasEmail = mapped.includes('contact.email');
    const hasCompany = mapped.some(t => ['company.name', 'company.domain', 'company.website'].includes(t));
    const problems = [];
    if (!hasEmail && !hasCompany) problems.push('Map an Email column or a Company name/domain column.');
    // Contact properties (and custom properties) are matched on email: without an Email column they can't be imported
    const orphans = hasEmail ? [] : Object.keys(mapping).filter(h => /^(contact\.|custom\.|new:)/.test(mapping[h] || ''));
    if (orphans.length) problems.push(`Contact properties need an Email column to match contacts. Map an Email column, or set ${orphans.map(h => `“${h}”`).join(', ')} to a Company field or Skip.`);
    return { problems, hasEmail, hasCompany };
}
