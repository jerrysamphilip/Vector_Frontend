import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountSecurity from './AccountSecurity';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';

const session = (role, extra = {}) => ({
    user: { id: 'u-1', first_name: 'Ada', role, permissions: [] }, mfa_enabled: false, mfa_required: false, mfa_setup_required: false,
    recovery_codes_remaining: 0, ...extra,
});
const opts = (role, over = {}) => ({ route: '/app/account/security', role, http: { 'GET /auth/session': session(role), ...over } });

describe('AccountSecurity page', () => {
    it('shows two-factor status and the workspace policy for a Super Admin', async () => {
        renderPage(<AccountSecurity />, opts('SUPER_ADMIN'));
        expect(screen.getByRole('heading', { name: 'Account security' })).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: /set up two-factor/i })).toBeInTheDocument();
        expect(screen.getByText(/require two-factor for everyone/i)).toBeInTheDocument();
    });

    it('shows loading', () => {
        renderPage(<AccountSecurity />, opts('AGENT', { 'GET /auth/session': pending() }));
        expectLoading();
    });

    it('reports a failed load', async () => {
        renderPage(<AccountSecurity />, opts('AGENT', { 'GET /auth/session': fail(500) }));
        await expectLoadError();
    });

    it('hides the workspace policy from an AGENT', async () => {
        renderPage(<AccountSecurity />, opts('AGENT'));
        await screen.findByRole('button', { name: /set up two-factor/i });
        expect(screen.queryByText(/require two-factor for everyone/i)).toBeNull();
    });

    it('starts the set-up flow', async () => {
        renderPage(<AccountSecurity />, opts('AGENT'));
        await userEvent.click(await screen.findByRole('button', { name: /set up two-factor/i }));
        expect(screen.getByText(/authenticator app on your phone/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });
});
