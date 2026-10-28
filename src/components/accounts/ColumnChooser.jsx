import { DEFAULT_COLUMNS } from './companyColumns';

/** Pick the companies table's columns, built-in and custom properties (F-14). "Company" is always shown. */
export default function ColumnChooser({ columns, setColumns, available, onClose }) {
    const toggle = (key) => setColumns(columns.includes(key) ? columns.filter(c => c !== key) : [...columns, key]);
    return (
        <div className="absolute right-0 top-11 z-30 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3" role="dialog" aria-label="Columns">
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Columns</p>
                <button onClick={() => setColumns(DEFAULT_COLUMNS)} className="text-xs font-semibold text-indigo-600">Reset</button>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-0.5">
                {available.map(col => (
                    <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-sm text-slate-700">
                        <input type="checkbox" className="accent-indigo-600" checked={columns.includes(col.key)} disabled={col.key === 'name'}
                            onChange={() => toggle(col.key)} />
                        {col.label}{col.property && <span className="text-[10px] text-slate-400 uppercase">custom</span>}
                    </label>
                ))}
            </div>
            <button onClick={onClose} className="mt-2 w-full h-8 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg">Done</button>
        </div>
    );
}
