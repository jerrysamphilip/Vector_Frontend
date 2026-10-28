import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Prospects from './Prospects';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';

const lists = { items: [{ list_id: 'pl-1', list_name: 'October leads', prospect_count: 120, uploaded_at: '2026-10-01T10:00:00Z' }], total: 1, page: 1, page_size: 20 };
const http = (over = {}) => ({
    'GET /prospects/stats': { total: 120, available: 100, active: 15, opted_out: 5 },
    'GET /prospect-lists': lists,
    ...over,
});
const opts = (over, role) => ({ route: '/app/prospects', role, http: http(over) });

describe('Prospects page', () => {
    it('lists the uploaded prospect lists with totals', async () => {
        renderPage(<Prospects />, opts());
        expect(await screen.findByRole('heading', { name: 'Prospect Lists' })).toBeInTheDocument();
        expect(await screen.findByText('October leads')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /revalidate bounced/i })).toBeInTheDocument();
    });

    it('shows loading', () => {
        renderPage(<Prospects />, opts({ 'GET /prospect-lists': pending(), 'GET /prospects/stats': pending() }));
        expectLoading();
    });

    it('hides the admin-only bounce revalidation from a MANAGER', async () => {
        renderPage(<Prospects />, opts({}, 'MANAGER'));
        await screen.findByText('October leads');
        expect(screen.queryByRole('button', { name: /revalidate bounced/i })).toBeNull();
    });

    it('opens the upload dialog', async () => {
        renderPage(<Prospects />, opts({ 'GET /campaigns': { items: [], total: 0 } }));
        await screen.findByText('October leads');
        await userEvent.click(screen.getByRole('button', { name: /new list/i }));
        expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    it('reports a failed list load instead of the empty state', async () => {
        renderPage(<Prospects />, opts({ 'GET /prospect-lists': fail(500) }));
        await expectLoadError({ emptyText: /no lists yet/i });
    });
});
