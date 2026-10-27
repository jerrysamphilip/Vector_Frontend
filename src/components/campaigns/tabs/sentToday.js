// "Total Sent Today / Limit" of a campaign: sent_today and daily_capacity of each of its sending inboxes
// (GET /inboxes, backend app/routers/inbox_router.py + app/services/sending_alerts.py), summed. The figures are
// per inbox, so they include what the same inboxes sent for other campaigns today.

/** Inbox ids of a campaign (campaign detail: sending_inboxes; create/update payloads: inbox_ids). */
export function campaignInboxIds(campaign) {
    const fromList = (campaign?.sending_inboxes || []).map(i => i?.inbox_id).filter(Boolean);
    return fromList.length ? fromList : (campaign?.inbox_ids || []).filter(Boolean);
}

const isCount = v => typeof v === 'number' && Number.isFinite(v);

/**
 * { sent, capacity, inboxCount }: sums over the campaign's inboxes found in `inboxes`. sent / capacity are null
 * (unknown, shown as "—") when the inbox list is not available, the campaign has none of the listed inboxes,
 * or any of its inboxes lacks that figure.
 */
export function sentTodayVsCapacity(campaign, inboxes) {
    const ids = new Set(campaignInboxIds(campaign));
    const list = Array.isArray(inboxes) ? inboxes : inboxes?.items;
    if (!ids.size || !Array.isArray(list)) return { sent: null, capacity: null, inboxCount: 0 };
    const mine = list.filter(i => ids.has(i.inbox_id));
    if (!mine.length) return { sent: null, capacity: null, inboxCount: 0 };
    const sum = key => (mine.every(i => isCount(i[key])) ? mine.reduce((a, i) => a + i[key], 0) : null);
    return { sent: sum('sent_today'), capacity: sum('daily_capacity'), inboxCount: mine.length };
}

/** "12 / 400", "12 / —" or "—". */
export function formatSentToday({ sent, capacity }) {
    if (sent === null && capacity === null) return '—';
    const f = v => (v === null ? '—' : v.toLocaleString());
    return `${f(sent)} / ${f(capacity)}`;
}
