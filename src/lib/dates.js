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
