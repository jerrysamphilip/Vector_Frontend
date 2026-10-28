import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountDetail from './AccountDetail';
import { FAIL_REQUEST_ID, fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { account, contactMeta, owners } from '../test/fixtures/crm';
import { leadsMeta } from '../test/fixtures/sales';

const http = (over = {}) => ({
    'GET /contacts/meta': contactMeta(),
    'GET /accounts/:id': (req) => account(req.params.id, { name: 'Acme Corp' }),
    'GET /contacts/owners': owners,
    'GET /contacts/fields': [],
    'GET /leads/meta': leadsMeta,
    'GET /opportunities': { items: [], total: 0 },
    ...over,
});
const opts = (over, role) => ({ route: '/app/accounts/:id', path: '/app/accounts/a-1', role, http: http(over) });

describe('AccountDetail page', () => {
    it('shows the company with its contacts', async () => {
        renderPage(<AccountDetail />, opts());
        expect(await screen.findByRole('heading', { level: 1, name: /acme corp/i })).toBeInTheDocument();
        expect(screen.getByText('Carol Contact')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /edit company/i })).toBeInTheDocument();
    });

    it('shows a spinner while loading', () => {
        renderPage(<AccountDetail />, opts({ 'GET /accounts/:id': pending() }));
        expectLoading();
    });

    it('reports a failed load with its reference and a retry', async () => {
        renderPage(<AccountDetail />, opts({ 'GET /accounts/:id': fail(500) }));
        await expectLoadError({ emptyText: /company not found/i });
        expect(screen.getByText(FAIL_REQUEST_ID)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('says "not found" for a 404', async () => {
        renderPage(<AccountDetail />, opts({ 'GET /accounts/:id': fail(404, 'Not found') }));
        expect(await screen.findByText('Company not found')).toBeInTheDocument();
    });

    it('AGENT sees the owner as text, not a picker, and no actions the API does not grant', async () => {
        renderPage(<AccountDetail />, opts({ 'GET /accounts/:id': account('a-1', { name: 'Acme Corp', can_edit: false, can_delete: false }) }, 'AGENT'));
        await screen.findByRole('heading', { level: 1, name: /acme corp/i });
        expect(screen.queryByRole('combobox')).toBeNull();
        expect(screen.queryByRole('button', { name: /edit company/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /delete company/i })).toBeNull();
    });

    it('opens the add-contact dialog', async () => {
        renderPage(<AccountDetail />, opts());
        await userEvent.click(await screen.findByRole('button', { name: /add contact/i }));
        expect(within(await screen.findByRole('dialog')).getByText(/contact/i, { selector: 'h2,h3' })).toBeInTheDocument();
    });
});
