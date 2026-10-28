// Columns and filter fields of the companies table (F-14). Keys match the backend's ACCOUNT_COLUMNS
// (app/domain/accounts.py) and the export's `columns` parameter; custom properties are `custom.<field_key>`.

export const BASE_COLUMNS = [
    { key: 'name', label: 'Company', sort: 'name' },
    { key: 'domain', label: 'Domain' },
    { key: 'industry', label: 'Industry' },
    { key: 'emp_band', label: 'Employees' },
    { key: 'location', label: 'Location' },
    { key: 'country', label: 'Country' },
    { key: 'phone', label: 'Phone' },
    { key: 'website', label: 'Website' },
    { key: 'lifecycle_stage', label: 'Stage' },
    { key: 'annual_revenue', label: 'Revenue', sort: 'annual_revenue' },
    { key: 'contact_count', label: 'Contacts', sort: 'contacts' },
    { key: 'owner_name', label: 'Owner' },
    { key: 'created_at', label: 'Created', sort: 'created_at' },
    { key: 'updated_at', label: 'Updated', sort: 'updated_at' },
];

export const DEFAULT_COLUMNS = ['name', 'industry', 'location', 'lifecycle_stage', 'annual_revenue', 'contact_count', 'owner_name', 'updated_at'];

// Table-only columns map to the export columns they are made of
const EXPORT_KEYS = { location: ['city', 'country'] };

export const COLUMNS_KEY = 'companies.columns';

export function readColumns() {
    try {
        const stored = JSON.parse(localStorage.getItem(COLUMNS_KEY));
        return Array.isArray(stored) && stored.includes('name') ? stored : DEFAULT_COLUMNS;
    } catch {
        return DEFAULT_COLUMNS;
    }
}

export function storeColumns(columns) {
    try { localStorage.setItem(COLUMNS_KEY, JSON.stringify(columns)); } catch { /* private mode: not remembered */ }
}

/** Every column the table can show: the built-in ones plus one per company custom property. */
export function availableColumns(properties = []) {
    return [...BASE_COLUMNS, ...properties.map(p => ({ key: `custom.${p.field_key}`, label: p.label, property: p }))];
}

/** The export's `columns` parameter for the shown columns (custom properties are always exported). */
export function exportColumns(columns) {
    const keys = columns.flatMap(c => EXPORT_KEYS[c] || [c]).filter(c => !c.startsWith('custom.'));
    return [...new Set(keys)].join(',');
}

// Fields the company filter offers; `type` picks the operators (see CompanyFilters.jsx)
export function filterFields(properties = [], stages = []) {
    const base = [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'domain', label: 'Domain', type: 'text' },
        { key: 'industry', label: 'Industry', type: 'text' },
        { key: 'emp_band', label: 'Employees', type: 'text' },
        { key: 'city', label: 'City', type: 'text' },
        { key: 'country', label: 'Country', type: 'text' },
        { key: 'lifecycle_stage', label: 'Lifecycle stage', type: 'enum', options: stages.map(s => [s.value, s.label]) },
        { key: 'owner_id', label: 'Owner', type: 'enum', options: [['me', 'Me']] },
        { key: 'annual_revenue', label: 'Annual revenue', type: 'number' },
    ];
    const custom = properties.map(p => ({
        key: `custom.${p.field_key}`,
        label: p.label,
        type: { NUMBER: 'number', DATE: 'date', SELECT: 'enum', RADIO: 'enum', MULTI_CHECKBOX: 'enum' }[p.field_type] || 'text',
        options: p.options?.length ? p.options.map(o => [o, o]) : undefined,
    }));
    return [...base, ...custom];
}

export const OPERATORS = {
    text: [['contains', 'contains'], ['is', 'is'], ['is_not', 'is not'], ['starts_with', 'starts with'], ['is_empty', 'is empty'], ['is_not_empty', 'is known']],
    enum: [['is', 'is'], ['is_not', 'is not'], ['is_empty', 'is empty'], ['is_not_empty', 'is known']],
    number: [['gt', 'greater than'], ['lt', 'less than'], ['is', 'equals'], ['is_empty', 'is empty'], ['is_not_empty', 'is known']],
    date: [['after', 'after'], ['before', 'before'], ['is_empty', 'is empty'], ['is_not_empty', 'is known']],
};
export const NO_VALUE = new Set(['is_empty', 'is_not_empty']);
