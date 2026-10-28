import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import EmailAccounts from './EmailAccounts';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';

const inbox = { inbox_id: 'i-1', email_address: 'sales@acme.test', provider: 'SMTP', status: 'ACTIVE', warmup_enabled: true, sent_today: 3, daily_limit: 50, health_score: 90 };
const http = (over = {}) => ({
    'GET /company-profiles/sender-identity': { sender_name: 'Ada', sender_email: 'ada@acme.test' },
    'GET /inboxes': [inbox],
    'GET /inboxes/warmup/overview': {},
    'GET /inboxes/:id/warmup': {},
    'GET /deliverability/alert-preferences': {},
    ...over,
});

describe('EmailAccounts page', () => {
    it('lists the mailboxes', async () => {
        renderPage(<EmailAccounts />, { route: '/app/inboxes', http: http() });
        expect(screen.getByRole('heading', { name: 'Email Accounts' })).toBeInTheDocument();
        expect((await screen.findAllByText('sales@acme.test')).length).toBeGreaterThan(0);
    });

    it('shows loading', () => {
        renderPage(<EmailAccounts />, { route: '/app/inboxes', http: http({ 'GET /inboxes': pending() }) });
        expectLoading();
    });

    it('reports a failed mailbox load', async () => {
        renderPage(<EmailAccounts />, { route: '/app/inboxes', http: http({ 'GET /inboxes': fail(500) }) });
        await expectLoadError({ emptyText: /no mailboxes match/i });
    });
});
