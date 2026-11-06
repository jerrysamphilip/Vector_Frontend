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

    it('changes the owner of the selected companies in bulk (CM-36)', async () => {
        const { http: h } = renderPage(<Accounts />, opts({
            'POST /accounts/bulk': req => ({ status: 'ok', action: 'assign_owner', updated: req.body.account_ids.length, skipped: [] }),
        }));
        await screen.findByText('Acme Corp');
        expect(screen.queryByRole('region', { name: /bulk actions/i })).toBeNull();
        await userEvent.click(screen.getByRole('checkbox', { name: 'Select Acme Corp' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Select Globex' }));
        expect(screen.getByText('2 selected')).toBeInTheDocument();
        const change = screen.getByRole('button', { name: /change owner/i });
        expect(change).toBeDisabled();
        await userEvent.selectOptions(screen.getByRole('combobox', { name: 'New owner' }), 'u-2');
        await userEvent.click(change);
        expect(await screen.findByText('Owner changed on 2 companies.')).toBeInTheDocument();
        const sent = h.requests.find(r => r.method === 'POST' && r.path === '/accounts/bulk');
        expect(sent.body).toEqual({ account_ids: ['a-1', 'a-2'], action: 'assign_owner', owner_id: 'u-2' });
        expect(screen.queryByText('2 selected')).toBeNull();
    });

    it('shows a refused bulk owner change', async () => {
        renderPage(<Accounts />, opts({ 'POST /accounts/bulk': fail(403, 'You can only assign records to yourself or your team') }));
        await screen.findByText('Acme Corp');
        await userEvent.click(screen.getByRole('checkbox', { name: 'Select all on page' }));
        await userEvent.selectOptions(screen.getByRole('combobox', { name: 'New owner' }), 'u-1');
        await userEvent.click(screen.getByRole('button', { name: /change owner/i }));
        expect(await screen.findByRole('alert')).toHaveTextContent(/only assign records to yourself or your team/i);
    });

    it('offers no selection to a user who cannot manage companies', async () => {
        renderPage(<Accounts />, opts({}, 'AGENT'));
        await screen.findByText('Acme Corp');
        expect(screen.queryByRole('checkbox', { name: /select/i })).toBeNull();
    });
});
