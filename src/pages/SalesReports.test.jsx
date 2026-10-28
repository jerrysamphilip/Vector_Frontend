import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SalesReports from './SalesReports';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { owners } from '../test/fixtures/sales';

const leads = {
    total: 42, sqls: 6, lead_to_sql_rate: 14.3, average_days_to_sql: 9,
    by_stage: [{ stage: 'NEW', label: 'New', count: 30 }], by_source: [{ source: 'Website', leads: 42, sqls: 6, sql_rate: 14.3 }],
    by_owner: [{ owner_id: 'u-1', owner_name: 'Ada Lovelace', leads: 42, sqls: 6, converted: 2, disqualified: 1 }], disqualified_reasons: [],
};
const sqlToWin = { sql_to_win_rate: 20, won: 1, sqls: 5, sql_to_deal_rate: 40, with_deal: 2, closed_win_rate: 50, lost: 1, open: 3,
    average_days_sql_to_win: 30, won_amount: 1000, no_deal: 3, by_owner: [] };
const pipeline = { by_owner: [{ owner_id: 'u-1', owner_name: 'Pipeline Owner', open_count: 2, open_amount: 100, weighted_amount: 10, won_amount: 0, won_count: 0, lost_count: 0, win_rate: 0 }],
    by_close_month: [{ month: '2026-11', amount: 100, weighted: 10, count: 2 }] };
const http = (over = {}) => ({
    'GET /contacts/owners': owners,
    'GET /sales-reports/leads': leads,
    'GET /sales-reports/funnel': { stages: [{ key: 'sent', label: 'Contacts emailed', count: 100 }] },
    'GET /sales-reports/sql-to-win': sqlToWin,
    'GET /sales-reports/pipeline': pipeline,
    ...over,
});
const opts = (over) => ({ route: '/app/sales-reports', http: http(over) });

describe('SalesReports page', () => {
    it('shows the leads & SQLs report', async () => {
        renderPage(<SalesReports />, opts());
        expect(screen.getByRole('heading', { name: 'Sales reports' })).toBeInTheDocument();
        expect(await screen.findByText('Leads created')).toBeInTheDocument();
        expect(screen.getAllByText('42').length).toBeGreaterThan(0);
        expect(screen.getByText('Where those leads are now')).toBeInTheDocument();
    });

    it('shows a spinner while loading', () => {
        renderPage(<SalesReports />, opts({ 'GET /sales-reports/leads': pending() }));
        expectLoading();
    });

    it('switches to the pipeline tab', async () => {
        renderPage(<SalesReports />, opts());
        await screen.findByText('Leads created');
        await userEvent.click(screen.getByRole('button', { name: 'Pipeline' }));
        expect(await screen.findByText('Pipeline Owner')).toBeInTheDocument();
    });

    it('reports a failed load', async () => {
        renderPage(<SalesReports />, opts({ 'GET /sales-reports/leads': fail(500) }));
        await expectLoadError();
    });
});
