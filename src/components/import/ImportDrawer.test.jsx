import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportDrawer from './ImportDrawer';
import { fail, renderPage } from '../../test/renderPage';
import { crmList, owners } from '../../test/fixtures/crm';

const uploaded = {
    file_name: 'people.csv', row_count: 3, headers: ['Email', 'Company'], sample: [{ Email: 'a@acme.test', Company: 'Acme' }],
    suggested_mapping: { Email: 'contact.email', Company: 'company.name' }, sheet_names: [], sheet: null,
    targets: { contact: [{ value: 'contact.email', label: 'Email' }], company: [{ value: 'company.name', label: 'Company name' }], custom: [], new_types: [] },
    import: { import_id: 'im-9', status: 'UPLOADED' },
};
const running = {
    import_id: 'im-9', file_name: 'people.csv', status: 'RUNNING', total_rows: 3, processed_rows: 1, progress: 33,
    contacts_created: 1, contacts_updated: 0, companies_created: 0, companies_updated: 0, skipped: 0, error_count: 0, options: {},
};
const http = (over = {}) => ({
    'POST /imports/uploads': uploaded,
    'GET /imports/mappings': [{ mapping_id: 'm-1', name: 'Trade show', mapping: { Email: 'contact.email' }, options: { mode: 'UPDATE_ONLY' } }],
    'GET /contacts/owners': owners,
    'GET /lists': { items: [crmList('l-1')] },
    'POST /imports/:id/dry-run': { total_rows: 3, create: 2, update: 0, skip: 0, fail: 1, companies_create: 1, companies_update: 0, errors: [{ row: 4, reason: "Invalid email 'x'" }] },
    'POST /imports/:id/start': { ...running, status: 'QUEUED', processed_rows: 0, progress: 0 },
    'GET /imports/:id': running,
    'POST /imports/:id/cancel': { ...running, cancel_requested: true },
    ...over,
});
const choose = (dialog) => userEvent.upload(dialog.querySelector('input[type="file"]'), new File(['Email,Company\na@acme.test,Acme'], 'people.csv', { type: 'text/csv' }));

describe('ImportDrawer', () => {
    it('walks upload → map → options → preview → start → progress → cancel', async () => {
        const { http: h } = renderPage(<ImportDrawer onClose={vi.fn()} />, { http: http() });
        const dialog = screen.getByRole('dialog', { name: /import contacts and companies/i });
        await choose(dialog);
        expect(await within(dialog).findByText('3 rows · 2 columns')).toBeInTheDocument();
        await userEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
        expect(within(dialog).getByLabelText('Import Email as')).toHaveValue('contact.email');
        await userEvent.selectOptions(await within(dialog).findByLabelText('Use a saved mapping'), 'm-1');
        expect(within(dialog).getByLabelText('Import Company as')).toHaveValue('skip');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
        expect(within(dialog).getByLabelText('What to do')).toHaveValue('UPDATE_ONLY');  // from the saved mapping
        await userEvent.selectOptions(within(dialog).getByLabelText('Dates like 03/04/2026'), 'DMY');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
        expect(await within(dialog).findByText("Invalid email 'x'")).toBeInTheDocument();
        const dry = h.requests.find(r => r.path.endsWith('/dry-run'));
        expect(dry.body.options).toMatchObject({ mode: 'UPDATE_ONLY', date_order: 'DMY' });
        expect(dry.body.mapping).toEqual({ Email: 'contact.email', Company: 'skip' });
        await userEvent.click(within(dialog).getByRole('button', { name: /start import/i }));
        expect(await within(dialog).findByText('Waiting to start…')).toBeInTheDocument();
        expect(await within(dialog).findByText('Importing…', {}, { timeout: 4000 })).toBeInTheDocument();  // polled
        expect(within(dialog).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');
        await userEvent.click(within(dialog).getByRole('button', { name: /cancel import/i }));
        expect(await within(dialog).findByText('Stopping…')).toBeInTheDocument();
        expect(h.requests.some(r => r.method === 'POST' && r.path === '/imports/im-9/cancel')).toBe(true);
    });

    it('shows the result with the error file when the import is done', async () => {
        const done = { ...running, status: 'COMPLETED', processed_rows: 3, progress: 100, error_count: 2 };
        renderPage(<ImportDrawer onClose={vi.fn()} initialJob={done} />, { http: http({ 'GET /imports/:id': done }) });
        expect(await screen.findByText('Import finished')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /download error file/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /view contacts/i })).toBeInTheDocument();
    });

    it('reports a file the server refused', async () => {
        renderPage(<ImportDrawer onClose={vi.fn()} />, { http: http({ 'POST /imports/uploads': fail(400, 'The file has 201 columns; at most 200 can be imported.') }) });
        await choose(screen.getByRole('dialog'));
        expect(await screen.findByText(/201 columns/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    it('closing before the import starts discards the stored upload', async () => {
        const onClose = vi.fn();
        const { http: h } = renderPage(<ImportDrawer onClose={onClose} />, { http: http() });
        const dialog = screen.getByRole('dialog');
        await choose(dialog);
        await within(dialog).findByText('3 rows · 2 columns');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
        expect(onClose).toHaveBeenCalled();
        expect(h.requests.some(r => r.method === 'POST' && r.path === '/imports/im-9/cancel')).toBe(true);
    });
});
