import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import ContactDetail from './ContactDetail';
import { FAIL_REQUEST_ID, fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { contact, contactMeta, owners } from '../test/fixtures/crm';
import { leadsMeta } from '../test/fixtures/sales';

const detail = (extra) => contact('c-1', {
    full_name: 'Carol Contact', account: null, companies: [], lists: [], campaigns: [], persona: null,
    stats: { emails_sent: 2, opens: 1, replies: 0, logged_emails: 0, open_tasks: 0 },
    can_edit_owner: true, can_delete: true, can_override_lifecycle: true, ...extra,
});
const http = (over = {}) => ({
    'GET /contacts/meta': contactMeta(),
    'GET /contacts/:id': () => detail(),
    'GET /contacts/owners': owners,
    'GET /contacts/fields': [],
    'GET /contacts/facets': { tags: [], lists: [] },
    'GET /contacts/:id/timeline': { items: [] },
    'GET /contacts/:id/*': { items: [] },
    'GET /leads/meta': leadsMeta,
    'GET /leads': { items: [], total: 0 },
    'GET /opportunities': { items: [], total: 0 },
    'GET /tasks': { items: [], total: 0 },
    ...over,
});
const opts = (over, role) => ({ route: '/app/contacts/:id', path: '/app/contacts/c-1', role, http: http(over) });

describe('ContactDetail page', () => {
    it('shows the contact record', async () => {
        renderPage(<ContactDetail />, opts());
        expect(await screen.findByRole('heading', { level: 1, name: 'Carol Contact' })).toBeInTheDocument();
        expect(screen.getAllByText('carol.c-1@acme.test').length).toBeGreaterThan(0);
        expect(screen.getByLabelText('Owner')).toBeInTheDocument();
    });

    it('shows a spinner while loading', () => {
        renderPage(<ContactDetail />, opts({ 'GET /contacts/:id': pending() }));
        expectLoading();
    });

    it('reports a failed load with its reference', async () => {
        renderPage(<ContactDetail />, opts({ 'GET /contacts/:id': fail(500) }));
        await expectLoadError({ emptyText: /contact not found/i });
        expect(screen.getByText(FAIL_REQUEST_ID)).toBeInTheDocument();
    });

    it('says "Contact not found" for a 404', async () => {
        renderPage(<ContactDetail />, opts({ 'GET /contacts/:id': fail(404, 'Not found') }));
        expect(await screen.findByText('Contact not found')).toBeInTheDocument();
    });

    it('AGENT: owner shown as text and no delete, as the API reports', async () => {
        renderPage(<ContactDetail />, opts({ 'GET /contacts/:id': () => detail({ can_edit_owner: false, can_delete: false }) }, 'AGENT'));
        await screen.findByRole('heading', { level: 1, name: 'Carol Contact' });
        expect(screen.queryByLabelText('Owner')).toBeNull();
        expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
    });
});
