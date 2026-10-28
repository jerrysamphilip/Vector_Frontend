import { Plus, X } from 'lucide-react';
import { NO_VALUE, OPERATORS } from './companyColumns';

const selectClass = 'h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-400';

function newCondition(field) {
    return { field: field.key, operator: OPERATORS[field.type][0][0], value: field.options?.[0]?.[0] ?? '' };
}

function ValueInput({ field, cond, onChange }) {
    if (NO_VALUE.has(cond.operator)) return null;
    if (field?.options?.length) {
        return (
            <select className={selectClass} aria-label="Value" value={cond.value ?? ''} onChange={e => onChange({ ...cond, value: e.target.value })}>
                {field.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
        );
    }
    const type = field?.type === 'number' ? 'number' : field?.type === 'date' ? 'date' : 'text';
    return (
        <input type={type} aria-label="Value" className={`${selectClass} w-40`} value={cond.value ?? ''} placeholder="value"
            onChange={e => onChange({ ...cond, value: type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value })} />
    );
}

/**
 * Company filter (C-16, F-14): conditions on company properties and custom company properties, all of
 * which must match. Value shape is the API's: { op: 'AND', conditions: [{ field, operator, value }] }.
 */
export default function CompanyFilters({ value, onChange, fields }) {
    const conditions = value?.conditions || [];
    const set = (next) => onChange({ op: 'AND', conditions: next });
    if (!fields.length) return null;
    return (
        <div className="space-y-2">
            {conditions.map((cond, i) => {
                const field = fields.find(f => f.key === cond.field) || fields[0];
                const update = (c) => set(conditions.map((x, j) => (j === i ? c : x)));
                return (
                    <div key={i} className="flex items-center gap-2 flex-wrap">
                        {i > 0 && <span className="text-[11px] font-bold tracking-wide px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">AND</span>}
                        <select className={selectClass} aria-label="Property" value={cond.field}
                            onChange={e => update(newCondition(fields.find(f => f.key === e.target.value)))}>
                            {fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                        </select>
                        <select className={selectClass} aria-label="Operator" value={cond.operator} onChange={e => update({ ...cond, operator: e.target.value })}>
                            {OPERATORS[field.type].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <ValueInput field={field} cond={cond} onChange={update} />
                        <button type="button" onClick={() => set(conditions.filter((_, j) => j !== i))}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg" aria-label="Remove condition"><X className="w-4 h-4" /></button>
                    </div>
                );
            })}
            <button type="button" onClick={() => set([...conditions, newCondition(fields[0])])}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Condition</button>
        </div>
    );
}
