import { EventRow } from './shared';

// Inbox detail "Activity" tab: recent warm-up events.
export default function InboxActivityTab({ accounts }) {
    const {
        events
    } = accounts;
    return (
        <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Recent Events</p>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                    {events.length}
                </span>
            </div>
            {events.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-xs text-gray-400">
                    No warmup activity yet for this mailbox.
                </div>
            ) : events.map(event => (
                <EventRow key={event.event_id} event={event}/>
            ))}
        </div>
    );
}
