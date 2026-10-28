import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import Inbox from './Inbox';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { conversation } from '../test/fixtures/campaigns';

const imapInbox = { inbox_id: 'i-1', email_address: 'me@acme.test', imap_host: 'imap.acme.test' };
const page = (items) => ({ items, total: items.length, page: 1, page_size: 30, has_more: false });
const http = (over = {}) => ({
    'GET /inboxes': [imapInbox],
    'GET /conversations': page([conversation('a')]),
    'GET /conversations/:id': { id: 'a', messages: [] },
    'POST /inboxes/:id/sync*': {},
    ...over,
});

describe('Inbox page', () => {
    it('lists conversations', async () => {
        renderPage(<Inbox />, { route: '/app/inbox', http: http() });
        expect(screen.getByRole('heading', { name: 'Unified Inbox' })).toBeInTheDocument();
        expect((await screen.findAllByText('Prospect a')).length).toBeGreaterThan(0);
    });

    it('shows a loading list', () => {
        renderPage(<Inbox />, { route: '/app/inbox', http: http({ 'GET /conversations': pending() }) });
        expectLoading();
    });

    it('reports a failed conversation load', async () => {
        renderPage(<Inbox />, { route: '/app/inbox', http: http({ 'GET /conversations': fail(500) }) });
        await expectLoadError({ emptyText: /no emails yet/i });
    });

    it('does not call the admin-only inbox list for an AGENT', async () => {
        const { http: h } = renderPage(<Inbox />, { route: '/app/inbox', role: 'AGENT', http: http() });
        await screen.findAllByText('Prospect a');
        expect(h.requests.some(r => r.path === '/inboxes')).toBe(false);
    });
});
