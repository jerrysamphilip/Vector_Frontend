import { describe, expect, it } from 'vitest';
import { mappingProblems } from './MappingRow';

describe('mappingProblems', () => {
    it('warns, without blocking, when two columns map to the same property', () => {
        const r = mappingProblems({ Email: 'contact.email', 'First': 'contact.first_name', 'Given name': 'contact.first_name' });
        expect(r.problems).toEqual([]);
        expect(r.notices).toEqual(['More than one column maps to the same property; the last one wins.']);
    });

    it('ignores skipped columns when looking for duplicates', () => {
        const r = mappingProblems({ Email: 'contact.email', A: 'skip', B: 'skip', C: '' });
        expect(r.notices).toEqual([]);
    });
});
