import { describe, expect, it } from 'vitest';
import {
    activeFields, booleanValue, choiceLabel, choicesOf, customFieldErrors, customValueError, describeField, filterSpecOf,
    maxLengthOf, optionsPayload, parseOptionList,
} from './customProperties';

const TIER = { field_key: 'tier', label: 'Tier', field_type: 'SELECT', options: ['gold', 'silver'],
    choices: [{ value: 'gold', label: 'Gold tier' }, { value: 'silver', label: 'Silver' }] };

describe('custom property helpers (C-17)', () => {
    it('reads choices, falling back to the plain options', () => {
        expect(choicesOf(TIER)).toEqual(TIER.choices);
        expect(choicesOf({ field_type: 'SELECT', options: ['A', 'B'] })).toEqual([{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }]);
        expect(choicesOf({ field_type: 'SELECT', options: [] , choices: [] })).toEqual([]);
        expect(choiceLabel(TIER, 'gold')).toBe('Gold tier');
        expect(choiceLabel(TIER, 'retired')).toBe('retired');
    });

    it('keeps the value of existing options and sends new ones as labels', () => {
        expect(optionsPayload([{ value: 'gold', label: ' Gold plus ' }, { label: 'Bronze' }, { label: '  ' }]))
            .toEqual([{ value: 'gold', label: 'Gold plus' }, 'Bronze']);
        expect(parseOptionList('A, B,,C')).toEqual([{ label: 'A' }, { label: 'B' }, { label: 'C' }]);
    });

    it('parses booleans', () => {
        expect(booleanValue(true)).toBe(true);
        expect(booleanValue('no')).toBe(false);
        expect(booleanValue('')).toBeNull();
        expect(booleanValue('maybe')).toBeNull();
    });

    it('limits text by max_length or the type limit', () => {
        expect(maxLengthOf({ field_type: 'TEXT' })).toBe(1000);
        expect(maxLengthOf({ field_type: 'LONG_TEXT' })).toBe(10000);
        expect(maxLengthOf({ field_type: 'TEXT', max_length: 5 })).toBe(5);
        expect(maxLengthOf({ field_type: 'NUMBER' })).toBeNull();
        const code = { field_key: 'code', label: 'Code', field_type: 'TEXT', max_length: 3 };
        expect(customValueError(code, 'abcd')).toBe('Code must be at most 3 characters');
        expect(customValueError(code, 'abc')).toBe('');
        expect(customFieldErrors([code, TIER], { code: 'toolong', tier: 'gold' })).toEqual({ code: 'Code must be at most 3 characters' });
    });

    it('builds filter specs by value with labels; BOOLEAN as Yes / No', () => {
        expect(filterSpecOf(TIER)).toEqual({ type: 'enum', options: [['gold', 'Gold tier'], ['silver', 'Silver']] });
        expect(filterSpecOf({ field_type: 'BOOLEAN' })).toEqual({ type: 'enum', options: [['true', 'Yes'], ['false', 'No']] });
        expect(filterSpecOf({ field_type: 'LONG_TEXT' })).toEqual({ type: 'text', options: undefined });
    });

    it('describes and filters definitions', () => {
        expect(describeField({ ...TIER, group_name: 'Sales', required: true })).toBe('Sales · Dropdown · Gold tier, Silver · required');
        expect(describeField({ field_type: 'LONG_TEXT', max_length: 500 })).toBe('Long text · max 500 characters');
        expect(activeFields([{ field_key: 'a' }, { field_key: 'b', is_active: false }, { field_key: 'c', is_active: true }]).map(f => f.field_key))
            .toEqual(['a', 'c']);
    });
});
