// Calendar dates for API query parameters (FastAPI `date`, "YYYY-MM-DD").

/**
 * The local calendar date of `d` as "YYYY-MM-DD". Unlike d.toISOString().slice(0, 10) (the UTC date)
 * this is the day the user sees: at 01:00 in UTC+2 or 20:00 in UTC-5 the UTC date is a different day.
 */
export function localISODate(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// ── API timestamps (UAT defect 2) ─────────────────────────────────────────────
// The API sends UTC instants as ISO 8601 with a zone ("2026-10-26T17:54:09.654321Z"). Older responses and a
// few hand-built values have no zone: those are UTC too, never local time (a bare new Date(value) would read
// them as local and show the time hours off west or east of UTC). A date-only value ("2026-10-26") is a
// calendar day, not an instant: it is the local day of that date. Everything is shown in the viewer's
// browser time zone, with the zone's abbreviation wherever a time of day is shown.

const ZONE_SUFFIX = /([zZ]|[+-]\d\d:?\d\d)$/;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A Date for an API value (ISO string, epoch ms or Date), or null when it is empty or unreadable. */
export function parseApiDate(value) {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'number') {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const text = String(value).trim();
    const day = DATE_ONLY.exec(text);
    if (day) return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
    const iso = text.includes('T') ? text : text.replace(' ', 'T');
    const d = new Date(ZONE_SUFFIX.test(iso) ? iso : `${iso}Z`);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** The value as an ISO string with a zone (for <time dateTime>, sorting, comparisons), or null. */
export function toApiIso(value) {
    const d = parseApiDate(value);
    return d ? d.toISOString() : null;
}

function format(value, options, fallback, locale) {
    const d = parseApiDate(value);
    if (!d) return fallback;
    return d.toLocaleString(locale, options);
}

/** "Oct 26, 2026, 1:54 PM EDT" (year: false → "Oct 26, 1:54 PM EDT"). */
export function formatDateTime(value, { year = true, fallback = '—', locale } = {}) {
    return format(value, {
        month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}),
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    }, fallback, locale);
}

/** "1:54 PM EDT". */
export function formatTime(value, { fallback = '', locale } = {}) {
    return format(value, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }, fallback, locale);
}

/** "Oct 26, 2026" (no time, so no zone). year: false → "Oct 26". */
export function formatDate(value, { year = true, weekday, fallback = '—', locale } = {}) {
    const d = parseApiDate(value);
    if (!d) return fallback;
    return d.toLocaleDateString(locale, {
        ...(weekday ? { weekday } : {}), month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}),
    });
}

/** Whole local calendar days from `value` to `now` (0 = today, 1 = yesterday), or null. */
export function calendarDaysAgo(value, now = new Date()) {
    const d = parseApiDate(value);
    if (!d) return null;
    const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    return Math.round((startOf(now) - startOf(d)) / 86400000);
}
