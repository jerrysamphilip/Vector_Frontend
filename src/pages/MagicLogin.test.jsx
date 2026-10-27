import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import MagicLogin from './MagicLogin';
import { fail, pending, renderPage, reply } from '../test/renderPage';
import { expectLoading } from '../test/pageAssertions';

const signedIn = { user: { id: 'u-1', first_name: 'Ada', role: 'AGENT', permissions: [] }, first_login: false };

describe('MagicLogin page', () => {
    it('signs in with the link token and goes to the dashboard', async () => {
        const { http } = renderPage(<MagicLogin />, {
            route: '/magic-login', path: '/magic-login?token=tok-1', signedIn: false,
            http: { 'POST /auth/logout': reply(204, null), 'POST /auth/magic-login': signedIn },
        });
        expect(await screen.findByTestId('navigated-away')).toBeInTheDocument();
        expect(http.requests.find(r => r.path === '/auth/magic-login').body).toEqual({ token: 'tok-1' });
    });

    it('shows "Signing you in" while verifying', () => {
        renderPage(<MagicLogin />, {
            route: '/magic-login', path: '/magic-login?token=tok-1', signedIn: false,
            http: { 'POST /auth/logout': reply(204, null), 'POST /auth/magic-login': pending() },
        });
        expect(screen.getByRole('heading', { name: /signing you in/i })).toBeInTheDocument();
        expectLoading();
    });

    it('explains a rejected link', async () => {
        renderPage(<MagicLogin />, {
            route: '/magic-login', path: '/magic-login?token=bad', signedIn: false,
            http: { 'POST /auth/logout': reply(204, null), 'POST /auth/magic-login': fail(400, 'Link expired') },
        });
        expect(await screen.findByRole('heading', { name: /magic login failed/i })).toBeInTheDocument();
        expect(screen.getByText('Link expired')).toBeInTheDocument();
    });

    it('needs a token', async () => {
        renderPage(<MagicLogin />, { route: '/magic-login', signedIn: false });
        expect(await screen.findByText('Missing magic login token')).toBeInTheDocument();
    });
});
