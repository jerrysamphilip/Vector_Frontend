import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecentlyDeleted from './RecentlyDeleted';
import { fail, pending, renderPage } from '../test/renderPage';
import { bug, expectLoadError, expectLoading } from '../test/pageAssertions';
import { contact } from '../test/fixtures/crm';

const deleted = (extra) => contact('c-1', { full_name: 'Gone Contact', deleted_at: '2026-10-20T10:00:00Z', purge_at: '2027-01-18T10:00:00Z', deleted_by_name: 'Ada', ...extra });
const http = (over = {}) => ({
    'GET /contacts/deleted': { items: [deleted()], total: 1 },
    'GET /accounts/deleted': { items: [{ account_id: 'a-9', name: 'Gone Corp', deleted_at: '2026-10-20T10:00:00Z', purge_at: '2027-01-18T10:00:00Z' }] },
    'POST /contacts/restore': { restored: 1 },
    ...over,
});
const opts = (over) => ({ route: '/app/recently-deleted', http: http(over) });

describe('RecentlyDeleted page', () => {
    it('lists deleted contacts', async () => {
        renderPage(<RecentlyDeleted />, opts());
        expect(screen.getByRole('heading', { name: /recently deleted/i })).toBeInTheDocument();
        expect(await screen.findByText('Gone Contact')).toBeInTheDocument();
    });

    it('shows a spinner while loading', () => {
        renderPage(<RecentlyDeleted />, opts({ 'GET /contacts/deleted': pending() }));
        expectLoading();
    });

    it('restores a contact', async () => {
        const { http: h } = renderPage(<RecentlyDeleted />, opts());
        await screen.findByText('Gone Contact');
        await userEvent.click(screen.getByRole('button', { name: /^restore$/i }));
        expect(await screen.findByText('Restored 1 contact.')).toBeInTheDocument();
        await waitFor(() => expect(h.requests.find(r => r.method === 'POST').body).toEqual({ prospect_ids: ['c-1'] }));
    });

    it('switches to deleted companies', async () => {
        renderPage(<RecentlyDeleted />, opts());
        await userEvent.click(screen.getByRole('button', { name: 'Companies' }));
        expect(await screen.findByText('Gone Corp')).toBeInTheDocument();
    });

    bug('reports a failed load instead of "No contacts deleted"', 'query error ignored: shows the empty state', async () => {
        renderPage(<RecentlyDeleted />, opts({ 'GET /contacts/deleted': fail(500) }));
        await expectLoadError({ emptyText: /no contacts deleted/i });
    });
});
