import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from './csv';

describe('csvCell', () => {
    it('quotes every cell and doubles quotes', () => {
        expect(csvCell('plain')).toBe('"plain"');
        expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
        expect(csvCell('two\nlines')).toBe('"two\nlines"');
        expect(csvCell(null)).toBe('""');
        expect(csvCell(undefined)).toBe('""');
        expect(csvCell(42)).toBe('"42"');
    });

    it.each(['=HYPERLINK("http://x")', '+1+2', '-2+3', '@SUM(A1)', '\tcmd', '\rcmd'])(
        'neutralises formula-like value %j with a leading quote', (value) => {
            const cell = csvCell(value);
            expect(cell.startsWith(`"'`)).toBe(true);
            expect(cell).toBe(`"'${value.replace(/"/g, '""')}"`);
        },
    );

    it('leaves values that only contain formula characters later alone', () => {
        expect(csvCell('a=b')).toBe('"a=b"');
        expect(csvCell('jo@example.com')).toBe('"jo@example.com"');
    });
});

describe('toCsv', () => {
    it('joins cells with commas and rows with CRLF', () => {
        expect(toCsv([['Name', 'Email'], ['Ann', '=cmd|calc']])).toBe('"Name","Email"\r\n"Ann","\'=cmd|calc"');
    });
});
