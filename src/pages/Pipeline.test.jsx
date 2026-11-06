import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pipeline from './Pipeline';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { owners } from '../test/fixtures/sales';

const ct = { NEW: { amount: 30000, count: 1 }, EXISTING: { amount: 0, count: 0 } };
const revenue = {
    totals: { open_amount: 30000, open_count: 1, weighted_amount: 3000, won_amount: 0, won_count: 0, lost_amount: 0, lost_count: 0, by_client_type: ct },
    stages: [{ stage_id: 's-1', name: 'Qualification', probability: 10, status: 'OPEN', count: 1, amount: 30000, weighted: 3000, new_amount: 30000, existing_amount: 0 }],
};
const proposals = { columns: [{ status: 'SENT', label: 'Sent', count: 1, amount: 1000, items: [
    { proposal_id: 'p-1', opportunity_id: 'o-1', title: 'Website rebuild', company_name: 'Acme', amount: 1000, client_type: 'NEW', owner_name: 'Ada', sent_at: '2026-10-01T00:00:00Z' }] }] };
const http = (over = {}) => ({ 'GET /contacts/owners': owners, 'GET /pipeline/revenue': revenue, 'GET /proposals': proposals, ...over });

describe('Pipeline page', () => {
    it('shows the revenue pipeline by stage', async () => {
        renderPage(<Pipeline />, { route: '/app/pipeline', http: http() });
        expect(screen.getByRole('heading', { name: 'Pipeline' })).toBeInTheDocument();
        expect(await screen.findByText('Open pipeline by stage')).toBeInTheDocument();
        expect(screen.getAllByText('Qualification').length).toBeGreaterThan(0);
    });

    it('shows a spinner while loading', () => {
        renderPage(<Pipeline />, { route: '/app/pipeline', http: http({ 'GET /pipeline/revenue': pending() }) });
        expectLoading();
    });

    it('switches to the proposal pipeline', async () => {
        renderPage(<Pipeline />, { route: '/app/pipeline', http: http() });
        await screen.findByText('Open pipeline by stage');
        await userEvent.click(screen.getByRole('button', { name: 'Proposal pipeline' }));
        expect(await screen.findByText('Website rebuild')).toBeInTheDocument();
    });

    it('filters the revenue pipeline by expected close date', async () => {
        const { http: calls } = renderPage(<Pipeline />, { route: '/app/pipeline', http: http() });
        await screen.findByText('Open pipeline by stage');
        expect(calls.requests.find(r => r.path === '/pipeline/revenue').query.close_from).toBeUndefined();
        fireEvent.change(screen.getByLabelText('Expected close from'), { target: { value: '2026-04-01' } });
        fireEvent.change(screen.getByLabelText('Expected close to'), { target: { value: '2026-06-30' } });
        await waitFor(() => {
            const last = calls.requests.filter(r => r.path === '/pipeline/revenue').at(-1);
            expect(last.query).toMatchObject({ close_from: '2026-04-01', close_to: '2026-06-30' });
        });
        expect(await screen.findByText('Open pipeline by stage')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Clear dates' }));
        expect(screen.getByLabelText('Expected close from')).toHaveValue('');
    });

    it('reports a failed revenue load', async () => {
        renderPage(<Pipeline />, { route: '/app/pipeline', http: http({ 'GET /pipeline/revenue': fail(500) }) });
        await expectLoadError();
    });
});
