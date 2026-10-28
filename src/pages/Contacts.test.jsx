import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Contacts from './Contacts';
import { FAIL_REQUEST_ID, fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { account, contact, contactMeta, contactPage, owners } from '../test/fixtures/crm';

const all = [contact('c-1', { full_name: 'Carol Contact' }), contact('c-2', { full_name: 'Dan Driver', email: 'dan@globex.test' })];
const http = (over = {}, meta = contactMeta()) => ({
    'GET /contacts/meta': meta,
    'GET /views': [],
    'GET /contacts': (req) => contactPage(all.filter(c => !req.query.q || c.full_name.toLowerCase().includes(req.query.q.toLowerCase()))),
    'GET /contacts/facets': { tags: [], lists: [], owners: [] },
    'GET /contacts/owners': owners,
    'GET /contacts/fields': [],
    'GET /accounts': contactPage([account('a-1')]),
    ...over,
});
const opts = (over, role, meta) => ({ route: '/app/contacts', role, http: http(over, meta) });

describe('Contacts page', () => {
    it('lists contacts with the manager actions', async () => {
        renderPage(<Contacts />, opts());
        expect(screen.getByRole('heading', { level: 1, name: 'Contacts' })).toBeInTheDocument();
        expect(await screen.findByText('Carol Contact')).toBeInTheDocument();
        expect(screen.getByText('Dan Driver')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /import/i })).toBeInTheDocument();
        expect(screen.getByLabelText('Select all on page')).toBeInTheDocument();
    });

    it('shows a spinner while loading', () => {
        renderPage(<Contacts />, opts({ 'GET /contacts': pending() }));
        expectLoading();
    });

    it('reports a failed load with its reference', async () => {
        renderPage(<Contacts />, opts({ 'GET /contacts': fail(500) }));
        await expectLoadError({ emptyText: /no contacts yet/i });
        expect(screen.getByText(FAIL_REQUEST_ID)).toBeInTheDocument();
    });

    it('an AGENT (can_manage false) gets no bulk selection, import or export', async () => {
        renderPage(<Contacts />, opts({}, 'AGENT', contactMeta({ can_manage: false, can_export: false })));
        await screen.findByText('Carol Contact');
        expect(screen.getByText(/showing contacts you own/i)).toBeInTheDocument();
        expect(screen.queryByLabelText('Select all on page')).toBeNull();
        expect(screen.queryByRole('link', { name: /import/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /export/i })).toBeNull();
    });

    it('searches on the server', async () => {
        renderPage(<Contacts />, opts());
        await screen.findByText('Carol Contact');
        await userEvent.type(screen.getByPlaceholderText(/search name, email, company or phone/i), 'dan');
        await waitFor(() => expect(screen.queryByText('Carol Contact')).toBeNull());
        expect(screen.getByText('Dan Driver')).toBeInTheDocument();
    });

    it('opens the add-contact dialog', async () => {
        renderPage(<Contacts />, opts());
        await screen.findByText('Carol Contact');
        await userEvent.click(screen.getByRole('button', { name: /add contact/i }));
        expect(within(await screen.findByRole('dialog')).getAllByText(/contact/i).length).toBeGreaterThan(0);
    });
});
