import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportContacts from './ImportContacts';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { crmList, owners } from '../test/fixtures/crm';

const preview = {
    headers: ['Email', 'Company'], row_count: 2, sample: [{ Email: 'a@acme.test', Company: 'Acme' }],
    suggested_mapping: { Email: 'email', Company: 'company.name' },
    targets: { contact: [{ value: 'email', label: 'Email' }], company: [{ value: 'company.name', label: 'Company name' }], custom: [] },
};
const http = (over = {}) => ({
    'GET /imports': { items: [{ import_id: 'im-1', file_name: 'old.csv', status: 'COMPLETED', total_rows: 5, contacts_created: 5, contacts_updated: 0, companies_created: 1, companies_updated: 0, error_count: 0, created_by_name: 'Ada', created_at: '2026-10-01T10:00:00Z' }] },
    'GET /contacts/owners': owners,
    'GET /lists': { items: [crmList('l-1')] },
    'POST /imports/preview': preview,
    ...over,
});
const opts = (over) => ({ route: '/app/import', http: http(over) });
const upload = (container) => userEvent.upload(container.querySelector('input[type="file"]'), new File(['Email,Company\na@acme.test,Acme'], 'people.csv', { type: 'text/csv' }));

describe('ImportContacts page', () => {
    it('shows the drop zone and past imports', async () => {
        renderPage(<ImportContacts />, opts());
        expect(screen.getByRole('heading', { level: 1, name: /import contacts and companies/i })).toBeInTheDocument();
        expect(screen.getByText('Drop a file here or click to choose')).toBeInTheDocument();
        expect(await screen.findByText('old.csv')).toBeInTheDocument();
    });

    it('previews a chosen file and maps its columns', async () => {
        const { container } = renderPage(<ImportContacts />, opts());
        await upload(container);
        expect(await screen.findByRole('heading', { name: 'Map columns' })).toBeInTheDocument();
        expect(screen.getByText('2 rows · 2 columns')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /import 2 rows/i })).toBeInTheDocument();
    });

    it('shows a spinner while the file is read', async () => {
        const { container } = renderPage(<ImportContacts />, opts({ 'POST /imports/preview': pending() }));
        await upload(container);
        expectLoading();
    });

    it('reports a file the server could not read', async () => {
        const { container } = renderPage(<ImportContacts />, opts({ 'POST /imports/preview': fail(500) }));
        await upload(container);
        await expectLoadError();
    });
});
