import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import SalesDashboard from './SalesDashboard';
import { fail, pending, renderPage } from '../test/renderPage';
import { bug, expectLoadError, expectLoading } from '../test/pageAssertions';
import { owners } from '../test/fixtures/sales';

const dashboard = {
    role_view: 'BUSINESS_EXECUTIVE', period: { from: '2026-08-01', to: '2026-10-27' },
    kpis: { new_leads: 12, sqls: 3, open_sqls: 2, opportunities_created: 4, lost_count: 1, open_pipeline: 50000, open_opportunities: 3,
        weighted_pipeline: 10000, won_amount: 20000, won_count: 1, win_rate: 50, average_deal: 20000 },
    funnel: [{ key: 'sent', label: 'Contacts emailed', count: 100 }, { key: 'won', label: 'Won', count: 1, from_previous: 1 }],
    queue: { sql_leads: [], next_steps_due: [] }, teams: [], leaderboard: [],
};
const http = (over = {}) => ({
    'GET /contacts/owners': owners,
    'GET /sales-reports/dashboard': dashboard,
    'GET /sales-reports/daily-limit': { reached: false, used_today: 5, limit: 100 },
    'GET /opportunities': { items: [], total: 0 },
    ...over,
});

describe('SalesDashboard page', () => {
    it('shows the role view title, KPIs and funnel', async () => {
        renderPage(<SalesDashboard />, { route: '/app/sales', http: http() });
        expect(await screen.findByRole('heading', { name: 'My sales dashboard' })).toBeInTheDocument();
        expect(screen.getByText('New leads')).toBeInTheDocument();
        expect(screen.getByText('Contacts emailed')).toBeInTheDocument();
        expect(screen.getByText(/5 of 100/)).toBeInTheDocument();
    });

    it('shows a spinner while loading', () => {
        renderPage(<SalesDashboard />, { route: '/app/sales', http: http({ 'GET /sales-reports/dashboard': pending() }) });
        expect(screen.getByRole('heading', { name: 'Sales dashboard' })).toBeInTheDocument();
        expectLoading();
    });

    bug('reports a failed load', 'query error ignored: the spinner stays forever (isLoading || !data)', async () => {
        renderPage(<SalesDashboard />, { route: '/app/sales', http: http({ 'GET /sales-reports/dashboard': fail(500) }) });
        await expectLoadError();
    });
});
