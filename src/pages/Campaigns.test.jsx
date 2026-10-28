import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Campaigns from './Campaigns';
import { FAIL_REQUEST_ID, fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { campaign, campaignPage } from '../test/fixtures/campaigns';

const all = [campaign('c-1', { campaign_name: 'Autumn push' }), campaign('c-2', { campaign_name: 'Winter promo', status: 'DRAFT' })];
const http = (over = {}) => ({
    'GET /campaigns': (req) => campaignPage(all.filter(c => !req.query.campaign_name || c.campaign_name.toLowerCase().includes(req.query.campaign_name.toLowerCase()))),
    ...over,
});
const opts = (over) => ({ route: '/app/campaigns', http: http(over) });

describe('Campaigns page', () => {
    it('lists campaigns', async () => {
        renderPage(<Campaigns />, opts());
        expect(await screen.findByRole('heading', { name: 'Campaigns' })).toBeInTheDocument();
        expect(screen.getByText('Autumn push')).toBeInTheDocument();
        expect(screen.getByText('Winter promo')).toBeInTheDocument();
    });

    it('shows the loading screen', () => {
        renderPage(<Campaigns />, opts({ 'GET /campaigns': pending() }));
        expectLoading();
    });

    it('reports a failed load with its reference', async () => {
        renderPage(<Campaigns />, opts({ 'GET /campaigns': fail(500) }));
        await expectLoadError({ emptyText: /no campaigns/i });
        expect(screen.getByText(FAIL_REQUEST_ID)).toBeInTheDocument();
    });

    it('searches by name on the server', async () => {
        const { http: h } = renderPage(<Campaigns />, opts());
        await userEvent.type(await screen.findByPlaceholderText('Search...'), 'winter');
        await waitFor(() => expect(screen.queryByText('Autumn push')).toBeNull());
        expect(screen.getByText('Winter promo')).toBeInTheDocument();
        expect(h.requests.some(r => r.query.campaign_name === 'winter')).toBe(true);
    });
});
