import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SalesTeam from './SalesTeam';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';

const hierarchy = (canEdit) => ({
    can_edit: canEdit,
    levels: [{ level: 1, label: 'Head of sales' }, { level: 2, label: 'Manager' }],
    users: [
        { user_id: 'u-1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'ADMIN', sales_level: 1, level_label: 'Head of sales', manager_id: null, direct_reports: 1 },
        { user_id: 'u-2', name: 'Bob Builder', email: 'bob@example.com', role: 'AGENT', sales_level: 2, level_label: 'Manager', manager_id: 'u-1', direct_reports: 0 },
        { user_id: 'u-3', name: 'Cy Outside', email: 'cy@example.com', role: 'AGENT', sales_level: null, manager_id: null },
    ],
});
const opts = (over = {}, canEdit = true, role = 'SUPER_ADMIN') => ({
    route: '/app/sales-team', role, http: { 'GET /team/hierarchy': hierarchy(canEdit), 'PUT /team/hierarchy/:id': {}, ...over },
});

describe('SalesTeam page', () => {
    it('shows the hierarchy tree and people outside it', async () => {
        renderPage(<SalesTeam />, opts());
        expect(screen.getByRole('heading', { name: 'Sales team' })).toBeInTheDocument();
        expect(await screen.findByText('Bob Builder')).toBeInTheDocument();
        expect(screen.getByText(/not in the sales hierarchy \(access/i)).toBeInTheDocument();
    });

    it('shows a spinner while loading', () => {
        renderPage(<SalesTeam />, opts({ 'GET /team/hierarchy': pending() }));
        expectLoading();
    });

    it('is read-only when the API says the viewer cannot edit (AGENT)', async () => {
        renderPage(<SalesTeam />, opts({}, false, 'AGENT'));
        await screen.findByText('Bob Builder');
        expect(screen.queryByLabelText('Level for Bob Builder')).toBeNull();
        expect(screen.getByText(/only admins can change levels/i)).toBeInTheDocument();
    });

    it('changes a level', async () => {
        const { http } = renderPage(<SalesTeam />, opts());
        await userEvent.selectOptions(await screen.findByLabelText('Level for Cy Outside'), '1');
        await waitFor(() => expect(http.requests.some(r => r.method !== 'GET')).toBe(true));
        expect(http.requests.find(r => r.method !== 'GET').body).toEqual({ sales_level: 1, manager_id: null });
    });

    it('reports a failed load', async () => {
        renderPage(<SalesTeam />, opts({ 'GET /team/hierarchy': fail(500) }));
        await expectLoadError();
    });
});
