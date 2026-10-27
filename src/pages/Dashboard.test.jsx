import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import Dashboard from './Dashboard';
import { fail, pending, renderPage } from '../test/renderPage';
import { bug, expectLoadError, expectLoading } from '../test/pageAssertions';
import { campaign, campaignPage } from '../test/fixtures/campaigns';

const http = (over = {}) => ({
    'GET /reports/global-analytics': { timeseries: [] },
    'GET /campaigns': campaignPage([campaign('c-1', { campaign_name: 'Autumn push' })]),
    'GET /deliverability/dashboard-alerts': [],
    ...over,
});

describe('Dashboard page', () => {
    it('greets the user and lists campaigns', async () => {
        renderPage(<Dashboard />, { route: '/app/analytics', http: http() });
        expect(await screen.findByRole('heading', { name: /ada/i })).toBeInTheDocument();
        expect((await screen.findAllByText('Autumn push')).length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: /create new campaign/i })).toBeInTheDocument();
    });

    it('shows the loading screen first', () => {
        renderPage(<Dashboard />, { route: '/app/analytics', http: http({ 'GET /campaigns': pending() }) });
        expectLoading();
    });

    it('hides "Create New Campaign" without manage_campaigns', async () => {
        renderPage(<Dashboard />, { route: '/app/analytics', role: 'AGENT', user: { permissions: [] }, http: http() });
        await screen.findAllByText('Autumn push');
        expect(screen.queryByRole('button', { name: /create new campaign/i })).toBeNull();
    });

    bug('reports a failed campaign load instead of "No campaigns yet"', 'useDashboard ignores the campaigns query error', async () => {
        renderPage(<Dashboard />, { route: '/app/analytics', http: http({ 'GET /campaigns': fail(500) }) });
        await expectLoadError({ emptyText: /no campaigns yet/i });
    });
});
