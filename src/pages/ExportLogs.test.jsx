import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportLogs from './ExportLogs';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';

const log = (id, extra = {}) => ({
    export_id: id, user_id: 'u-1', user_name: 'Ada Lovelace', object_type: 'CONTACT', row_count: 1200, format: 'csv',
    filter_summary: 'q=acme | columns: name, email', created_at: '2026-10-20T10:00:00Z', ...extra,
});
const opts = (over = {}, role) => ({
    route: '/app/settings/export-logs', role,
    http: { 'GET /exports/logs': (req) => ({ items: req.query.object_type === 'LIST' ? [log('e2', { object_type: 'LIST', filter_summary: 'list=VIP' })] : [log('e1')], total: 1, page: 1, page_size: 50 }), ...over },
});

describe('Export log page', () => {
    it('lists exports for admins', async () => {
        renderPage(<ExportLogs />, opts());
        expect(await screen.findByText('q=acme | columns: name, email')).toBeInTheDocument();
        expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
        expect(screen.getByText('1,200')).toBeInTheDocument();
    });

    it('filters by exported records', async () => {
        const { http } = renderPage(<ExportLogs />, opts());
        await screen.findByText('q=acme | columns: name, email');
        await userEvent.selectOptions(screen.getByLabelText('Exported records'), 'LIST');
        expect(await screen.findByText('list=VIP')).toBeInTheDocument();
        await waitFor(() => expect(http.requests.at(-1).query.object_type).toBe('LIST'));
    });

    it('shows a spinner while loading', () => {
        renderPage(<ExportLogs />, opts({ 'GET /exports/logs': pending() }));
        expectLoading();
    });

    it('reports a failed load', async () => {
        renderPage(<ExportLogs />, opts({ 'GET /exports/logs': fail(500) }));
        await expectLoadError({ emptyText: /no exports yet/i });
    });

    it('is for admins only', () => {
        renderPage(<ExportLogs />, opts({}, 'MANAGER'));
        expect(screen.getByText('Only admins can see the export log.')).toBeInTheDocument();
    });
});
