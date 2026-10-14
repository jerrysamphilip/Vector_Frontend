import { useState } from 'react';
import { X, Edit2, Save, Loader2 } from 'lucide-react';

// ── Bulk Edit Panel ───────────────────────────────────────────────
export default function BulkEditPanel({ count, onApply, onCancel, isPending }) {
    const [fields, setFields] = useState({
        designation: '',
        company_name: '',
        poc_city: '',
        poc_state: '',
        poc_country: '',
    });
    const [enabledFields, setEnabledFields] = useState({});

    const toggleField = (key) => {
        setEnabledFields(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleApply = () => {
        const updates = {};
        Object.entries(enabledFields).forEach(([key, enabled]) => {
            if (enabled) updates[key] = fields[key];
        });
        if (Object.keys(updates).length === 0) return;
        onApply(updates);
    };

    const FIELDS = [
        { key: 'designation', label: 'Designation', placeholder: 'e.g., VP of Sales' },
        { key: 'company_name', label: 'Company', placeholder: 'e.g., Acme Corp' },
        { key: 'poc_city', label: 'City', placeholder: 'e.g., San Francisco' },
        { key: 'poc_state', label: 'State', placeholder: 'e.g., CA' },
        { key: 'poc_country', label: 'Country', placeholder: 'e.g., US' },
    ];

    return (
        <div className="mx-6 mb-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-semibold text-blue-800">
                        Bulk edit {count} prospect{count !== 1 ? 's' : ''}
                    </p>
                </div>
                <button onClick={onCancel} className="text-blue-400 hover:text-blue-600 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <p className="text-xs text-blue-600 mb-3">Toggle fields you want to update, then click Apply.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FIELDS.map(({ key, label, placeholder }) => (
                    <div key={key} className={`rounded-lg border p-2 transition-all ${
                        enabledFields[key]
                            ? 'border-blue-400 bg-white'
                            : 'border-blue-100 bg-blue-50/50 opacity-60'
                    }`}>
                        <label className="flex items-center gap-2 cursor-pointer mb-1">
                            <input
                                type="checkbox"
                                checked={Boolean(enabledFields[key])}
                                onChange={() => toggleField(key)}
                                className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                            />
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">{label}</span>
                        </label>
                        <input
                            type="text"
                            value={fields[key]}
                            onChange={e => setFields(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder={placeholder}
                            disabled={!enabledFields[key]}
                            className="w-full px-2 py-1 text-sm border border-blue-200 rounded bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40 disabled:bg-blue-50"
                        />
                    </div>
                ))}
            </div>
            <div className="flex gap-2 mt-3">
                <button onClick={onCancel}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    Cancel
                </button>
                <button onClick={handleApply} disabled={isPending || Object.values(enabledFields).every(v => !v)}
                    className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Apply to {count}
                </button>
            </div>
        </div>
    );
}
