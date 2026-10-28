import { useQuery } from '@tanstack/react-query';
import { inboxesApi } from '../../../api/inboxes';

/**
 * Checkbox list of the workspace's sending inboxes (GET /inboxes, cached as ['inboxes']).
 * Only ACTIVE inboxes can be newly selected; one already selected stays visible so it can be removed.
 */
export default function InboxSelector({ value = [], onChange, disabled = false, label = 'Sending inboxes' }) {
    const { data: inboxes = [], isLoading, error } = useQuery({ queryKey: ['inboxes'], queryFn: inboxesApi.list });
    const selected = new Set(value);
    const toggle = (id) => onChange(selected.has(id) ? value.filter(v => v !== id) : [...value, id]);
    const shown = inboxes.filter(i => (i.status || '').toUpperCase() === 'ACTIVE' || selected.has(i.inbox_id));

    return (
        <fieldset disabled={disabled} className="space-y-1.5">
            <legend className="text-xs font-semibold text-slate-600 mb-1.5">{label}</legend>
            {isLoading && <p className="text-xs text-slate-400">Loading inboxes...</p>}
            {error && <p role="alert" className="text-xs text-red-600">Couldn't load inboxes.</p>}
            {!isLoading && !error && shown.length === 0 && <p className="text-xs text-slate-400">No active inboxes.</p>}
            <div className="max-h-40 overflow-y-auto space-y-1">
                {shown.map(inbox => (
                    <label key={inbox.inbox_id} className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={selected.has(inbox.inbox_id)} onChange={() => toggle(inbox.inbox_id)}
                            className="rounded border-slate-300" />
                        <span className="truncate">{inbox.email_address}</span>
                        {(inbox.status || '').toUpperCase() !== 'ACTIVE' && (
                            <span className="text-[11px] text-amber-600">{inbox.status}</span>
                        )}
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
