import { afterEach, describe, expect, it } from 'vitest';
import { calendarDaysAgo, formatDate, formatDateTime, formatTime, localISODate, parseApiDate, toApiIso } from './dates';

// Node applies a TZ change at runtime, so each case can pin the zone the browser would be in.
const originalTZ = process.env.TZ;
afterEach(() => {
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
});

describe('localISODate', () => {
    it('uses the local day west of UTC (evening, UTC is already tomorrow)', () => {
        process.env.TZ = 'America/New_York';
        const d = new Date('2026-03-10T02:30:00Z'); // 22:30 on 9 March in New York
        expect(d.toISOString().slice(0, 10)).toBe('2026-03-10');
        expect(localISODate(d)).toBe('2026-03-09');
    });

    it('uses the local day east of UTC (early morning, UTC is still yesterday)', () => {
        process.env.TZ = 'Asia/Kolkata';
        const d = new Date('2026-12-31T20:00:00Z'); // 01:30 on 1 January 2027 in India
        expect(d.toISOString().slice(0, 10)).toBe('2026-12-31');
        expect(localISODate(d)).toBe('2027-01-01');
    });

    it('keeps local midnight of the first of a month on that day', () => {
        process.env.TZ = 'Asia/Tokyo';
        expect(localISODate(new Date(2026, 9, 1))).toBe('2026-10-01');
    });

    it('zero-pads month and day', () => {
        process.env.TZ = 'UTC';
        expect(localISODate(new Date('2026-01-05T12:00:00Z'))).toBe('2026-01-05');
    });
});

describe('parseApiDate (UAT defect 2: API timestamps are UTC)', () => {
    it('reads a zone-less timestamp as UTC, like one with Z or an offset', () => {
        process.env.TZ = 'America/Los_Angeles';
        const utc = '2026-10-26T17:54:09.654Z';
        expect(parseApiDate('2026-10-26T17:54:09.654321').toISOString()).toBe(utc);
        expect(parseApiDate('2026-10-26T17:54:09.654321Z').toISOString()).toBe(utc);
        expect(parseApiDate('2026-10-26T13:54:09.654-04:00').toISOString()).toBe(utc);
        expect(parseApiDate('2026-10-26 17:54:09.654').toISOString()).toBe(utc);
        expect(toApiIso('2026-10-26T17:54:09.654')).toBe(utc);
    });

    it('reads a date-only value as that local calendar day', () => {
        process.env.TZ = 'America/New_York';
        const d = parseApiDate('2026-10-26');
        expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 26, 0]);
    });

    it('returns null for empty or unreadable values and passes Dates and epoch ms through', () => {
        expect(parseApiDate(null)).toBeNull();
        expect(parseApiDate('')).toBeNull();
        expect(parseApiDate('not a date')).toBeNull();
        expect(parseApiDate(new Date('x'))).toBeNull();
        const now = new Date();
        expect(parseApiDate(now)).toBe(now);
        expect(parseApiDate(0).toISOString()).toBe('1970-01-01T00:00:00.000Z');
    });
});

describe('formatting in the viewer\'s zone, with its abbreviation', () => {
    it.each([
        ['America/New_York', 'Oct 26, 2026, 1:54 PM EDT', '1:54 PM EDT'],
        ['America/Los_Angeles', 'Oct 26, 2026, 10:54 AM PDT', '10:54 AM PDT'],
        ['UTC', 'Oct 26, 2026, 5:54 PM UTC', '5:54 PM UTC'],
    ])('%s', (zone, dateTime, time) => {
        process.env.TZ = zone;
        expect(formatDateTime('2026-10-26T17:54:09.654321', { locale: 'en-US' })).toBe(dateTime);
        expect(formatTime('2026-10-26T17:54:09.654321Z', { locale: 'en-US' })).toBe(time);
        expect(formatDateTime('2026-10-26T17:54:09Z', { year: false, locale: 'en-US' })).toBe(dateTime.replace(', 2026', ''));
    });

    it('shows the winter abbreviation after daylight time ends', () => {
        process.env.TZ = 'America/New_York';
        expect(formatTime('2026-11-02T17:54:00', { locale: 'en-US' })).toBe('12:54 PM EST');
    });

    it('formats dates without a time (no zone) and uses fallbacks', () => {
        process.env.TZ = 'America/Los_Angeles';
        expect(formatDate('2026-10-26', { locale: 'en-US' })).toBe('Oct 26, 2026');
        expect(formatDate('2026-10-27T03:00:00', { locale: 'en-US', year: false })).toBe('Oct 26');
        expect(formatDateTime(null)).toBe('—');
        expect(formatDateTime('garbage', { fallback: 'Never' })).toBe('Never');
        expect(formatTime(undefined)).toBe('');
    });

    it('counts local calendar days', () => {
        process.env.TZ = 'America/Los_Angeles';
        const now = new Date('2026-10-26T20:00:00Z'); // 1 PM PDT
        expect(calendarDaysAgo('2026-10-26T08:00:00', now)).toBe(0);
        expect(calendarDaysAgo('2026-10-26T06:30:00', now)).toBe(1); // 11:30 PM PDT the day before
        expect(calendarDaysAgo(null, now)).toBeNull();
    });
});
