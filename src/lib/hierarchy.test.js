import { describe, expect, it } from 'vitest';
import { descendantIds, hierarchyError, managerCandidates } from './hierarchy';

// CEO (1) -> BD (2) -> BE (3) -> MR (4); a second BD with nobody below; one user outside the hierarchy
const users = [
    { user_id: 'ceo', name: 'Cara', sales_level: 1, manager_id: null },
    { user_id: 'bd1', name: 'Ben', sales_level: 2, manager_id: 'ceo' },
    { user_id: 'bd2', name: 'Abe', sales_level: 2, manager_id: 'ceo' },
    { user_id: 'be1', name: 'Eve', sales_level: 3, manager_id: 'bd1' },
    { user_id: 'mr1', name: 'Max', sales_level: 4, manager_id: 'be1' },
    { user_id: 'out', name: 'Olga', sales_level: null, manager_id: null },
];

describe('descendantIds', () => {
    it('collects direct and indirect reports', () => {
        expect([...descendantIds(users, 'bd1')].sort()).toEqual(['be1', 'mr1']);
        expect([...descendantIds(users, 'ceo')].sort()).toEqual(['bd1', 'bd2', 'be1', 'mr1']);
    });

    it('is empty for a leaf and for missing data', () => {
        expect(descendantIds(users, 'mr1').size).toBe(0);
        expect(descendantIds(null, 'ceo').size).toBe(0);
    });

    it('terminates on a cycle in bad data and never includes the user', () => {
        const cyclic = [
            { user_id: 'a', manager_id: 'b' },
            { user_id: 'b', manager_id: 'a' },
        ];
        expect([...descendantIds(cyclic, 'a')]).toEqual(['b']);
    });
});

describe('managerCandidates', () => {
    it('lists higher levels only, sorted by level then name', () => {
        expect(managerCandidates(users, null, 3).map(u => u.user_id)).toEqual(['ceo', 'bd2', 'bd1']);
    });

    it('excludes the user and their own team (no cycles)', () => {
        // bd1 moving to level 4 may not report to be1 (their own report) or to themselves
        expect(managerCandidates(users, 'bd1', 4).map(u => u.user_id)).toEqual(['ceo', 'bd2']);
    });

    it('is empty for level 1 and for "not in the hierarchy"', () => {
        expect(managerCandidates(users, 'bd1', 1)).toEqual([]);
        expect(managerCandidates(users, 'bd1', null)).toEqual([]);
    });

    it('accepts the level as a string (select value)', () => {
        expect(managerCandidates(users, null, '2').map(u => u.user_id)).toEqual(['ceo']);
    });
});

describe('hierarchyError', () => {
    it('needs no manager for level 1 or no level', () => {
        expect(hierarchyError(users, 'bd1', 1, null)).toBeNull();
        expect(hierarchyError(users, 'bd1', null, null)).toBeNull();
    });

    it('requires a manager for levels 2 to 4', () => {
        expect(hierarchyError(users, 'be1', 3, null)).toBe('Levels 2 to 4 need a manager');
    });

    it('rejects a manager from the user\'s own team or at the same level', () => {
        expect(hierarchyError(users, 'bd1', 4, 'be1')).toMatch(/higher level/);
        expect(hierarchyError(users, 'be1', 3, 'be1')).toMatch(/higher level/);
        expect(hierarchyError(users, 'bd2', 2, 'bd1')).toMatch(/higher level/);
    });

    it('accepts a valid manager', () => {
        expect(hierarchyError(users, 'mr1', 4, 'bd2')).toBeNull();
    });
});
