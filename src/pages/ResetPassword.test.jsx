import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetPassword from './ResetPassword';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError } from '../test/pageAssertions';

const opts = (http, path = '/reset-password?token=tok-1') => ({ route: '/reset-password', path, signedIn: false, http });
const fill = async (pw = 'longpassword', confirm = pw) => {
    await userEvent.type(screen.getByPlaceholderText('Minimum 8 characters'), pw);
    await userEvent.type(screen.getByPlaceholderText('Re-enter password'), confirm);
    await userEvent.click(screen.getByRole('button', { name: 'Reset Password' }));
};

describe('ResetPassword page', () => {
    it('resets the password with the link token', async () => {
        const { http } = renderPage(<ResetPassword />, opts({ 'POST /auth/reset-password': {} }));
        await fill();
        expect(await screen.findByText(/password reset successful/i)).toBeInTheDocument();
        expect(http.requests[0].body).toEqual({ token: 'tok-1', new_password: 'longpassword' });
    });

    it('shows "Resetting..." while saving', async () => {
        renderPage(<ResetPassword />, opts({ 'POST /auth/reset-password': pending() }));
        await fill();
        expect(screen.getByRole('button', { name: 'Resetting...' })).toBeDisabled();
    });

    it('shows the API error', async () => {
        renderPage(<ResetPassword />, opts({ 'POST /auth/reset-password': fail(400, 'Reset link expired') }));
        await fill();
        expect(await screen.findByText(/Reset link expired.*Reference: req-test-0001/)).toBeInTheDocument();
    });

    it('shows a server failure', async () => {
        renderPage(<ResetPassword />, opts({ 'POST /auth/reset-password': fail(500) }));
        await fill();
        await expectLoadError();
    });

    it('checks the confirmation before calling the API', async () => {
        renderPage(<ResetPassword />, opts({}));
        await fill('longpassword', 'different1');
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
});
