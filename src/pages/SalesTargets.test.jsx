import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SalesTargets from './SalesTargets';
import { fail, pending, renderPage } from '../test/renderPage';
import { bug, expectLoadError, expectLoading } from '../test/pageAssertions';

const targets = {
    fy: 2026, label: 'FY 2026-27', start_month: 4,
    users: [
        { user_id: 'u-1', name: 'Ada Lovelace', sales_level: 1, quarters: [1000, 0, 0, 0], total: 1000, can_edit: true },
        { user_id: 'u-2', name: 'Bob Builder', sales_level: 3, quarters: [500, 0, 0, 0], total: 500, can_edit: false },
    ],
};
const http = (over = {}) => ({ 'GET /sales/targets': targets, 'PUT /sales/targets': {}, ...over });

describe('SalesTargets page', () => {
    it('shows each person with quarterly targets', async () => {
        renderPage(<SalesTargets />, { route: '/app/sales-targets', http: http() });
        expect(screen.getByRole('heading', { name: 'Revenue targets' })).toBeInTheDocument();
        expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
        expect(screen.getByText('FY 2026-27')).toBeInTheDocument();
        expect(screen.getByText(/Q1 · Apr–Jun/)).toBeInTheDocument();
    });

    it('shows loading', () => {
        renderPage(<SalesTargets />, { route: '/app/sales-targets', http: http({ 'GET /sales/targets': pending() }) });
        expectLoading();
    });

    it('edits only the rows the API marks editable and saves on blur', async () => {
        const { http: h } = renderPage(<SalesTargets />, { route: '/app/sales-targets', http: http() });
        await screen.findByText('Ada Lovelace');
        const inputs = screen.getAllByRole('spinbutton');
        expect(inputs).toHaveLength(4); // Bob's row is read-only
        await userEvent.clear(inputs[1]);
        await userEvent.type(inputs[1], '2500');
        await userEvent.tab();
        await waitFor(() => expect(h.requests.find(r => r.method === 'PUT')?.body).toEqual({ user_id: 'u-1', fy: 2026, quarter: 2, amount: 2500 }));
    });

    bug('reports a failed load', 'query error ignored: renders an empty table with zero totals', async () => {
        renderPage(<SalesTargets />, { route: '/app/sales-targets', http: http({ 'GET /sales/targets': fail(500) }) });
        await expectLoadError();
    });
});
