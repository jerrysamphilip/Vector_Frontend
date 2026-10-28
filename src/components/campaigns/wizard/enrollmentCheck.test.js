import { describe, expect, it } from 'vitest';
import { mergeEnrollmentChecks, skippedCsvRows } from './enrollmentCheck';

describe('wizard enrolment check', () => {
    it('counts each contact once across lists', () => {
        const merged = mergeEnrollmentChecks([
            { would_enroll: [{ prospect_id: 'a' }], rejected: [{ prospect_id: 'b', reason: 'Still in another active campaign' }] },
            {
                would_enroll: [{ prospect_id: 'a' }],
                rejected: [{ prospect_id: 'b', reason: 'Still in another active campaign' },
                    { prospect_id: 'c', reason: 'Already replied with interest' }],
            },
            { would_enroll: [{ prospect_id: 'c' }], rejected: [] },
        ]);
        expect(merged.wouldEnroll).toBe(2);
        expect(merged.rejected.map(r => r.prospect_id)).toEqual(['b']);
        expect(merged.byReason).toEqual([['Still in another active campaign', 1]]);
        expect(merged.truncated).toBe(false);
    });

    it('flags truncated results and builds CSV rows', () => {
        expect(mergeEnrollmentChecks([{ would_enroll: [], would_enroll_count: 6000, rejected: [] }]).truncated).toBe(true);
        expect(skippedCsvRows([{ name: 'Ann', email: 'a@x.com', reason: 'R' }])).toEqual([['Name', 'Email', 'Reason'], ['Ann', 'a@x.com', 'R']]);
    });
});
