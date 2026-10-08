import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, X, Layers } from 'lucide-react';
import { contactsApi } from '../../api/contacts';

/**
 * AND / OR filter builder (BR-CM-18). Value shape matches the API:
 *   { op: 'AND'|'OR', conditions: [ {field, operator, value} | {op, conditions: [...]} ] }
 * One level of nested groups, e.g. "stage is Lead AND (country is US OR tag is Hot)".
 */

const OPERATORS = {
    text: [['contains', 'contains'], ['is', 'is'], ['is_not', 'is not'], ['starts_with', 'starts with'],
        ['not_contains', "doesn't contain"], ['is_empty', 'is empty'], ['is_not_empty', 'is known']],
    enum: [['is', 'is'], ['is_not', 'is not'], ['is_empty', 'is empty'], ['is_not_empty', 'is known']],
    number: [['gt', 'greater than'], ['lt', 'less than'], ['is', 'equals'], ['is_empty', 'is empty'], ['is_not_empty', 'is known']],
    date: [['in_last_days', 'in the last (days)'], ['after', 'after'], ['before', 'before'], ['is_empty', 'is empty'], ['is_not_empty', 'is known']],
    tags: [['is', 'has tag'], ['is_not', "doesn't have tag"], ['is_empty', 'has no tags'], ['is_not_empty', 'has any tag']],
    list: [['is', 'is in list'], ['is_not', 'is not in list']],
    boolean: [['is', 'is']],
};
const NO_VALUE = new Set(['is_empty', 'is_not_empty']);
const selectClass = 'h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-400';

export function useFilterFields() {
    const { data: meta } = useQuery({ queryKey: ['contact-meta'], queryFn: contactsApi.meta, staleTime: 300000 });
    const { data: fields = [] } = useQuery({ queryKey: ['contact-fields'], queryFn: contactsApi.fields });
    const { data: owners = [] } = useQuery({ queryKey: ['contact-owners'], queryFn: contactsApi.owners });
    const { data: facets } = useQuery({ queryKey: ['contact-facets'], queryFn: contactsApi.facets });

    return useMemo(() => {
        const opt = (list = []) => list.map(o => [o.value, o.label]);
        const base = [
            ['lifecycle_stage', 'Lifecycle stage', 'enum', opt(meta?.lifecycle_stages)],
            ['lead_status', 'Lead status', 'enum', opt(meta?.lead_statuses)],
            ['owner_id', 'Owner', 'enum', [['me', 'Me'], ...owners.map(o => [o.user_id, o.name])]],
            ['tags', 'Tags', 'tags', (facets?.tags || []).map(t => [t.tag, t.tag])],
            ['list', 'List membership', 'list', (facets?.lists || []).map(l => [l.list_id, l.list_name])],
            ['first_name', 'First name', 'text'], ['last_name', 'Last name', 'text'], ['email', 'Email', 'text'],
            ['phone', 'Phone', 'text'], ['mobile_phone', 'Mobile', 'text'], ['designation', 'Job title', 'text'],
            ['company_name', 'Company name', 'text'], ['industry', 'Industry', 'text'],
            ['lead_source', 'Lead source', 'text'], ['poc_city', 'City', 'text'], ['poc_state', 'State', 'text'],
            ['poc_country', 'Country', 'text'],
            ['consent_status', 'Email subscription', 'enum', [['OPT_IN', 'Subscribed'], ['UNSUBSCRIBED', 'Unsubscribed']]],
            ['legal_basis', 'Legal basis', 'enum', opt(meta?.legal_bases)],
            ['is_valid_email', 'Email is valid', 'boolean', [['true', 'Yes'], ['false', 'No']]],
            ['created_at', 'Create date', 'date'], ['updated_at', 'Last updated', 'date'],
            ['company.industry', 'Company industry', 'text'], ['company.country', 'Company country', 'text'],
            ['company.domain', 'Company domain', 'text'], ['company.annual_revenue', 'Company revenue', 'number'],
            ['company.lifecycle_stage', 'Company lifecycle stage', 'enum', opt(meta?.lifecycle_stages)],
        ];
        const custom = fields.map(f => {
            const type = { NUMBER: 'number', DATE: 'date', SELECT: 'enum', RADIO: 'enum', MULTI_CHECKBOX: 'enum' }[f.field_type] || 'text';
            return [`custom.${f.field_key}`, f.label, type, f.options?.map(o => [o, o])];
        });
        return [...base, ...custom].map(([key, label, type, options]) => ({ key, label, type, options }));
    }, [meta, fields, owners, facets]);
}

export function filterCount(spec) {
    if (!spec?.conditions) return 0;
    return spec.conditions.reduce((n, c) => n + (c.conditions ? filterCount(c) : 1), 0);
}

function ConditionRow({ cond, fields, onChange, onRemove }) {
    const field = fields.find(f => f.key === cond.field) || fields[0];
    const operators = OPERATORS[field?.type || 'text'];
    const setField = (key) => {
        const next = fields.find(f => f.key === key);
        const op = OPERATORS[next.type][0][0];
        onChange({ field: key, operator: op, value: next.options?.[0]?.[0] ?? '' });
    };
    const needsValue = !NO_VALUE.has(cond.operator);
    let valueInput = null;
    if (needsValue) {
        if (field?.options?.length) {
            valueInput = (
                <select className={selectClass} value={cond.value ?? ''} onChange={e => onChange({ ...cond, value: e.target.value })}>
                    {field.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
            );
        } else {
            const type = field?.type === 'number' || cond.operator === 'in_last_days' ? 'number'
                : field?.type === 'date' ? 'date' : 'text';
            valueInput = (
                <input type={type} className={`${selectClass} w-40`} value={cond.value ?? ''}
                    onChange={e => onChange({ ...cond, value: type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value })}
                    placeholder={cond.operator === 'in_last_days' ? 'days' : 'value'} />
            );
        }
    }
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <select className={selectClass} value={cond.field} onChange={e => setField(e.target.value)} aria-label="Property">
                {fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <select className={selectClass} value={cond.operator} onChange={e => onChange({ ...cond, operator: e.target.value })} aria-label="Operator">
                {operators.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {valueInput}
            <button type="button" onClick={onRemove} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg" aria-label="Remove condition"><X className="w-4 h-4" /></button>
        </div>
    );
}

function Group({ group, fields, onChange, onRemove, nested }) {
    const conditions = group.conditions || [];
    const update = (i, value) => onChange({ ...group, conditions: conditions.map((c, j) => (j === i ? value : c)) });
    const remove = (i) => onChange({ ...group, conditions: conditions.filter((_, j) => j !== i) });
    const newCondition = () => {
        const f = fields[0];
        return { field: f.key, operator: OPERATORS[f.type][0][0], value: f.options?.[0]?.[0] ?? '' };
    };
    return (
        <div className={nested ? 'pl-3 border-l-2 border-indigo-200 space-y-2 py-1' : 'space-y-2'}>
            {conditions.map((c, i) => (
                <div key={i} className="space-y-2">
                    {i > 0 && (
                        <button type="button" onClick={() => onChange({ ...group, op: group.op === 'OR' ? 'AND' : 'OR' })}
                            className="text-[11px] font-bold tracking-wide px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                            title="Click to switch AND / OR">
                            {group.op === 'OR' ? 'OR' : 'AND'}
                        </button>
                    )}
                    {c.conditions
                        ? <Group group={c} fields={fields} nested onChange={v => update(i, v)} onRemove={() => remove(i)} />
                        : <ConditionRow cond={c} fields={fields} onChange={v => update(i, v)} onRemove={() => remove(i)} />}
                </div>
            ))}
            <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={() => onChange({ ...group, conditions: [...conditions, newCondition()] })}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Condition</button>
                {!nested && (
                    <button type="button" onClick={() => onChange({ ...group, conditions: [...conditions, { op: group.op === 'OR' ? 'AND' : 'OR', conditions: [newCondition()] }] })}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Group</button>
                )}
                {nested && <button type="button" onClick={onRemove} className="text-xs font-semibold text-slate-400 hover:text-red-500">Remove group</button>}
            </div>
        </div>
    );
}

export default function FilterBuilder({ value, onChange }) {
    const fields = useFilterFields();
    const spec = value?.conditions ? value : { op: 'AND', conditions: [] };
    if (!fields.length) return null;
    return <Group group={spec} fields={fields} onChange={onChange} />;
}
