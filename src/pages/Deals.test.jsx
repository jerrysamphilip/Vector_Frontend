import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Deals from './Deals';
import { fail, pending, renderPage } from '../test/renderPage';
import { bug, expectLoadError, expectLoading } from '../test/pageAssertions';
import { leadsMeta, opportunity, owners, salesStages } from '../test/fixtures/sales';

const board = { columns: [
    { stage_id: 's-1', name: 'Qualification', probability: 10, count: 1, amount: 50000, weighted: 5000, items: [opportunity('o-1', { name: 'Website rebuild' })] },
    { stage_id: 's-2', name: 'Proposal', probability: 50, count: 0, amount: 0, weighted: 0, items: [] },
] };
const http = (over = {}) => ({
    'GET /contacts/owners': owners,
    'GET /sales/stages': salesStages,
    'GET /leads/meta': leadsMeta,
    'GET /opportunities/board': board,
    'GET /opportunities': { items: [opportunity('o-2', { name: 'Listed deal' })], total: 1, total_amount: 50000 },
    ...over,
});
const opts = (over, role, path = '/app/deals') => ({ route: '/app/deals', path, role, http: http(over) });

describe('Deals page', () => {
    it('shows the pipeline board', async () => {
        renderPage(<Deals />, opts());
        expect(screen.getByRole('heading', { name: 'Opportunities' })).toBeInTheDocument();
        expect(await screen.findByText('Website rebuild')).toBeInTheDocument();
        expect(screen.getByText('Drop deals here')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /stages/i })).toBeInTheDocument();
    });

    it('shows a spinner while the board loads', () => {
        renderPage(<Deals />, opts({ 'GET /opportunities/board': pending() }));
        expectLoading();
    });

    it('hides stage management from an AGENT', async () => {
        renderPage(<Deals />, opts({}, 'AGENT'));
        await screen.findByText('Website rebuild');
        expect(screen.queryByRole('button', { name: /^stages$/i })).toBeNull();
    });

    it('switches to the list view', async () => {
        renderPage(<Deals />, opts());
        await screen.findByText('Website rebuild');
        await userEvent.click(screen.getByRole('button', { name: /list/i }));
        expect(await screen.findByText('Listed deal')).toBeInTheDocument();
    });

    bug('reports a failed board load', 'board query error ignored: renders an empty board', async () => {
        renderPage(<Deals />, opts({ 'GET /opportunities/board': fail(500) }));
        await expectLoadError();
    });

    bug('reports a failed list load instead of "No opportunities"', 'list query error ignored: shows the empty state', async () => {
        renderPage(<Deals />, opts({ 'GET /opportunities': fail(500) }, undefined, '/app/deals?mode=list'));
        await expectLoadError({ emptyText: /no opportunities/i });
    });
});
