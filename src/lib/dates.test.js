import { afterEach, describe, expect, it } from 'vitest';
import { localISODate } from './dates';

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
