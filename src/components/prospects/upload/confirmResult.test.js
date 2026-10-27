import { describe, expect, it } from 'vitest';
import { confirmOutcome } from './confirmResult';

describe('confirmOutcome (POST /uploads/{id}/confirmations)', () => {
    it('is done when every row was saved', () => {
        const { done, summary } = confirmOutcome({ list_id: 'u1', inserted: 3, new_prospects: 2, updated: 1, rejected: 0, failed: 0, not_added: [], status: 'CONFIRMED' });
        expect(done).toBe(true);
        expect(summary).toMatchObject({ inserted: 3, newProspects: 2, updated: 1, notAdded: [] });
    });

    it('treats an upload that was already confirmed as success', () => {
        expect(confirmOutcome({ list_id: 'u1', inserted: 5, status: 'CONFIRMED', not_added: [], already_confirmed: true }).done).toBe(true);
    });

    it('is not done when rows were not added; keeps the rows and the counts', () => {
        const notAdded = [{ row: 2, email: 'bad@x', reason: 'Invalid email' }, { row: 5, email: 'u@x.com', reason: 'Globally unsubscribed' }];
        const { done, summary } = confirmOutcome({
            list_id: 'u1', inserted: 1, new_prospects: 1, updated: 0, skipped_unsubscribed: 1, rejected: 1, failed: 0,
            not_added: notAdded, status: 'CONFIRMED',
        });
        expect(done).toBe(false);
        expect(summary).toMatchObject({ inserted: 1, rejected: 1, failed: 0, unsubscribed: 1, notAdded });
    });

    it('is not done when nothing was added or nothing was accepted', () => {
        expect(confirmOutcome({ inserted: 0, failed: 2, not_added: [{ row: 1 }, { row: 2 }], status: 'NO_RECORDS_ADDED' }).done).toBe(false);
        expect(confirmOutcome({ list_id: 'u1', inserted: 0, new_prospects: 0, status: 'NO_ACCEPTED_RECORDS' }).done).toBe(false);
        expect(confirmOutcome(undefined).done).toBe(false);
    });
});
