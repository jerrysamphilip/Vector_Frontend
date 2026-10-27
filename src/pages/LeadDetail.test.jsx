import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeadDetail from './LeadDetail';
import { FAIL_REQUEST_ID, fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { lead, leadsMeta, owners } from '../test/fixtures/sales';

const http = (over = {}) => ({
    'GET /leads/meta': leadsMeta,
    'GET /contacts/owners': owners,
    'GET /leads/:id': (req) => lead(req.params.id, { contact_name: 'Carol Contact', stage: 'SQL', stage_label: 'Sales qualified (SQL)' }),
    'GET /tasks': { items: [], total: 0 },
    'GET /contacts/:id/timeline': { items: [] },
    ...over,
});
const opts = (over) => ({ route: '/app/leads/:id', path: '/app/leads/l-1', http: http(over) });

describe('LeadDetail page', () => {
    it('shows the lead with its actions', async () => {
        renderPage(<LeadDetail />, opts());
        expect(await screen.findByRole('heading', { level: 1, name: /carol contact/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /convert to opportunity/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /disqualify/i })).toBeInTheDocument();
    });

    it('shows a spinner while loading', () => {
        renderPage(<LeadDetail />, opts({ 'GET /leads/:id': pending() }));
        expectLoading();
    });

    it('reports a failed load with its reference', async () => {
        renderPage(<LeadDetail />, opts({ 'GET /leads/:id': fail(500) }));
        await expectLoadError({ emptyText: /lead not found/i });
        expect(screen.getByText(FAIL_REQUEST_ID)).toBeInTheDocument();
    });

    it('says "not found" for a 404', async () => {
        renderPage(<LeadDetail />, opts({ 'GET /leads/:id': fail(404, 'Not found') }));
        expect(await screen.findByText('Lead not found')).toBeInTheDocument();
    });

    it('opens the convert dialog', async () => {
        renderPage(<LeadDetail />, opts());
        await userEvent.click(await screen.findByRole('button', { name: /convert to opportunity/i }));
        expect(within(await screen.findByRole('dialog')).getByRole('button', { name: /create opportunity/i })).toBeInTheDocument();
    });
});
