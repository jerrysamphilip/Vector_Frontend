import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Tasks from './Tasks';
import { fail, pending, renderPage, reply } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { owners, task } from '../test/fixtures/crm';

const list = { items: [task('t-1', { title: 'Call Carol' })], total: 1, my_open: 1, my_overdue: 0, my_reminders_due: 0 };
const http = (over = {}) => ({ 'GET /tasks': list, 'GET /contacts/owners': owners, 'PATCH /tasks/:id': {}, ...over });

describe('Tasks page', () => {
    it('lists my open tasks', async () => {
        renderPage(<Tasks />, { route: '/app/tasks', http: http() });
        expect(screen.getByRole('heading', { name: 'Tasks' })).toBeInTheDocument();
        expect(await screen.findByText('Call Carol')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Everyone' })).toBeInTheDocument();
    });

    it('shows a spinner while loading', () => {
        renderPage(<Tasks />, { route: '/app/tasks', http: http({ 'GET /tasks': pending() }) });
        expectLoading();
    });

    it('hides the "Everyone" scope from an AGENT', async () => {
        renderPage(<Tasks />, { route: '/app/tasks', role: 'AGENT', http: http() });
        await screen.findByText('Call Carol');
        expect(screen.queryByRole('button', { name: 'Everyone' })).toBeNull();
    });

    it('completes a task', async () => {
        const { http: h } = renderPage(<Tasks />, { route: '/app/tasks', http: http() });
        await userEvent.click(await screen.findByRole('button', { name: 'Complete task' }));
        await waitFor(() => expect(h.requests.find(r => r.method === 'PATCH')?.body).toEqual({ status: 'DONE' }));
    });

    it('asks in a confirm dialog before deleting a task', async () => {
        const { http: h } = renderPage(<Tasks />, { route: '/app/tasks', http: http({ 'DELETE /tasks/:id': reply(204, null) }) });
        await userEvent.click(await screen.findByRole('button', { name: 'Delete task' }));
        const dialog = await screen.findByRole('dialog', { name: 'Delete task?' });
        await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
        expect(h.requests.some(r => r.method === 'DELETE')).toBe(false);
        await userEvent.click(screen.getByRole('button', { name: 'Delete task' }));
        await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
        await waitFor(() => expect(h.requests.find(r => r.method === 'DELETE')?.path).toBe('/tasks/t-1'));
    });

    it('opens the new-task dialog', async () => {
        renderPage(<Tasks />, { route: '/app/tasks', http: http() });
        await userEvent.click(screen.getByRole('button', { name: /new task/i }));
        expect(within(await screen.findByRole('dialog')).getByRole('button', { name: /create task/i })).toBeDisabled();
    });

    it('reports a failed load instead of "Nothing here"', async () => {
        renderPage(<Tasks />, { route: '/app/tasks', http: http({ 'GET /tasks': fail(500) }) });
        await expectLoadError({ emptyText: /nothing here/i });
    });
});
