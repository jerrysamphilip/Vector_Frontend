import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from './Home';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { task } from '../test/fixtures/crm';
import { opportunity } from '../test/fixtures/sales';

const dashboard = {
    kpis: { new_leads: 7, sqls: 2, open_pipeline: 40000, open_opportunities: 2, weighted_pipeline: 8000, won_amount: 0, won_count: 0, win_rate: 0 },
    funnel: [{ key: 'sent', label: 'Contacts emailed', count: 50 }],
    queue: { deals_closing: [opportunity('o-1', { name: 'Closing soon deal' })], sql_leads: [], next_steps_due: [] },
};
const http = (over = {}) => ({
    'GET /tasks': { items: [task('t-1', { title: 'Call Carol today' })], total: 1 },
    'GET /leads/reply-suggestions': { items: [] },
    'GET /opportunities': { items: [], total: 0 },
    'GET /sales-reports/dashboard': dashboard,
    'GET /sales-reports/targets': { totals: { target: 0, won: 0 } },
    'PATCH /tasks/:id': {},
    ...over,
});

describe('Home page', () => {
    it('greets the user and shows today and the quarter', async () => {
        renderPage(<Home />, { route: '/app/dashboard', http: http() });
        expect(screen.getByRole('heading', { level: 1, name: /ada/i })).toBeInTheDocument();
        expect(await screen.findByText('Call Carol today')).toBeInTheDocument();
        expect(await screen.findByText('Closing soon deal')).toBeInTheDocument();
        expect(screen.getByText('No stale deals. Nice.')).toBeInTheDocument();
    });

    it('shows loading placeholders', () => {
        renderPage(<Home />, { route: '/app/dashboard', http: http({ 'GET /sales-reports/dashboard': pending() }) });
        expectLoading();
    });

    it('completes a task from "My day"', async () => {
        const { http: h } = renderPage(<Home />, { route: '/app/dashboard', http: http() });
        await userEvent.click(await screen.findByLabelText('Complete Call Carol today'));
        await waitFor(() => expect(h.requests.find(r => r.method === 'PATCH')?.body).toEqual({ status: 'DONE' }));
    });

    it('reports a failed dashboard load', async () => {
        renderPage(<Home />, { route: '/app/dashboard', http: http({ 'GET /sales-reports/dashboard': fail(500) }) });
        await expectLoadError();
    });
});
