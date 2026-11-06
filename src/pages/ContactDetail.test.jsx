import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    'GET /contacts/:id/emails': { current: null, items: [] },
    'GET /contacts/:id/merges': { items: [] },
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

    it('shows the contact ID read-only with a copy button (CM-02)', async () => {
        const user = userEvent.setup();
        renderPage(<ContactDetail />, opts());
        await screen.findByRole('heading', { level: 1, name: 'Carol Contact' });
        expect(screen.getByTestId('record-id')).toHaveTextContent('Contact ID:c-1');
        await user.click(screen.getByRole('button', { name: 'Copy contact id' }));
        expect(await navigator.clipboard.readText()).toBe('c-1');
    });

    it('edits the time zone, sending it only when changed (CM-01)', async () => {
        const user = userEvent.setup();
        const { http: h } = renderPage(<ContactDetail />, opts({
            'GET /contacts/:id': () => detail({ last_name: 'Contact' }),
            'PATCH /contacts/:id': req => detail({ last_name: 'Contact', timezone: req.body.timezone || 'Europe/Paris' }),
        }));
        await screen.findByRole('heading', { level: 1, name: 'Carol Contact' });
        await user.click(screen.getByRole('button', { name: /^edit$/i }));
        const zone = screen.getByRole('combobox', { name: 'Time zone' });
        expect(zone).toHaveValue('Europe/Paris');
        expect(screen.getByRole('option', { name: /automatic/i })).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Save' }));
        const patches = () => h.requests.filter(r => r.method.toUpperCase() === 'PATCH');
        await waitFor(() => expect(patches()).toHaveLength(1));
        expect(patches()[0].body).not.toHaveProperty('timezone');  // untouched: keeps following the location

        await user.click(await screen.findByRole('button', { name: /^edit$/i }));
        await user.selectOptions(screen.getByRole('combobox', { name: 'Time zone' }), 'Europe/London');
        await user.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(patches()).toHaveLength(2));
        expect(patches()[1].body.timezone).toBe('Europe/London');
    });
});
