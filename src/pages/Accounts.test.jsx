import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Accounts from './Accounts';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { account, contactMeta, contactPage, owners } from '../test/fixtures/crm';

const all = [account('a-1', { name: 'Acme Corp' }), account('a-2', { name: 'Globex' })];
const http = (over = {}) => ({
    'GET /contacts/meta': contactMeta(),
    'GET /contacts/owners': owners,
    'GET /contacts/fields': [],
    'GET /accounts': (req) => contactPage(all.filter(a => !req.query.q || a.name.toLowerCase().includes(req.query.q.toLowerCase()))),
    ...over,
});
const opts = (over, role) => ({ route: '/app/accounts', role, http: http(over) });

describe('Accounts page', () => {
    it('lists companies', async () => {
        renderPage(<Accounts />, opts());
        expect(screen.getByRole('heading', { level: 1, name: 'Companies' })).toBeInTheDocument();
        expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
        expect(screen.getByText('Globex')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /link contacts by company/i })).toBeInTheDocument();
    });

    it('shows a spinner while loading', () => {
        renderPage(<Accounts />, opts({ 'GET /accounts': pending() }));
        expectLoading();
    });

    it('reports a failed load', async () => {
        renderPage(<Accounts />, opts({ 'GET /accounts': fail(500) }));
        await expectLoadError({ emptyText: /no companies yet/i });
    });

    it('hides the manager-only bulk link action from an AGENT', async () => {
        renderPage(<Accounts />, opts({}, 'AGENT'));
        await screen.findByText('Acme Corp');
        expect(screen.queryByRole('button', { name: /link contacts by company/i })).toBeNull();
    });

    it('searches on the server', async () => {
        const { http: h } = renderPage(<Accounts />, opts());
        await screen.findByText('Acme Corp');
        await userEvent.type(screen.getByPlaceholderText(/search name, domain or industry/i), 'glob');
        await waitFor(() => expect(screen.queryByText('Acme Corp')).toBeNull());
        expect(screen.getByText('Globex')).toBeInTheDocument();
        expect(h.requests.some(r => r.path === '/accounts' && r.query.q === 'glob')).toBe(true);
    });
});
