import { LEAD_TIMING_COLUMNS, deliveryLabel, formatWhen, nextEmailLabel, stepsLabel } from './leadTiming';

const TONE = {
    red: 'text-red-600',
    green: 'text-emerald-600',
    amber: 'text-amber-600',
    muted: 'text-slate-400',
};

/** Header cells for the lead-list timing columns (F-12). */
export function LeadTimingHeaders({ className }) {
    return LEAD_TIMING_COLUMNS.map(label => <th key={label} className={className}>{label}</th>);
}

/** The timing cells of one enrolled contact, in LEAD_TIMING_COLUMNS order. */
export default function LeadTimingCells({ prospect: p, cellClassName = 'px-6 py-4' }) {
    const delivery = deliveryLabel(p);
    return (
        <>
            <td className={cellClassName}><span className="text-sm text-slate-600 whitespace-nowrap">{stepsLabel(p)}</span></td>
            <td className={cellClassName}><span className="text-sm text-slate-600 whitespace-nowrap">{formatWhen(p.last_sent_at)}</span></td>
            <td className={cellClassName}><span className="text-sm text-slate-600 whitespace-nowrap">{nextEmailLabel(p)}</span></td>
            <td className={cellClassName}>
                <span className={`text-sm whitespace-nowrap ${TONE[delivery.tone]}`} title={delivery.detail || undefined}>{delivery.text}</span>
            </td>
            <td className={`${cellClassName} max-w-[220px]`}>
                {p.stopped_reason
                    ? <span className="text-sm text-slate-600 line-clamp-2" title={p.stopped_reason}>{p.stopped_reason}</span>
                    : <span className="text-sm text-slate-300">—</span>}
            </td>
        </>
    );
}
