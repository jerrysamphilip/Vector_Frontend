import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Leads from './Leads';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { lead, leadsMeta, owners } from '../test/fixtures/sales';

const leads = [lead('l-1', { contact_name: 'Carol Contact' }), lead('l-2', { contact_name: 'Dan Driver', stage: 'SQL', stage_label: 'SQL' })];
const http = (over = {}) => ({
    'GET /leads/reply-suggestions': { items: [] },
    'GET /contacts/owners': owners,
    'GET /leads/meta': leadsMeta,
    'GET /leads': { items: leads, total: 2, page: 1, page_size: 200 },
    'GET /leads/:id': (req) => leads.find(l => l.lead_id === req.params.id),
    'GET /tasks': { items: [], total: 0 },
    'GET /contacts/:id/timeline': { items: [] },
    ...over,
});
const opts = (over) => ({ route: '/app/leads', http: http(over) });

describe('Leads page', () => {
    it('lists open leads and opens the first one', async () => {
        renderPage(<Leads />, opts());
        expect(screen.getByRole('heading', { name: 'Leads' })).toBeInTheDocument();
        expect(await screen.findByText('Dan Driver')).toBeInTheDocument();
        expect(await screen.findByRole('heading', { level: 1, name: /carol contact/i })).toBeInTheDocument();
    });

    it('shows a spinner while loading', () => {
        renderPage(<Leads />, opts({ 'GET /leads': pending() }));
        expectLoading();
    });

    it('opens another lead from the list', async () => {
        renderPage(<Leads />, opts());
        await userEvent.click(await screen.findByText('Dan Driver'));
        expect(await screen.findByRole('heading', { level: 1, name: /dan driver/i })).toBeInTheDocument();
    });

    it('opens the new-lead dialog', async () => {
        renderPage(<Leads />, opts());
        await userEvent.click(screen.getByRole('button', { name: /new lead/i }));
        expect(within(await screen.findByRole('dialog')).getByPlaceholderText('Search your contacts…')).toBeInTheDocument();
    });

    it('reports a failed load instead of "No leads here"', async () => {
        renderPage(<Leads />, opts({ 'GET /leads': fail(500) }));
        await expectLoadError({ emptyText: /no leads here/i });
    });
});
