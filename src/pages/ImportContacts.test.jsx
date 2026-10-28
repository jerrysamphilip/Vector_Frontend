import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportContacts from './ImportContacts';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { crmList, owners } from '../test/fixtures/crm';

const job = (over = {}) => ({
    import_id: 'im-1', file_name: 'old.csv', status: 'COMPLETED', total_rows: 5, processed_rows: 5, progress: 100,
    contacts_created: 5, contacts_updated: 0, companies_created: 1, companies_updated: 0, skipped: 0, error_count: 0,
    created_by_name: 'Ada', started_at: '2026-10-01T10:00:00Z', background: false, options: {}, ...over,
});
const http = (over = {}) => ({
    'GET /imports': { items: [job(), job({ import_id: 'im-2', file_name: 'big.xlsx', status: 'RUNNING', processed_rows: 500, total_rows: 2000, progress: 25, background: true })] },
    'GET /imports/mappings': [],
    'GET /contacts/owners': owners,
    'GET /lists': { items: [crmList('l-1')] },
    ...over,
});

describe('ImportContacts page', () => {
    it('lists past imports with the progress of a running one', async () => {
        renderPage(<ImportContacts />, { route: '/app/import', http: http() });
        expect(screen.getByRole('heading', { level: 1, name: /import contacts and companies/i })).toBeInTheDocument();
        expect(await screen.findByText('old.csv')).toBeInTheDocument();
        expect(screen.getByText('running 25%')).toBeInTheDocument();
        expect(screen.getByRole('progressbar', { name: /import progress/i })).toHaveAttribute('aria-valuenow', '25');
        expect(screen.getByRole('button', { name: /new import/i })).toBeInTheDocument();
    });

    it('opens the wizard from Contacts → Import (?new=1)', async () => {
        renderPage(<ImportContacts />, { route: '/app/import', path: '/app/import?new=1', http: http() });
        const dialog = await screen.findByRole('dialog', { name: /import contacts and companies/i });
        expect(within(dialog).getByText('Drop a file here or click to choose')).toBeInTheDocument();
    });

    it('reopens a running background import from the history', async () => {
        renderPage(<ImportContacts />, { route: '/app/import', http: http({ 'GET /imports/:id': job({ import_id: 'im-2', file_name: 'big.xlsx', status: 'RUNNING', progress: 25, processed_rows: 500, total_rows: 2000, background: true }) }) });
        await userEvent.click(await screen.findByRole('button', { name: 'big.xlsx' }));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('Importing…')).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: /cancel import/i })).toBeInTheDocument();
    });

    it('shows a spinner while the history loads', () => {
        renderPage(<ImportContacts />, { route: '/app/import', http: http({ 'GET /imports': pending() }) });
        expectLoading();
    });

    it('reports a history that could not load', async () => {
        renderPage(<ImportContacts />, { route: '/app/import', http: http({ 'GET /imports': fail(500) }) });
        await expectLoadError();
    });
});
