import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DealDetail from './DealDetail';
import { FAIL_REQUEST_ID, fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { leadsMeta, opportunity, owners, salesStages } from '../test/fixtures/sales';

const http = (over = {}) => ({
    'GET /contacts/owners': owners,
    'GET /leads/meta': leadsMeta,
    'GET /sales/stages': salesStages,
    'GET /opportunities/:id': (req) => opportunity(req.params.id, { name: 'Website rebuild' }),
    'PATCH /opportunities/:id': (req) => opportunity('o-1', { name: 'Website rebuild', ...req.body, version: 2 }),
    'GET /opportunities/:id/timeline': { items: [] },
    'GET /proposals': { items: [], columns: [] },
    'GET /tasks': { items: [], total: 0 },
    'GET /opportunities/:id/*': { items: [] },
    ...over,
});
const opts = (over, role) => ({ route: '/app/deals/:id', path: '/app/deals/o-1', role, http: http(over) });

describe('DealDetail page', () => {
    it('shows the opportunity with its stage path', async () => {
        renderPage(<DealDetail />, opts());
        expect(await screen.findByDisplayValue('Website rebuild')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /qualification/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /mark won/i })).toBeInTheDocument();
    });

    it('shows a spinner while loading', () => {
        renderPage(<DealDetail />, opts({ 'GET /opportunities/:id': pending() }));
        expectLoading();
    });

    it('reports a failed load with its reference', async () => {
        renderPage(<DealDetail />, opts({ 'GET /opportunities/:id': fail(500) }));
        await expectLoadError({ emptyText: /opportunity not found/i });
        expect(screen.getByText(FAIL_REQUEST_ID)).toBeInTheDocument();
    });

    it('says "not found" for a 404', async () => {
        renderPage(<DealDetail />, opts({ 'GET /opportunities/:id': fail(404, 'Not found') }));
        expect(await screen.findByText('Opportunity not found')).toBeInTheDocument();
    });

    it('moves the deal to another stage with its version', async () => {
        const { http: h } = renderPage(<DealDetail />, opts());
        await screen.findByDisplayValue('Website rebuild');
        await userEvent.click(screen.getByRole('button', { name: 'Proposal' }));
        await waitFor(() => expect(h.requests.find(r => r.method === 'PATCH')?.body).toMatchObject({ stage_id: 's-2' }));
    });
});
