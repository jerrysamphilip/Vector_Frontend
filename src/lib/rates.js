// Shared engagement-rate helpers. Open / reply rates are over delivered emails (sent minus bounced), as in the
// backend (app/utils metrics: rate(x, delivered(sent, bounced))); bounce / unsubscribe rates stay over sent.

/** Delivered emails: sent minus bounced, never below zero. */
export function deliveredCount(sent, bounced) {
    return Math.max((Number(sent) || 0) - (Number(bounced) || 0), 0);
}

/** count / delivered as a percentage string with one decimal ('0.0' when nothing was delivered). */
export function rateOverDelivered(count, sent, bounced) {
    const delivered = deliveredCount(sent, bounced);
    return delivered > 0 ? (((Number(count) || 0) / delivered) * 100).toFixed(1) : '0.0';
}
