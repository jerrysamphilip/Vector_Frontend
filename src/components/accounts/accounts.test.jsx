// F-14 companies features: saved views, column chooser, Active / Archived, custom company properties,
// backfill preview / run / undo and export. Rendered with the page harness (src/test/renderPage.jsx).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Accounts from '../../pages/Accounts';
import AccountDetail from '../../pages/AccountDetail';
import { renderPage, reply } from '../../test/renderPage';
import { account, contactMeta, contactPage, owners } from '../../test/fixtures/crm';
import { leadsMeta } from '../../test/fixtures/sales';
import { COLUMNS_KEY, availableColumns, exportColumns, readColumns } from './companyColumns';

const TIER = { field_id: 'f-1', field_key: 'tier', label: 'Tier', field_type: 'SELECT', options: ['Gold', 'Silver'], group_name: null, required: false, object_type: 'COMPANY' };
const companies = [account('a-1', { name: 'Acme Corp', custom_fields: { tier: 'Gold' } }), account('a-2', { name: 'Globex', custom_fields: {} })];
const page = (items = companies, extra = {}) => contactPage(items, { custom_properties: [TIER], can_export: true, ...extra });
const http = (over = {}) => ({
    'GET /contacts/meta': contactMeta(),
    'GET /contacts/owners': owners,
    'GET /contacts/fields': [],
    'GET /accounts': () => page(),
    ...over,
});
const opts = (over, role) => ({ route: '/app/accounts', role, http: http(over) });

beforeEach(() => localStorage.removeItem(COLUMNS_KEY));

describe('company columns', () => {
    it('lists custom properties as columns and exports their parts', () => {
        expect(availableColumns([TIER]).at(-1)).toMatchObject({ key: 'custom.tier', label: 'Tier' });
        expect(exportColumns(['name', 'location', 'custom.tier', 'country'])).toBe('name,city,country');
    });

    it('falls back to the default columns when storage is unusable', () => {
        localStorage.setItem(COLUMNS_KEY, '{not json');
        expect(readColumns()).toContain('name');
        localStorage.setItem(COLUMNS_KEY, JSON.stringify(['industry']));
        expect(readColumns()).toContain('name');
    });
});

describe('Accounts page features', () => {
    it('adds a custom property column from the column chooser', async () => {
        renderPage(<Accounts />, opts());
        await screen.findByText('Acme Corp');
        expect(screen.queryByText('Gold')).toBeNull();
        await userEvent.click(screen.getByRole('button', { name: /columns/i }));
        await userEvent.click(within(screen.getByRole('dialog', { name: 'Columns' })).getByLabelText(/tier/i));
        expect(await screen.findByText('Gold')).toBeInTheDocument();
        expect(JSON.parse(localStorage.getItem(COLUMNS_KEY))).toContain('custom.tier');
    });

    it('filters on a custom property on the server', async () => {
        const { http: h } = renderPage(<Accounts />, opts());
        await screen.findByText('Acme Corp');
        await userEvent.click(screen.getByRole('button', { name: /^filters/i }));
        await userEvent.click(screen.getByRole('button', { name: /condition/i }));
        await userEvent.selectOptions(screen.getByLabelText('Property'), 'custom.tier');
        await waitFor(() => {
            const last = h.requests.filter(r => r.path === '/accounts').at(-1);
            expect(JSON.parse(last.query.filters)).toEqual({ op: 'AND', conditions: [{ field: 'custom.tier', operator: 'is', value: 'Gold' }] });
        });
    });

    it('switches to archived companies and restores one', async () => {
        const archived = [account('a-9', { name: 'Old Co', deleted_at: '2026-10-20T10:00:00Z' })];
        const { http: h } = renderPage(<Accounts />, opts({
            'GET /accounts': (req) => (req.query.status === 'archived' ? page(archived) : page()),
            'POST /accounts/:id/restore': { status: 'restored' },
        }));
        await screen.findByText('Acme Corp');
        await userEvent.click(screen.getByRole('button', { name: 'Archived' }));
        expect(await screen.findByText('Old Co')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: /restore/i }));
        await waitFor(() => expect(h.requests.some(r => r.method === 'POST' && r.path === '/accounts/a-9/restore')).toBe(true));
        expect(await screen.findByText('Company restored.')).toBeInTheDocument();
    });

    it('hides the archive switch, properties and export from an AGENT the API does not allow', async () => {
        renderPage(<Accounts />, opts({ 'GET /accounts': () => page(companies, { can_export: false }) }, 'AGENT'));
        await screen.findByText('Acme Corp');
        expect(screen.queryByRole('button', { name: 'Archived' })).toBeNull();
        expect(screen.queryByRole('button', { name: /properties/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /export/i })).toBeNull();
    });

    describe('export', () => {
        beforeEach(() => {
            URL.createObjectURL = vi.fn(() => 'blob:x');
            URL.revokeObjectURL = vi.fn();
        });
        afterEach(() => { delete URL.createObjectURL; delete URL.revokeObjectURL; });

        it('downloads the current view', async () => {
            const { http: h } = renderPage(<Accounts />, opts({
                'GET /accounts/export': reply(200, new Blob(['Company\n']), { 'content-disposition': 'attachment; filename="companies.csv"' }),
            }));
            await screen.findByText('Acme Corp');
            await userEvent.click(screen.getByRole('button', { name: /export/i }));
            await userEvent.click(screen.getByRole('menuitem', { name: /csv/i }));
            await waitFor(() => expect(h.requests.some(r => r.path === '/accounts/export')).toBe(true));
            const req = h.requests.find(r => r.path === '/accounts/export');
            expect(req.query).toMatchObject({ format: 'csv', status: 'active' });
            expect(req.query.columns).toContain('name');
        });
    });

    it('applies a saved company view', async () => {
        const view = { view_id: 'v-1', name: 'Gold tier', shared: false, can_edit: true, object_type: 'COMPANY',
            filters: { op: 'AND', conditions: [{ field: 'custom.tier', operator: 'is', value: 'Gold' }] }, columns: ['name', 'custom.tier'], sort: { by: 'name', order: 'desc' } };
        const { http: h } = renderPage(<Accounts />, opts({ 'GET /views': (req) => (req.query.object_type === 'COMPANY' ? [view] : []) }));
        await screen.findByText('Acme Corp');
        await userEvent.click(screen.getByRole('button', { name: /all companies/i, expanded: false }));
        await userEvent.click(await screen.findByRole('menuitem', { name: 'Gold tier' }));
        await waitFor(() => {
            const last = h.requests.filter(r => r.path === '/accounts').at(-1);
            expect(last.query.sort_order).toBe('desc');
            expect(JSON.parse(last.query.filters).conditions[0].field).toBe('custom.tier');
        });
        expect(await screen.findByText('Gold')).toBeInTheDocument();
    });

    it('previews, runs and undoes a backfill', async () => {
        const run = { run_id: 'r-1', status: 'COMPLETED', stats: { contacts_linked: 4, companies_created: 1, company_names_filled: 2 }, started_by_name: 'Ada', started_at: '2026-10-27T10:00:00Z', can_undo: true };
        const { http: h } = renderPage(<Accounts />, opts({
            'POST /accounts/backfill/previews': { stats: { contacts_to_link: 4, companies_to_create: 1, contacts_in_conflict: 1 },
                samples: [{ action: 'CREATE', company_name: 'Initech', domain: 'initech.com', contacts: 3 }],
                conflicts: [{ company_name: 'Old Co', domain: 'old.com', message: 'A deleted company still owns this domain.', example_emails: ['x@old.com'] }] },
            'POST /accounts/backfill/runs': reply(201, run),
            'GET /accounts/backfill/runs': { items: [run] },
            'POST /accounts/backfill/runs/:id/undo': { ...run, status: 'UNDONE', can_undo: false },
        }));
        await screen.findByText('Acme Corp');
        await userEvent.click(screen.getByRole('button', { name: /link contacts by company/i }));
        const dialog = await screen.findByRole('dialog');
        expect(await within(dialog).findByText('Initech')).toBeInTheDocument();
        expect(within(dialog).getByText(/deleted company still owns/i)).toBeInTheDocument();
        await userEvent.click(within(dialog).getByRole('button', { name: /link 4 contacts/i }));
        expect(await within(dialog).findByText(/4 linked/)).toBeInTheDocument();
        await userEvent.click(within(dialog).getByRole('tab', { name: /runs/i }));
        await userEvent.click(await within(dialog).findByRole('button', { name: /undo/i }));
        const confirmDialog = await screen.findByRole('dialog', { name: 'Undo this run?' });
        await userEvent.click(within(confirmDialog).getByRole('button', { name: 'Undo run' }));
        await waitFor(() => expect(h.requests.some(r => r.method === 'POST' && r.path === '/accounts/backfill/runs/r-1/undo')).toBe(true));
    });
});

describe('AccountDetail custom properties', () => {
    it('shows the company property values and edits them in the form', async () => {
        const record = account('a-1', { name: 'Acme Corp', custom_properties: [TIER], custom_fields: { tier: 'Silver' } });
        const { http: h } = renderPage(<AccountDetail />, {
            route: '/app/accounts/:id', path: '/app/accounts/a-1', http: {
                'GET /contacts/meta': contactMeta(), 'GET /accounts/:id': record, 'GET /contacts/owners': owners,
                'GET /contacts/fields': [], 'GET /leads/meta': leadsMeta, 'GET /opportunities': { items: [], total: 0 },
                'PATCH /accounts/:id': { ...record, custom_fields: { tier: 'Gold' } },
            },
        });
        expect(await screen.findByText('Company properties')).toBeInTheDocument();
        expect(screen.getByText('Silver')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: /edit company/i }));
        const dialog = await screen.findByRole('dialog');
        await userEvent.selectOptions(within(dialog).getByRole('combobox', { name: /tier/i }), 'Gold');
        await userEvent.click(within(dialog).getByRole('button', { name: /^save$/i }));
        await waitFor(() => {
            const patch = h.requests.find(r => r.method === 'PATCH');
            expect(patch.body.custom_fields).toEqual({ tier: 'Gold' });
            expect(patch.body.expected_version).toBe(1);
        });
    });
});
