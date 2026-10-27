import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import Reports from './Reports';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';

const summary = {
    kpis: { total_emails_sent: 1234, total_opened: 400, total_replied: 50, total_bounced: 10, total_leads_contacted: 300, total_clicked: 7 },
    timeseries: [], lead_stats: {}, campaign_stats: {}, mailbox_stats: {}, providers: [], mailbox_health: [],
    top_campaigns: [], optimization: {}, user_breakdown: [],
};
const http = (over = {}) => ({ 'GET /reports/dashboard-summary': summary, ...over });

describe('Reports page', () => {
    it('shows the KPIs for the range', async () => {
        renderPage(<Reports />, { route: '/app/reports', http: http() });
        expect(screen.getByRole('heading', { name: 'Analytics & Reports' })).toBeInTheDocument();
        expect((await screen.findAllByText('1,234')).length).toBeGreaterThan(0);
    });

    it('shows loading', () => {
        renderPage(<Reports />, { route: '/app/reports', http: http({ 'GET /reports/dashboard-summary': pending() }) });
        expectLoading();
    });

    it('reports a failed load', async () => {
        renderPage(<Reports />, { route: '/app/reports', http: http({ 'GET /reports/dashboard-summary': fail(500) }) });
        await expectLoadError();
        expect(screen.getByText(/could not load reports/i)).toBeInTheDocument();
    });
});
