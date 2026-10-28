import { Avatar, StageBadge, formatCustomValue, relativeDate } from '../contacts/shared';

export const formatRevenue = (v) => (v == null ? null : new Intl.NumberFormat('en', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(v));

const dash = <span className="text-slate-300">—</span>;

/** One cell of the companies table. `column` comes from availableColumns() (custom ones carry their property). */
export default function CompanyCell({ column, account: a, stageLabel = {} }) {
    if (column.property) return formatCustomValue(column.property, a.custom_fields?.[column.property.field_key]) ?? dash;
    switch (column.key) {
        case 'name':
            return (
                <div className="flex items-center gap-3 min-w-[180px]">
                    <Avatar first={a.name} last={a.name.split(/\s+/)[1]} seed={a.name} size="sm" square />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{a.name}</p>
                        <p className="text-xs text-slate-500 truncate">{a.domain || '—'}</p>
                    </div>
                </div>
            );
        case 'location':
            return [a.city, a.country].filter(Boolean).join(', ') || dash;
        case 'lifecycle_stage':
            return a.lifecycle_stage ? <StageBadge value={a.lifecycle_stage} label={stageLabel[a.lifecycle_stage]} /> : dash;
        case 'annual_revenue':
            return formatRevenue(a.annual_revenue) || dash;
        case 'contact_count':
            return <span className="font-semibold text-slate-800">{a.contact_count}</span>;
        case 'owner_name':
            return a.owner_name || <span className="text-slate-400">Unassigned</span>;
        case 'created_at':
        case 'updated_at':
            return <span className="whitespace-nowrap text-slate-500">{relativeDate(a[column.key])}</span>;
        default:
            return a[column.key] || dash;
    }
}
