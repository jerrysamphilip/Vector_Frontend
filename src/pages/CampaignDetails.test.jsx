import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CampaignDetails from './CampaignDetails';
import { FAIL_REQUEST_ID, fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { campaign } from '../test/fixtures/campaigns';

const analytics = { metrics: { sent: 10, opened: 4, replied: 1 }, lead_stats: { total: 3 }, total_messages_sent: 10, timeseries: [], sequences: [] };
const http = (over = {}) => ({
    'GET /campaigns/:id': (req) => campaign(req.params.id, { campaign_name: 'Autumn push', sending_inboxes: ['i-1'], row_version: 1 }),
    'GET /campaigns/:id/analytics': analytics,
    'GET /campaigns/:id/schedule': { items: [] },
    'GET /inboxes': [{ inbox_id: 'i-1', email_address: 'sales@acme.test', sent_today: 2, daily_limit: 50 }],
    'GET /campaigns/:id/prospects': [{ prospect_id: 'p-1', first_name: 'Pat', last_name: 'Prospect', email: 'pat@acme.test', status: 'ACTIVE' }],
    'GET /prospect-lists': { items: [] },
    'GET /campaigns/:id/*': { items: [] },
    ...over,
});
const opts = (over, role) => ({ route: '/app/campaigns/:id', path: '/app/campaigns/c-1', role, http: http(over) });

describe('CampaignDetails page', () => {
    it('shows the campaign header and its analytics', async () => {
        renderPage(<CampaignDetails />, opts());
        expect(await screen.findByRole('heading', { level: 1, name: 'Autumn push' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /pause campaign/i })).toBeInTheDocument();
    });

    it('shows the loading screen', () => {
        renderPage(<CampaignDetails />, opts({ 'GET /campaigns/:id': pending() }));
        expectLoading();
    });

    it('reports a failed load with its reference', async () => {
        renderPage(<CampaignDetails />, opts({ 'GET /campaigns/:id': fail(500) }));
        await expectLoadError({ emptyText: /campaign not found/i });
        expect(screen.getByText(FAIL_REQUEST_ID)).toBeInTheDocument();
    });

    it('says "Campaign not found" for a 404', async () => {
        renderPage(<CampaignDetails />, opts({ 'GET /campaigns/:id': fail(404, 'Not found') }));
        expect(await screen.findByText('Campaign not found')).toBeInTheDocument();
    });

    it('opens the Prospects tab, which loads the campaign\'s prospects', async () => {
        const { http: h } = renderPage(<CampaignDetails />, opts());
        await screen.findByRole('heading', { level: 1, name: 'Autumn push' });
        const before = h.requests.length;
        await userEvent.click(screen.getByRole('button', { name: /^prospects/i }));
        await waitFor(() => expect(h.requests.slice(before).some(r => r.path === '/campaigns/c-1/prospects')).toBe(true));
        expect(await screen.findByText(/pat@acme.test/)).toBeInTheDocument();
    });
});
