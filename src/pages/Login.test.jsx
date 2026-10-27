import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError } from '../test/pageAssertions';

const opts = (http, path = '/login') => ({ route: '/login', path, signedIn: false, http });
const signIn = async () => {
    await userEvent.type(screen.getByLabelText('Email Address'), 'ada@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret-pass');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
};

describe('Login page', () => {
    it('signs in and leaves the page', async () => {
        const { http } = renderPage(<Login />, opts({ 'POST /auth/login': { user: { id: 'u-1', first_name: 'Ada', role: 'AGENT' } } }));
        await signIn();
        expect(await screen.findByTestId('navigated-away')).toBeInTheDocument();
        expect(http.requests[0].body).toEqual({ email: 'ada@example.com', password: 'secret-pass' });
    });

    it('shows "Signing in..." while waiting', async () => {
        renderPage(<Login />, opts({ 'POST /auth/login': pending() }));
        await signIn();
        expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled();
    });

    it('shows a rejected sign-in', async () => {
        renderPage(<Login />, opts({ 'POST /auth/login': fail(401, 'Invalid email or password') }));
        await signIn();
        expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    });

    it('shows a server failure', async () => {
        renderPage(<Login />, opts({ 'POST /auth/login': fail(500) }));
        await signIn();
        await expectLoadError();
    });

    it('explains why the session ended', () => {
        renderPage(<Login />, opts({}, '/login?reason=suspended'));
        expect(screen.getByText(/your workspace is suspended/i)).toBeInTheDocument();
    });

    it('asks for the second factor when the API requires it', async () => {
        renderPage(<Login />, opts({ 'POST /auth/login': { mfa_required: true, mfa_token: 'mfa-1' } }));
        await signIn();
        expect((await screen.findAllByText(/authenticat|verification|code/i)).length).toBeGreaterThan(0);
        expect(screen.queryByRole('button', { name: 'Login' })).toBeNull();
    });
});
