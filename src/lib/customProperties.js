// Custom properties of contacts and companies (BR-CM-09/10, C-16, C-17). Pure helpers, no React.
//
// A definition from GET /contacts/fields or /accounts/fields carries `options` (the stored values, what records
// hold) and `choices` ([{ value, label }], what people see). Pickers and filters show the label and submit the
// value; older responses without `choices` fall back to the options (value == label).
// The data type is fixed once created; TEXT / LONG_TEXT may have a `max_length` up to the type's limit
// (backend app/domain/custom_properties.py TEXT_LIMITS).

export const TYPE_LABELS = {
    TEXT: 'Text', LONG_TEXT: 'Long text', NUMBER: 'Number', DATE: 'Date', BOOLEAN: 'Yes / No',
    SELECT: 'Dropdown', RADIO: 'Radio select', MULTI_CHECKBOX: 'Multiple checkboxes', PHONE: 'Phone number', URL: 'Link',
};
export const CHOICE_TYPES = ['SELECT', 'RADIO', 'MULTI_CHECKBOX'];
export const TEXT_LIMITS = { TEXT: 1000, LONG_TEXT: 10000 };
export const BOOLEAN_CHOICES = [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }];

export const isChoiceType = type => CHOICE_TYPES.includes(type);
export const isTextType = type => type in TEXT_LIMITS;
export const isActiveField = field => field?.is_active !== false;
export const activeFields = (fields = []) => fields.filter(isActiveField);

/** [{ value, label }] of a choice property: `choices`, else the plain `options` (value == label). */
export function choicesOf(field) {
    if (Array.isArray(field?.choices) && field.choices.length) return field.choices;
    return (field?.options || []).map(o => (typeof o === 'string'
        ? { value: o, label: o }
        : { value: o.value ?? o.label, label: o.label ?? o.value }));
}

/** The label people see for one stored choice value (the value itself when it is not an option). */
export function choiceLabel(field, value) {
    const match = choicesOf(field).find(c => c.value === value);
    return match ? match.label : String(value);
}

/** true / false for a BOOLEAN value as stored or typed; null when unset or unreadable. */
export function booleanValue(value) {
    if (value === true || value === false) return value;
    const text = String(value ?? '').trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(text)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(text)) return false;
    return null;
}

/** The character limit for a text property value (its max_length, else the type's limit); null for other types. */
export function maxLengthOf(field) {
    if (!isTextType(field?.field_type)) return null;
    return field.max_length || TEXT_LIMITS[field.field_type];
}

/** '' or the message for one value (the client-side checks; the server checks again and answers 400). */
export function customValueError(field, value) {
    const limit = maxLengthOf(field);
    if (limit && typeof value === 'string' && value.trim().length > limit) {
        return `${field.label} must be at most ${limit} characters`;
    }
    return '';
}

/** { field_key: message } for the invalid values of `fields` in `values`. */
export function customFieldErrors(fields = [], values = {}) {
    return Object.fromEntries(fields
        .map(f => [f.field_key, customValueError(f, values?.[f.field_key])])
        .filter(([, message]) => message));
}

/** Filter-builder type and [value, label] options of a property (BOOLEAN filters as Yes / No). */
export function filterSpecOf(field) {
    const type = { NUMBER: 'number', DATE: 'date', SELECT: 'enum', RADIO: 'enum', MULTI_CHECKBOX: 'enum', BOOLEAN: 'enum' }[field.field_type] || 'text';
    const choices = field.field_type === 'BOOLEAN' ? BOOLEAN_CHOICES : isChoiceType(field.field_type) ? choicesOf(field) : [];
    return { type, options: choices.length ? choices.map(c => [c.value, c.label]) : undefined };
}

/**
 * The `options` to send for edited option rows ({ value?, label }): existing options as { value, label } so a
 * renamed label keeps its stored value, new ones (no value yet) as their label text. Blank rows are dropped.
 */
export function optionsPayload(rows = []) {
    return rows
        .map(r => ({ ...r, label: String(r.label ?? '').trim() }))
        .filter(r => r.label)
        .map(r => (r.value ? { value: r.value, label: r.label } : r.label));
}

/** "Gold, Silver" -> option rows without values (new options). */
export function parseOptionList(text) {
    return String(text || '').split(',').map(s => s.trim()).filter(Boolean).map(label => ({ label }));
}

/** A one-line summary of a definition for the settings list. */
export function describeField(field) {
    const parts = [];
    if (field.group_name) parts.push(field.group_name);
    parts.push(TYPE_LABELS[field.field_type] || field.field_type);
    if (isChoiceType(field.field_type)) {
        const labels = choicesOf(field).map(c => c.label);
        if (labels.length) parts.push(labels.join(', '));
    }
    if (field.max_length) parts.push(`max ${field.max_length} characters`);
    if (field.required) parts.push('required');
    return parts.join(' · ');
}
