import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeamManagement from './TeamManagement';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { teamUser, teamUsers } from '../test/fixtures/team';
import { roleOptions } from '../components/team/teamShared';

const http = (over = {}) => ({ 'GET /users': teamUsers, 'GET /team/hierarchy': { can_edit: true, levels: [], users: [] }, ...over });

describe('TeamManagement page', () => {
    it('lists the workspace members', async () => {
        renderPage(<TeamManagement />, { route: '/app/team', http: http() });
        expect(screen.getByRole('heading', { name: 'Team Management' })).toBeInTheDocument();
        expect(await screen.findByText('bob@example.com')).toBeInTheDocument();
    });

    it('shows loading', () => {
        renderPage(<TeamManagement />, { route: '/app/team', http: http({ 'GET /users': pending() }) });
        expectLoading();
    });

    it('reports a failed load', async () => {
        renderPage(<TeamManagement />, { route: '/app/team', http: http({ 'GET /users': fail(500) }) });
        await expectLoadError({ emptyText: /no members found/i });
    });

    it('is restricted for an AGENT and loads nothing', () => {
        const { http: h } = renderPage(<TeamManagement />, { route: '/app/team', role: 'AGENT', http: http() });
        expect(screen.getByRole('heading', { name: 'Access Restricted' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /invite member/i })).toBeNull();
        expect(h.requests).toEqual([]);
    });

    it('opens the invite dialog', async () => {
        renderPage(<TeamManagement />, { route: '/app/team', http: http() });
        await screen.findByText('bob@example.com');
        await userEvent.click(screen.getByRole('button', { name: /invite member/i }));
        expect(within(await screen.findByRole('dialog')).getByRole('heading', { name: /invite/i })).toBeInTheDocument();
    });

    it("shows each member's real role in the dropdown and offers Agent (G-U8)", async () => {
        const users = [
            ...teamUsers,
            teamUser('u-3', { role: 'ADMIN', email: 'admin@example.com' }),
            teamUser('u-4', { role: 'MANAGER', email: 'manager@example.com' }),
        ];
        renderPage(<TeamManagement />, { route: '/app/team', http: http({ 'GET /users': users }) });
        const agent = await screen.findByRole('combobox', { name: 'Role of bob@example.com' });
        expect(agent).toHaveValue('AGENT');
        expect(within(agent).getByRole('option', { name: 'Agent', selected: true })).toBeInTheDocument();
        expect(within(agent).getAllByRole('option').map(o => o.textContent)).toEqual(['Super Admin', 'Admin', 'Manager', 'Agent']);
        expect(screen.getByRole('combobox', { name: 'Role of admin@example.com' })).toHaveValue('ADMIN');
        expect(screen.getByRole('combobox', { name: 'Role of manager@example.com' })).toHaveValue('MANAGER');
    });

    it('moves a member to Agent through PUT /users/{id}/role', async () => {
        const users = [...teamUsers, teamUser('u-4', { role: 'MANAGER', email: 'manager@example.com' })];
        const { http: h } = renderPage(<TeamManagement />, {
            route: '/app/team', http: http({ 'GET /users': users, 'PUT /users/:id/role': { message: 'Role updated to AGENT' } }),
        });
        await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Role of manager@example.com' }), 'AGENT');
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(h.requests.some(r => r.method === 'PUT' && r.path.endsWith('/users/u-4/role'))).toBe(true));
        expect(h.requests.find(r => r.method === 'PUT').body).toEqual({ role: 'AGENT' });
    });

    it('builds role options: Super Admin for Super Admins only, the current role always present', () => {
        expect(roleOptions('SUPER_ADMIN', 'AGENT').map(o => o.value)).toEqual(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'AGENT']);
        expect(roleOptions('ADMIN', 'AGENT').map(o => o.value)).toEqual(['ADMIN', 'MANAGER', 'AGENT']);
        expect(roleOptions('ADMIN', 'SUPER_ADMIN')[0]).toEqual({ value: 'SUPER_ADMIN', label: 'Super Admin' });
        expect(roleOptions('SUPER_ADMIN', 'VIEWER')[0]).toEqual({ value: 'VIEWER', label: 'VIEWER' });
    });
});
