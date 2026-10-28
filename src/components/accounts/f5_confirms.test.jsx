// F5: the companies screens ask with the in-app confirm dialog (useConfirm) instead of window.confirm,
// and the saved-views menu is a Radix dropdown menu.
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Accounts from '../../pages/Accounts';
import AccountDetail from '../../pages/AccountDetail';
import { renderPage } from '../../test/renderPage';
import { account, contactMeta, contactPage, owners } from '../../test/fixtures/crm';
import { leadsMeta } from '../../test/fixtures/sales';

const TIER = { field_id: 'f-1', field_key: 'tier', label: 'Tier', field_type: 'SELECT', options: ['Gold'], group_name: null, required: false, object_type: 'COMPANY' };
const view = { view_id: 'v-1', name: 'Gold tier', shared: false, can_edit: true, object_type: 'COMPANY', filters: null, columns: ['name'], sort: null };
const http = (over = {}) => ({
    'GET /contacts/meta': contactMeta(),
    'GET /contacts/owners': owners,
    'GET /contacts/fields': [],
    'GET /accounts': () => contactPage([account('a-1', { name: 'Acme Corp' })], { custom_properties: [TIER], can_export: true }),
    'GET /views': [view],
    'DELETE /views/:id': {},
    'GET /accounts/fields': [TIER],
    'DELETE /accounts/fields/:id': {},
    ...over,
});
const deletes = (h, path) => h.requests.filter(r => r.method === 'DELETE' && r.path === path);

describe('saved company views menu', () => {
    it('is a labelled menu reachable from the keyboard', async () => {
        const user = userEvent.setup();
        renderPage(<Accounts />, { route: '/app/accounts', http: http() });
        await screen.findByText('Acme Corp');
        const trigger = screen.getByRole('button', { name: /all companies/i, expanded: false });
        trigger.focus();
        await user.keyboard('{Enter}');
        const menu = await screen.findByRole('menu', { name: 'Saved views' });
        expect(within(menu).getAllByRole('menuitem')[0]).toHaveFocus();
        await within(menu).findByRole('menuitem', { name: 'Gold tier' });
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('menu')).toBeNull();
        expect(trigger).toHaveFocus();
    });

    it('deletes a view only after the confirm dialog, and gives focus back to the menu button', async () => {
        const user = userEvent.setup();
        const { http: h } = renderPage(<Accounts />, { route: '/app/accounts', http: http() });
        await screen.findByText('Acme Corp');
        const trigger = screen.getByRole('button', { name: /all companies/i, expanded: false });
        await user.click(trigger);
        await user.click(await screen.findByRole('menuitem', { name: 'Delete view Gold tier' }));
        let ask = await screen.findByRole('dialog', { name: 'Delete view “Gold tier”?' });
        await user.click(within(ask).getByRole('button', { name: 'Cancel' }));
        expect(deletes(h, '/views/v-1')).toHaveLength(0);
        await waitFor(() => expect(trigger).toHaveFocus());

        await user.click(trigger);
        await user.click(await screen.findByRole('menuitem', { name: 'Delete view Gold tier' }));
        ask = await screen.findByRole('dialog', { name: 'Delete view “Gold tier”?' });
        await user.click(within(ask).getByRole('button', { name: 'Delete' }));
        await waitFor(() => expect(deletes(h, '/views/v-1')).toHaveLength(1));
    });
});

describe('company properties', () => {
    it('confirms before deleting a property', async () => {
        const user = userEvent.setup();
        const { http: h } = renderPage(<Accounts />, { route: '/app/accounts', http: http() });
        await screen.findByText('Acme Corp');
        await user.click(screen.getByRole('button', { name: /properties/i }));
        const modal = await screen.findByRole('dialog', { name: /company properties/i });
        await user.click(await within(modal).findByRole('button', { name: 'Delete Tier' }));
        const ask = await screen.findByRole('dialog', { name: 'Delete "Tier"?' });
        expect(ask).toHaveTextContent('Values already saved on companies will be hidden.');
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog', { name: 'Delete "Tier"?' })).toBeNull();
        expect(screen.getByRole('dialog', { name: /company properties/i })).toBeInTheDocument(); // Escape closed only the confirm
        expect(deletes(h, '/accounts/fields/f-1')).toHaveLength(0);
        await user.click(within(modal).getByRole('button', { name: 'Delete Tier' }));
        await user.click(within(await screen.findByRole('dialog', { name: 'Delete "Tier"?' })).getByRole('button', { name: 'Delete' }));
        await waitFor(() => expect(deletes(h, '/accounts/fields/f-1')).toHaveLength(1));
    });
});

describe('AccountDetail delete', () => {
    it('confirms before deleting the company', async () => {
        const user = userEvent.setup();
        const record = account('a-1', { name: 'Acme Corp', can_delete: true, can_edit: true });
        const { http: h } = renderPage(<AccountDetail />, {
            route: '/app/accounts/:id', path: '/app/accounts/a-1', http: {
                'GET /contacts/meta': contactMeta(), 'GET /accounts/:id': record, 'GET /contacts/owners': owners,
                'GET /contacts/fields': [], 'GET /leads/meta': leadsMeta, 'GET /opportunities': { items: [], total: 0 },
                'DELETE /accounts/:id': {}, 'GET /accounts': () => contactPage([]),
            },
        });
        await user.click(await screen.findByRole('button', { name: /delete company/i }));
        const ask = await screen.findByRole('dialog', { name: 'Delete Acme Corp?' });
        expect(ask).toHaveTextContent(/restore it from Recently deleted/);
        await user.click(within(ask).getByRole('button', { name: 'Delete company' }));
        await waitFor(() => expect(deletes(h, '/accounts/a-1')).toHaveLength(1));
    });
});
