import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SqlQueue from './SqlQueue';
import { fail, pending, renderPage } from '../test/renderPage';
import { bug, expectLoadError, expectLoading } from '../test/pageAssertions';
import { leadsMeta, owners } from '../test/fixtures/sales';

const queue = {
    total: 1, average_age_days: 3, over_14_days: 0, without_next_step: 1, overdue_next_step: 0, by_owner: [],
    items: [{ lead_id: 'l-1', contact_name: 'Carol Contact', company_name: 'Acme', owner_name: 'Ada Lovelace', sql_age_days: 3, next_step: null, source: 'Website' }],
};
const http = (over = {}) => ({ 'GET /contacts/owners': owners, 'GET /leads/sql-queue': queue, 'GET /leads/meta': leadsMeta, ...over });

describe('SqlQueue page', () => {
    it('lists the queued SQLs with the queue totals', async () => {
        renderPage(<SqlQueue />, { route: '/app/sql-queue', http: http() });
        expect(screen.getByRole('heading', { name: 'SQL queue' })).toBeInTheDocument();
        expect(await screen.findByText('Carol Contact')).toBeInTheDocument();
        expect(screen.getByText('3d')).toBeInTheDocument();
    });

    it('shows a spinner while loading', () => {
        renderPage(<SqlQueue />, { route: '/app/sql-queue', http: http({ 'GET /leads/sql-queue': pending() }) });
        expectLoading();
    });

    it('opens the convert dialog for a lead', async () => {
        renderPage(<SqlQueue />, { route: '/app/sql-queue', http: http() });
        await userEvent.click(await screen.findByRole('button', { name: /convert/i }));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('Convert to opportunity')).toBeInTheDocument();
    });

    bug('reports a failed load instead of an empty queue', 'useQuery error ignored: renders "The SQL queue is empty"', async () => {
        renderPage(<SqlQueue />, { route: '/app/sql-queue', http: http({ 'GET /leads/sql-queue': fail(500) }) });
        await expectLoadError({ emptyText: /sql queue is empty/i });
    });
});
