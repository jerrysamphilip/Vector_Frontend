import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import Dashboard from './Dashboard';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
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

    it('reports a failed campaign load instead of "No campaigns yet"', async () => {
        renderPage(<Dashboard />, { route: '/app/analytics', http: http({ 'GET /campaigns': fail(500) }) });
        await expectLoadError({ emptyText: /no campaigns yet/i });
    });

    it('rates the Campaign Status table over delivered (sent - bounced), like the other screens (A5-U4)', async () => {
        const b = campaign('c-b', { campaign_name: 'Campaign B', sent_count: 42, bounced_count: 2, opened_count: 8, replied_count: 1 });
        renderPage(<Dashboard />, { route: '/app/analytics', http: http({ 'GET /campaigns': campaignPage([b]) }) });
        const name = (await screen.findAllByText('Campaign B')).find(el => el.closest('tr'));
        const row = within(name.closest('tr'));
        expect(row.getByText('42')).toBeInTheDocument();
        expect(row.getByText('20.0%')).toBeInTheDocument();
        expect(row.getByText('2.5%')).toBeInTheDocument();
    });

    it('labels opens as unique contacts (A5-U3)', async () => {
        renderPage(<Dashboard />, { route: '/app/analytics', http: http() });
        await screen.findAllByText('Autumn push');
        expect(screen.getAllByText('Opened (unique)')).toHaveLength(2);
        expect(screen.queryByText('Total Opens')).toBeNull();
        expect(screen.queryByText('Opens')).toBeNull();
    });
});
