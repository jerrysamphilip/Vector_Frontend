import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SalesSettings from './SalesSettings';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { owners } from '../test/fixtures/sales';

const settings = (canEdit = true) => ({
    can_edit: canEdit, lead_assignment: { mode: 'off', users: [], regions: [] },
    disqualify_reasons: ['No budget'], default_recycle_days: 90, win_reasons: ['Price'], loss_reasons: ['Competitor'],
    require_close_reason: false, stale_deal_days: 14, amount_hidden_roles: [], amount_hidden_levels: [],
});
const http = (over = {}) => ({
    'GET /sales/settings': settings(),
    'PUT /sales/settings': settings(),
    'GET /contacts/owners': owners,
    'GET /workflow/meta': { triggers: [], actions: [], fields: [] },
    'GET /workflow/rules': [],
    'GET /products': [],
    'GET /quotes/approval-settings': { enabled: false, threshold_percent: 10 },
    ...over,
});
const opts = (over, role) => ({ route: '/app/sales-settings', role, http: http(over) });

describe('SalesSettings page', () => {
    it('shows the settings sections for an admin', async () => {
        renderPage(<SalesSettings />, opts());
        expect(await screen.findByRole('heading', { name: 'Sales settings' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Lead assignment' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Who can see amounts' })).toBeInTheDocument();
    });

    it('shows loading', () => {
        renderPage(<SalesSettings />, opts({ 'GET /sales/settings': pending() }));
        expectLoading();
    });

    it('is read-only for an AGENT (can_edit false)', async () => {
        renderPage(<SalesSettings />, opts({ 'GET /sales/settings': settings(false) }, 'AGENT'));
        expect(await screen.findByText('Only admins can change sales settings.')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Lead assignment' })).toBeNull();
    });

    it('switches lead assignment to round robin and shows the pool', async () => {
        renderPage(<SalesSettings />, opts());
        await userEvent.click(await screen.findByRole('button', { name: 'Round robin' }));
        await waitFor(() => expect(screen.getByText('Round-robin pool')).toBeInTheDocument());
        expect(screen.getByLabelText('Bob Builder')).toBeInTheDocument();
    });

    it('reports a failed load', async () => {
        renderPage(<SalesSettings />, opts({ 'GET /sales/settings': fail(500) }));
        await expectLoadError();
    });
});
