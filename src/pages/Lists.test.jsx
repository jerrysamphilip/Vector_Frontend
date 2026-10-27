import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Lists from './Lists';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { crmList } from '../test/fixtures/crm';

const lists = [crmList('l-1', { list_name: 'Hot prospects' }), crmList('l-2', { list_name: 'Newsletter', list_type: 'ACTIVE' })];
const http = (over = {}) => ({
    'GET /lists': (req) => ({ items: lists.filter(l => !req.query.list_type || l.list_type === req.query.list_type) }),
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
        expect(screen.queryByText('Hot prospects')).toBeNull();
        expect(screen.getByText('Newsletter')).toBeInTheDocument();
        await userEvent.clear(screen.getByPlaceholderText('Search lists…'));
        await userEvent.click(screen.getByRole('button', { name: 'Static' }));
        expect(await screen.findByText('1 list')).toBeInTheDocument();
    });

    it('opens the new-list dialog', async () => {
        renderPage(<Lists />, opts());
        await screen.findByText('Hot prospects');
        await userEvent.click(screen.getByRole('button', { name: /new list/i }));
        expect(within(await screen.findByRole('dialog')).getAllByText(/list/i).length).toBeGreaterThan(0);
    });
});
