// Sales UAT gap fixes (fix agent B): S2 two "best case" figures, S3 deals without a close date,
// S4 funnel meaning, S5 custom report date order.
import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SalesReports from './SalesReports';
import Deals from './Deals';
import CustomReports from '../components/sales/CustomReports';
import { pending, renderPage } from '../test/renderPage';
import { leadsMeta, opportunity, owners, salesStages } from '../test/fixtures/sales';

const bucket = (over = {}) => ({
    close_from: '2026-04-01', close_to: '2026-06-30', won: 1000, won_count: 1, pipeline: 9000, weighted: 3000, open_count: 3,
    lost: 0, lost_count: 0, forecast: 4000, best_case: 10000, commit: 2500, best_case_category: 4500,
    categories: { COMMIT: 1500, BEST_CASE: 2000, PIPELINE: 5500, OMITTED: 0 }, target: null, attainment: null, ...over,
});
const forecast = {
    fy: 2026, label: 'FY 2026-27', start: '2026-04-01', end: '2027-03-31', fiscal_year_start_month: 4,
    quarters: [{ quarter: 'Q1', label: 'Q1 FY 2026-27', ...bucket() }],
    total: bucket({ close_to: '2027-03-31' }),
    years: [{ fy: 2026, label: 'FY 2026-27', ...bucket() }],
    open_without_close_date: { count: 4, amount: 7000 },
};
const leads = {
    total: 10, sqls: 12, lead_to_sql_rate: null, average_days_to_sql: 3,
    by_stage: [{ stage: 'NEW', label: 'New', count: 10 }], by_source: [], by_owner: [], disqualified_reasons: [],
};
const funnel = { stages: [
    { key: 'sent', label: 'Contacts emailed', count: 100, from_previous: null },
    { key: 'replied', label: 'Replied', count: 20, from_previous: 20 },
    { key: 'lead', label: 'Leads', count: 10, from_previous: 50 },
    { key: 'sql', label: 'SQLs', count: 12, from_previous: 120 },   // over 100%: never shown
    { key: 'opportunity', label: 'Opportunities', count: 6, from_previous: 50 },
    { key: 'won', label: 'Won', count: 2, from_previous: 33.3 },
] };
const sqlToWin = { sql_to_win_rate: 20, won: 1, sqls: 5, sql_to_deal_rate: 40, with_deal: 2, closed_win_rate: 50, lost: 1, open: 3,
    average_days_sql_to_win: 30, won_amount: 1000, no_deal: 3, by_owner: [] };
const reportsHttp = {
    'GET /contacts/owners': owners,
    'GET /sales-reports/leads': leads,
    'GET /sales-reports/funnel': funnel,
    'GET /sales-reports/sql-to-win': sqlToWin,
    'GET /sales-reports/forecast': forecast,
    'GET /sales-reports/forecast-accuracy': pending(),
};

const tile = label => screen.getByText(label, { selector: 'p' }).parentElement;

describe('Forecast: best case figures and undated deals (S2, S3)', () => {
    it('labels "won + all open" apart from the Best case tile, with tooltips', async () => {
        renderPage(<SalesReports />, { route: '/app/sales-reports', http: reportsHttp });
        await screen.findByText('Leads created');
        await userEvent.click(screen.getByRole('button', { name: 'Forecast' }));
        await screen.findByText('Open pipeline', { selector: 'p' });

        const open = tile('Open pipeline');
        expect(open).toHaveTextContent('3 deals · won + all open (upside)');
        expect(open).not.toHaveTextContent(/best case/i);
        expect(open.getAttribute('title')).toMatch(/won \+ all open/i);
        expect(open.getAttribute('title')).toMatch(/Best case.*commit/);

        const best = tile('Best case');
        expect(best).toHaveTextContent('Commit + best-case deals');
        expect(best.getAttribute('title')).toMatch(/Commit.*Best case/);
        expect(screen.getAllByText('Best case', { selector: 'p' })).toHaveLength(1);
    });

    it('links the no-close-date tile to the deal list filtered to those deals', async () => {
        renderPage(<SalesReports />, { route: '/app/sales-reports', http: reportsHttp });
        await screen.findByText('Leads created');
        await userEvent.click(screen.getByRole('button', { name: 'Forecast' }));
        const link = (await screen.findByText('Open, no close date')).closest('a');
        expect(link).not.toBeNull();
        expect(link.getAttribute('href')).toBe('/app/deals?mode=list&status=OPEN&no_close_date=1');
        expect(link).toHaveTextContent('4 deals not in the forecast');
    });

    it('the deal list reads no_close_date from the URL and asks the API for it', async () => {
        const { http } = renderPage(<Deals />, {
            route: '/app/deals', path: '/app/deals?status=OPEN&no_close_date=1',
            http: {
                'GET /contacts/owners': owners, 'GET /sales/stages': salesStages, 'GET /leads/meta': leadsMeta,
                'GET /opportunities': { items: [opportunity('o-9', { name: 'Undated deal', close_date: null })], total: 1, total_amount: 50000 },
            },
        });
        expect(await screen.findByText('Undated deal')).toBeInTheDocument();
        const calls = http.requests.filter(r => r.path === '/opportunities');
        expect(calls.length).toBeGreaterThan(0);
        expect(calls.at(-1).query).toMatchObject({ no_close_date: 'true', status: 'OPEN' });
        expect(screen.getByText('No close date')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Clear no close date filter' })).toBeInTheDocument();
    });
});

describe('Funnel meaning (S4)', () => {
    it('captions the funnel, explains each step and hides ratios over 100%', async () => {
        renderPage(<SalesReports />, { route: '/app/sales-reports', http: reportsHttp });
        await screen.findByText('Leads created');
        expect(screen.getByTestId('funnel-caption')).toHaveTextContent(
            'Each step counts records created in the period; steps are not a cohort, so a step can exceed the one before.');
        const step = label => screen.getByText(label, { selector: 'span.truncate' }).parentElement;
        expect(step('SQLs').getAttribute('title')).toMatch(/became sales-qualified \(SQL\) in the period/);
        expect(step('Opportunities').getAttribute('title')).toMatch(/deals created in the period/);
        expect(step('Won').getAttribute('title')).toMatch(/closed as won in the period/);
        expect(step('Contacts emailed').getAttribute('title')).toMatch(/distinct contacts/);
        expect(step('SQLs')).not.toHaveTextContent('120%');
        expect(step('SQLs')).toHaveTextContent('—');
        expect(step('Leads')).toHaveTextContent('50% of previous');
    });

    it('labels the SQL → won rate with its base', async () => {
        renderPage(<SalesReports />, { route: '/app/sales-reports', http: reportsHttp });
        const card = await screen.findByTestId('sql-to-win');
        expect(await within(card).findByText('1 of 5 leads that became SQL in the period')).toBeInTheDocument();
        const rate = within(card).getByText('SQL → won', { selector: 'p' }).parentElement;
        expect(rate.getAttribute('title')).toMatch(/Base: leads that became SQL in the period/);
    });
});

describe('Custom reports date order (S5)', () => {
    const meta = { can_build: true, operators: { is: 'is' }, objects: {
        leads: { label: 'Leads', fields: { stage: 'Stage' }, measures: { count: 'Count' }, dates: { created_at: 'Created' } },
        deals: { label: 'Deals', fields: { stage: 'Stage' }, measures: { count: 'Count' }, dates: { created_at: 'Created' } },
    } };
    it('flags To before From and does not run the report', async () => {
        const { http } = renderPage(<CustomReports />, { route: '/', http: { 'GET /reports/custom/meta': meta, 'GET /reports/custom': [] } });
        await userEvent.selectOptions(await screen.findByLabelText('Date field'), 'created_at');
        await userEvent.type(screen.getByLabelText('From'), '2026-06-30');
        await userEvent.type(screen.getByLabelText('To'), '2026-05-01');
        expect(screen.getByRole('alert')).toHaveTextContent('The end date is before the start date');
        const runButton = screen.getByRole('button', { name: /run/i });
        expect(runButton).toBeDisabled();
        await userEvent.click(runButton);
        expect(http.requests.some(r => r.path === '/reports/custom/run')).toBe(false);

        await userEvent.clear(screen.getByLabelText('To'));
        await userEvent.type(screen.getByLabelText('To'), '2026-07-01');
        expect(screen.queryByRole('alert')).toBeNull();
        expect(screen.getByRole('button', { name: /run/i })).toBeEnabled();
    });
});
