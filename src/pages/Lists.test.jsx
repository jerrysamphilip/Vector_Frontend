import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Lists from './Lists';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { crmList } from '../test/fixtures/crm';

const lists = [crmList('l-1', { list_name: 'Hot prospects' }), crmList('l-2', { list_name: 'Newsletter', list_type: 'ACTIVE' })];
const page = (req, all = lists) => {
    const items = all.filter(l => (!req.query.list_type || l.list_type === req.query.list_type)
        && (!req.query.q || l.list_name.toLowerCase().includes(req.query.q.toLowerCase())));
    return { items, total: items.length, page: Number(req.query.page || 1), page_size: Number(req.query.page_size || 25) };
};
const http = (over = {}) => ({
    'GET /lists': (req) => page(req),
    'GET /contacts/meta': {}, 'GET /contacts/fields': [], 'GET /contacts/owners': [], 'GET /contacts/facets': {},
    ...over,
});
const opts = (over, role) => ({ route: '/app/lists', role, http: http(over) });

describe('Lists page', () => {
    it('lists static and active lists', async () => {
        renderPage(<Lists />, opts());
        expect(screen.getByRole('heading', { name: 'Lists' })).toBeInTheDocument();
        expect(await screen.findByText('Hot prospects')).toBeInTheDocument();
        expect(screen.getByText('Newsletter')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /new list/i })).toBeInTheDocument();
    });

    it('shows a spinner while loading', () => {
        renderPage(<Lists />, opts({ 'GET /lists': pending() }));
        expectLoading();
    });

    it('reports a failed load', async () => {
        renderPage(<Lists />, opts({ 'GET /lists': fail(500) }));
        await expectLoadError({ emptyText: /no lists yet/i });
    });

    it('hides create/edit/delete from an AGENT', async () => {
        renderPage(<Lists />, opts({}, 'AGENT'));
        await screen.findByText('Hot prospects');
        expect(screen.queryByRole('button', { name: /new list/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /edit hot prospects/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /delete hot prospects/i })).toBeNull();
    });

    it('filters by name and by type', async () => {
        renderPage(<Lists />, opts());
        await screen.findByText('Hot prospects');
        await userEvent.type(screen.getByPlaceholderText('Search lists…'), 'news');
        await waitFor(() => expect(screen.queryByText('Hot prospects')).toBeNull()); // searched on the server
        expect(await screen.findByText('Newsletter')).toBeInTheDocument();
        await userEvent.clear(screen.getByPlaceholderText('Search lists…'));
        await userEvent.click(screen.getByRole('button', { name: 'Static' }));
        expect(await screen.findByText('1 list')).toBeInTheDocument();
    });

    it('asks the server for one page at a time and pages through', async () => {
        const many = Array.from({ length: 30 }, (_, i) => crmList(`m-${i}`, { list_name: `Many ${i}` }));
        const { http: rec } = renderPage(<Lists />, opts({ 'GET /lists': (req) => {
            const all = page(req, many);
            const start = (all.page - 1) * all.page_size;
            return { ...all, items: all.items.slice(start, start + all.page_size) };
        } }));
        expect(await screen.findByText('Many 0')).toBeInTheDocument();
        expect(screen.getByText('30 lists')).toBeInTheDocument();
        expect(rec.requests[0].query).toMatchObject({ page: '1', page_size: '25' });
        await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
        expect(await screen.findByText('Many 25')).toBeInTheDocument();
        expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    });

    it('shows the duplicate-name message from the API', async () => {
        renderPage(<Lists />, opts({ 'POST /lists': fail(409, { message: 'A list with this name already exists. Choose another name.', field: 'list_name' }) }));
        await screen.findByText('Hot prospects');
        await userEvent.click(screen.getByRole('button', { name: /new list/i }));
        const dialog = await screen.findByRole('dialog');
        await userEvent.type(within(dialog).getByPlaceholderText(/q4 webinar/i), 'Hot prospects');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Create list' }));
        expect(await within(dialog).findByText(/already exists/)).toBeInTheDocument();
    });

    it('exports a list for users who may export', async () => {
        renderPage(<Lists />, opts());
        await screen.findByText('Hot prospects');
        expect(screen.getByRole('button', { name: 'Export Hot prospects' })).toBeInTheDocument();
    });

    it('opens the new-list dialog', async () => {
        renderPage(<Lists />, opts());
        await screen.findByText('Hot prospects');
        await userEvent.click(screen.getByRole('button', { name: /new list/i }));
        expect(within(await screen.findByRole('dialog')).getAllByText(/list/i).length).toBeGreaterThan(0);
    });

    it('deletes a list only after the confirm dialog (F5: no window.confirm)', async () => {
        const { http: rec } = renderPage(<Lists />, opts({ 'DELETE /lists/:id': {} }));
        await screen.findByText('Hot prospects');
        await userEvent.click(screen.getByRole('button', { name: 'Delete Hot prospects' }));
        const ask = await screen.findByRole('dialog', { name: 'Delete the list "Hot prospects"?' });
        await userEvent.click(within(ask).getByRole('button', { name: 'Cancel' }));
        expect(rec.requests.some(r => r.method === 'DELETE')).toBe(false);
        await userEvent.click(screen.getByRole('button', { name: 'Delete Hot prospects' }));
        await userEvent.click(within(await screen.findByRole('dialog', { name: /delete the list/i })).getByRole('button', { name: 'Delete list' }));
        await waitFor(() => expect(rec.requests.some(r => r.method === 'DELETE' && r.path === '/lists/l-1')).toBe(true));
    });
});
