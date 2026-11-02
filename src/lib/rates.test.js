import { describe, expect, it } from 'vitest';
import { deliveredCount, rateOverDelivered } from './rates';

describe('rate helpers (A5-U4)', () => {
    it('divides by delivered = sent - bounced', () => {
        expect(deliveredCount(42, 2)).toBe(40);
        expect(rateOverDelivered(8, 42, 2)).toBe('20.0');
        expect(rateOverDelivered(1, 42, 2)).toBe('2.5');
    });

    it('treats missing counts as 0 and never divides by zero', () => {
        expect(rateOverDelivered(3, 10)).toBe('30.0');
        expect(rateOverDelivered(0, 0, 0)).toBe('0.0');
        expect(rateOverDelivered(1, 5, 5)).toBe('0.0');
        expect(rateOverDelivered(1, 5, 9)).toBe('0.0');
        expect(deliveredCount(undefined, null)).toBe(0);
    });
});
