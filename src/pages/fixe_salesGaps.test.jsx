// Sales UAT gap fixes (fix agent E): E4 Tasks and Lost on the team scorecard, E5 won/lost period on the
// Pipeline report tab, E8 leaderboard ranked by % of target.
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SalesReports from './SalesReports';
import { pending, renderPage } from '../test/renderPage';
import { owners } from '../test/fixtures/sales';

const rep = (over = {}) => ({
    user_id: 'u-1', name: 'Ada Lovelace', level_label: 'Business Executive', activities: 9, calls: 2, meetings: 1, tasks_done: 4,
    emails_sent: 2, leads: 3, sqls: 2, opportunities: 1, won_count: 1, lost_count: 5, won_amount: 1000, lead_to_sql: 50,
    sql_to_opportunity: 50, win_rate: 16.7, ...over,
});
const team = { period: { from: '2026-08-01', to: '2026-10-30' }, reps: [rep()], totals: rep({ tasks_done: 4, lost_count: 5 }) };
const pipeline = { period: null, by_owner: [{ owner_id: 'u-1', owner_name: 'Pipeline Owner', open_count: 2, open_amount: 100, weighted: 10,
    won_amount: 0, won_count: 0, lost_count: 0, win_rate: null }], by_close_month: [] };
const targets = { fy: 2026, fy_label: 'FY 2026-27', quarter: null, start: '2026-04-01', end: '2027-03-31', rows: [],
    totals: { target: null, won: 0, commit: 0, best_case: 0, attainment: null } };
const boardRow = (over) => ({ rank: 1, user_id: 'u-1', name: 'Ada', level_label: null, won_amount: 5000, won_count: 1, sqls: 0,
    activities: 0, win_rate: 100, target: 10000, attainment: 50, ...over });
const leaderboard = (req) => ({ period: {}, sort: req.query.sort, rows: req.query.sort === 'attainment'
    ? [boardRow({ user_id: 'u-2', name: 'Bob', won_amount: 2000, target: 1000, attainment: 200 }), boardRow({ rank: 2 })]
    : [boardRow(), boardRow({ rank: 2, user_id: 'u-2', name: 'Bob', won_amount: 2000, target: 1000, attainment: 200 })] });
const http = (over = {}) => ({
    'GET /contacts/owners': owners,
    'GET /sales-reports/team-performance': team,
    'GET /sales-reports/pipeline': pipeline,
    'GET /sales-reports/targets': targets,
    'GET /sales-reports/leaderboard': leaderboard,
    'GET /sales-reports/leads': pending(),
    'GET /sales-reports/funnel': pending(),
    ...over,
});

describe('Team performance scorecard (E4)', () => {
    it('shows Tasks and Lost columns', async () => {
        renderPage(<SalesReports />, { route: '/app/sales-reports', path: '/app/sales-reports?tab=team', http: http() });
        const table = (await screen.findByText('Ada Lovelace')).closest('table');
        const headers = within(table).getAllByRole('columnheader').map(h => h.textContent);
        expect(headers).toEqual(expect.arrayContaining(['Tasks', 'Lost']));
        const row = screen.getByText('Ada Lovelace').closest('tr');
        const cells = within(row).getAllByRole('cell').map(c => c.textContent);
        expect(cells[headers.indexOf('Tasks')]).toBe('4');
        expect(cells[headers.indexOf('Lost')]).toBe('5');
    });
});

describe('Pipeline report period (E5)', () => {
    it('asks for won / lost in the chosen period and says open pipeline is as of now', async () => {
        const { http: calls } = renderPage(<SalesReports />, { route: '/app/sales-reports', path: '/app/sales-reports?tab=pipeline', http: http() });
        expect(await screen.findByText('Pipeline Owner')).toBeInTheDocument();
        expect(screen.getByText(/open deals and amounts are as of now/i)).toHaveTextContent('at any time');
        expect(calls.requests.find(r => r.path === '/sales-reports/pipeline').query.date_from).toBeUndefined();
        await userEvent.selectOptions(screen.getByLabelText('Won and lost period'), '30');
        await waitFor(() => expect(calls.requests.filter(r => r.path === '/sales-reports/pipeline').at(-1).query.date_from).toBeTruthy());
        expect(await screen.findByText(/open deals and amounts are as of now/i)).toHaveTextContent('last 30 days');
    });
});

describe('Leaderboard ranking (E8)', () => {
    it('toggles between revenue and % of target', async () => {
        const { http: calls } = renderPage(<SalesReports />, { route: '/app/sales-reports', path: '/app/sales-reports?tab=targets', http: http() });
        const firstRep = () => within(screen.getByText('Leaderboard').closest('div').parentElement).getAllByRole('row')[1];
        await screen.findByText('Bob');
        expect(firstRep()).toHaveTextContent('Ada');
        await userEvent.click(screen.getByRole('button', { name: 'By % of target' }));
        await waitFor(() => expect(firstRep()).toHaveTextContent('Bob'));
        expect(firstRep()).toHaveTextContent('200%');
        expect(calls.requests.filter(r => r.path === '/sales-reports/leaderboard').at(-1).query.sort).toBe('attainment');
    });
});
