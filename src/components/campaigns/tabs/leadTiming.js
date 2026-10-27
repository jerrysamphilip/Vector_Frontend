// Lead-list timing columns (F-12): pure formatting of the fields GET /campaigns/{id}/prospects returns
// per contact: last_sent_at, delivered_at, bounce_reason, ooo, steps_sent, steps_total, next_email_at,
// stopped_reason (the API computes next_email_at with each step's stop_on_reply / stop_on_bounce flags).

// The API sends UTC timestamps; a value without an offset is UTC, not local time
export function parseUtc(value) {
    if (!value) return null;
    const text = String(value);
    const date = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(text) ? text : `${text}Z`);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function formatWhen(value, locale) {
    const date = parseUtc(value);
    if (!date) return '—';
    return date.toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** "2 / 3" steps sent, or "—" when the campaign has no steps yet. */
export function stepsLabel(p) {
    if (!p?.steps_total) return '—';
    return `${p.steps_sent || 0} / ${p.steps_total}`;
}

/** The delivery cell: bounce wins, then delivered, then out-of-office. */
export function deliveryLabel(p) {
    if (p?.bounce_reason) return { text: 'Bounced', detail: p.bounce_reason, tone: 'red' };
    const parts = [];
    if (p?.delivered_at) parts.push('Delivered');
    if (p?.ooo) parts.push('Out of office');
    if (!parts.length) return { text: '—', detail: null, tone: 'muted' };
    return { text: parts.join(' · '), detail: null, tone: p.ooo ? 'amber' : 'green' };
}

/** Next email: the time, or why there is none. */
export function nextEmailLabel(p, locale) {
    if (p?.next_email_at) return formatWhen(p.next_email_at, locale);
    if (p?.removed) return 'Removed';
    if (p?.stopped_reason) return 'Stopped';
    if (p?.steps_total && p.steps_sent >= p.steps_total) return 'Sequence done';
    return '—';
}

export const LEAD_TIMING_COLUMNS = ['Steps sent', 'Last sent', 'Next email', 'Delivery', 'Stopped reason'];
