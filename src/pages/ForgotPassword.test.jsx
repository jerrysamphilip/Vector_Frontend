import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForgotPassword from './ForgotPassword';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError } from '../test/pageAssertions';

const opts = (http) => ({ route: '/forgot-password', signedIn: false, http });
const submit = async (email = 'ada@example.com') => {
    await userEvent.type(screen.getByPlaceholderText('your@email.com'), email);
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));
};

describe('ForgotPassword page', () => {
    it('sends the reset link and confirms', async () => {
        const { http } = renderPage(<ForgotPassword />, opts({ 'POST /auth/forgot-password': { message: 'Check your inbox' } }));
        expect(screen.getByText('Forgot Password')).toBeInTheDocument();
        await submit();
        expect(await screen.findByText('Check your inbox')).toBeInTheDocument();
        expect(http.requests[0].body).toEqual({ email: 'ada@example.com' });
    });

    it('shows "Sending..." while the request runs', async () => {
        renderPage(<ForgotPassword />, opts({ 'POST /auth/forgot-password': pending() }));
        await submit();
        expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled();
    });

    it('shows the API error', async () => {
        renderPage(<ForgotPassword />, opts({ 'POST /auth/forgot-password': fail(500) }));
        await submit();
        await expectLoadError();
    });

    it('requires an email', async () => {
        renderPage(<ForgotPassword />, opts({}));
        await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));
        expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
});
