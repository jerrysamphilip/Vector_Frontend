// Confirm on the validation page (item W-9 follow-up): rows the API did not add are shown, not skipped over.
import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProspectValidate from './ProspectValidate';
import { renderPage } from '../test/renderPage';

const ROUTE = '/app/prospects/validate';
const state = {
    upload_id: 'up-1', title: 'October leads',
    records: [
        { row: 2, first_name: 'Ada', email: 'ada@acme.test', status: 'ACCEPTED' },
        { row: 3, first_name: 'Bob', email: 'bob@acme', status: 'ACCEPTED' },
        { row: 4, first_name: 'Cy', email: 'cy@acme.test', status: 'REJECTED', reason: 'Duplicate' },
    ],
};

function open(confirmReply) {
    return renderPage(<ProspectValidate />, {
        route: ROUTE, path: { pathname: ROUTE, state },
        http: { 'POST /uploads/:id/confirmations': confirmReply },
    });
}

describe('ProspectValidate confirm', () => {
    it('lists the rows not added with the counts and stays on the page', async () => {
        const { http } = open({
            list_id: 'up-1', inserted: 1, new_prospects: 1, updated: 0, skipped_unsubscribed: 0, rejected: 1, failed: 0,
            not_added: [{ row: 3, email: 'bob@acme', reason: 'Invalid email address' }], status: 'CONFIRMED',
        });
        await userEvent.click(screen.getByRole('button', { name: /confirm upload \(2\)/i }));

        const panel = await screen.findByTestId('upload-confirm-result');
        expect(within(panel).getByText(/saved 1 contact \(1 new, 0 updated\)/i)).toBeInTheDocument();
        expect(within(panel).getByText(/rejected on re-check: 1/i)).toBeInTheDocument();
        expect(within(panel).getByText(/refused by the database: 0/i)).toBeInTheDocument();
        const row = within(panel).getByRole('row', { name: /bob@acme/ });
        expect(within(row).getByText('3')).toBeInTheDocument();
        expect(within(row).getByText('Invalid email address')).toBeInTheDocument();
        expect(screen.queryByTestId('navigated-away')).toBeNull();
        expect(screen.getByRole('button', { name: /confirm upload/i })).toBeDisabled();
        expect(http.requests[0].body.records.map(r => r.row)).toEqual([2, 3]);

        await userEvent.click(within(panel).getByRole('button', { name: /go to prospects/i }));
        expect(await screen.findByTestId('navigated-away')).toBeInTheDocument();
    });

    it('treats an already confirmed upload as success and leaves', async () => {
        open({ list_id: 'up-1', inserted: 2, new_prospects: 2, updated: 0, rejected: 0, failed: 0, not_added: [], status: 'CONFIRMED', already_confirmed: true });
        await userEvent.click(screen.getByRole('button', { name: /confirm upload/i }));
        expect(await screen.findByTestId('navigated-away')).toBeInTheDocument();
    });

    it('leaves when every row was saved', async () => {
        open({ list_id: 'up-1', inserted: 2, new_prospects: 1, updated: 1, rejected: 0, failed: 0, not_added: [], status: 'CONFIRMED' });
        await userEvent.click(screen.getByRole('button', { name: /confirm upload/i }));
        expect(await screen.findByTestId('navigated-away')).toBeInTheDocument();
    });

    it('says nothing was added when the database refused every row, and allows another try', async () => {
        open({
            list_id: 'up-1', inserted: 0, new_prospects: 0, updated: 0, rejected: 0, failed: 2,
            not_added: [{ row: 2, email: 'ada@acme.test', reason: 'Value too long' }, { row: 3, email: 'bob@acme', reason: 'Value too long' }],
            status: 'NO_RECORDS_ADDED',
        });
        await userEvent.click(screen.getByRole('button', { name: /confirm upload/i }));
        const panel = await screen.findByTestId('upload-confirm-result');
        expect(within(panel).getByText(/no contacts were added/i)).toBeInTheDocument();
        expect(within(panel).getByText(/refused by the database: 2/i)).toBeInTheDocument();
        expect(within(panel).getAllByText('Value too long')).toHaveLength(2);
        expect(screen.getByRole('button', { name: /confirm upload/i })).toBeEnabled();
    });
});
