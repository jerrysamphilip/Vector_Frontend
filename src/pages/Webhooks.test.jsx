import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Webhooks from './Webhooks';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';

const endpoint = { endpoint_id: 'w-1', url: 'https://hooks.acme.test/in', description: 'CRM sync', event_types: ['contact.created'],
    active: true, consecutive_failures: 0, disabled_reason: null, last_success_at: null, secret_hint: 'whsec_…abcd' };
const http = (over = {}) => ({
    'GET /integrations/webhooks': { items: [endpoint], max_endpoints: 10, max_attempts: 6, disable_after_failures: 20 },
    'GET /integrations/webhooks/event-types': [{ type: 'contact.created', label: 'Contact created', description: 'A contact was added' }],
    ...over,
});
const opts = (over, role) => ({ route: '/app/webhooks', role, http: http(over) });

describe('Webhooks page', () => {
    it('lists endpoints for an admin', async () => {
        renderPage(<Webhooks />, opts());
        expect(screen.getByRole('heading', { name: 'Webhooks' })).toBeInTheDocument();
        expect(await screen.findByText('https://hooks.acme.test/in')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add endpoint/i })).toBeEnabled();
    });

    it('shows loading', () => {
        renderPage(<Webhooks />, opts({ 'GET /integrations/webhooks': pending() }));
        expectLoading();
    });

    it('is admin-only: an AGENT sees a notice and nothing is requested', () => {
        const { http: h } = renderPage(<Webhooks />, opts({}, 'AGENT'));
        expect(screen.getByText('Only admins can manage webhooks.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /add endpoint/i })).toBeNull();
        expect(h.requests).toEqual([]);
    });

    it('opens the add-endpoint dialog', async () => {
        renderPage(<Webhooks />, opts());
        await screen.findByText('https://hooks.acme.test/in');
        await userEvent.click(screen.getByRole('button', { name: /add endpoint/i }));
        expect(within(await screen.findByRole('dialog')).getByText('Contact created')).toBeInTheDocument();
    });

    it('shows the load error', async () => {
        renderPage(<Webhooks />, opts({ 'GET /integrations/webhooks': fail(500) }));
        await expectLoadError();
    });

    it('does not also claim "No webhook endpoints yet" when the load failed', async () => {
        renderPage(<Webhooks />, opts({ 'GET /integrations/webhooks': fail(500) }));
        await expectLoadError({ emptyText: /no webhook endpoints yet/i });
    });
});
