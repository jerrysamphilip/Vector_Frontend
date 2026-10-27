import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeamManagement from './TeamManagement';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { teamUsers } from '../test/fixtures/team';

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
});
