import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Connections from './Connections';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';

const data = {
    connections: [{ connection_id: 'cn-1', provider: 'GOOGLE', account_email: 'ada@gmail.test', sync_email: true, sync_calendar: false, last_sync_at: null, last_error: null }],
    available: { GOOGLE: true, MICROSOFT: false },
};
const http = (over = {}) => ({ 'GET /connections': data, ...over });

describe('Connections page', () => {
    it('shows the connected Google account and the unavailable Microsoft one', async () => {
        renderPage(<Connections />, { route: '/app/connections', http: http() });
        expect(screen.getByRole('heading', { name: /email and calendar sync/i })).toBeInTheDocument();
        expect(await screen.findByText('ada@gmail.test')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /connect microsoft/i })).toBeDisabled();
        expect(screen.getByText(/not set up on this server yet/i)).toBeInTheDocument();
    });

    it('shows loading', () => {
        renderPage(<Connections />, { route: '/app/connections', http: http({ 'GET /connections': pending() }) });
        expectLoading();
    });

    it('syncs a connection and reports what was logged', async () => {
        renderPage(<Connections />, {
            route: '/app/connections',
            http: http({ 'POST /connections/:id/sync': { connection: { connection_id: 'cn-1' }, emails: 2, meetings: 1 } }),
        });
        await userEvent.click(await screen.findByRole('button', { name: /sync now/i }));
        expect(await screen.findByText(/logged 2 email\(s\) and 1 meeting\(s\)/i)).toBeInTheDocument();
    });

    it('reports a failed load', async () => {
        renderPage(<Connections />, { route: '/app/connections', http: http({ 'GET /connections': fail(500) }) });
        await expectLoadError({ emptyText: /not set up on this server yet/i });
    });
});
