import { describe, expect, it } from 'vitest';
import { CURRENCY, money, moneyExact, moneyShort, pct } from './sales';

describe('money formatting helpers', () => {
    it('uses USD unless VITE_CURRENCY is set', () => {
        expect(CURRENCY).toBe('USD');
    });

    it('money rounds to whole currency units', () => {
        expect(money(1234.56)).toBe('$1,235');
        expect(money(0)).toBe('$0');
        expect(money(null)).toBe('—');
        expect(money(undefined)).toBe('—');
    });

    it('moneyShort uses compact notation', () => {
        expect(moneyShort(1500)).toBe('$1.5K');
        expect(moneyShort(2_500_000)).toBe('$2.5M');
        expect(moneyShort(null)).toBe('—');
    });

    it('moneyExact keeps the cents (prices, quote lines, totals)', () => {
        expect(moneyExact(49.5)).toBe('$49.50');
        expect(moneyExact(1234)).toBe('$1,234.00');
        expect(moneyExact('19.999')).toBe('$20.00');
        expect(moneyExact(0)).toBe('$0.00');
        expect(moneyExact(-5)).toBe('-$5.00');
    });

    it('moneyExact shows a dash for missing or non-numeric values', () => {
        expect(moneyExact(null)).toBe('—');
        expect(moneyExact(undefined)).toBe('—');
        expect(moneyExact('')).toBe('—');
        expect(moneyExact('abc')).toBe('—');
    });

    it('pct appends a percent sign', () => {
        expect(pct(12.5)).toBe('12.5%');
        expect(pct(0)).toBe('0%');
        expect(pct(null)).toBe('—');
    });
});
