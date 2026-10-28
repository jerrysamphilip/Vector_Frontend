import { SlidersHorizontal } from 'lucide-react';
import { formatCustomValue } from '../contacts/shared';

/** The company's custom property values on its record page (C-16), grouped like the definitions. Deactivated
 *  properties (C-17) keep their values and are marked inactive. */
export default function CompanyPropertiesCard({ properties = [], values = {} }) {
    if (!properties.length) return null;
    const groups = properties.reduce((acc, p) => {
        const name = p.group_name || 'Properties';
        (acc[name] = acc[name] || []).push(p);
        return acc;
    }, {});
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <SlidersHorizontal className="w-4 h-4 text-indigo-500" /> Company properties
            </h2>
            <div className="px-5 py-4 space-y-4">
                {Object.entries(groups).map(([name, items]) => (
                    <div key={name}>
                        {Object.keys(groups).length > 1 && <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">{name}</p>}
                        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                            {items.map(p => (
                                <div key={p.field_key} className="min-w-0">
                                    <dt className="text-xs text-slate-500">{p.label}{p.is_active === false && <span className="ml-1 text-slate-400">(inactive)</span>}</dt>
                                    <dd className="text-sm font-medium text-slate-800 truncate">{formatCustomValue(p, values?.[p.field_key]) ?? <span className="text-slate-300">—</span>}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                ))}
            </div>
        </div>
    );
}
