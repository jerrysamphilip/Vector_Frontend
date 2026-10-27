import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SetPassword from './SetPassword';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError } from '../test/pageAssertions';

const opts = (http) => ({ route: '/set-password', role: 'AGENT', http });
const fill = async (pw = 'longpassword', confirm = pw) => {
    await userEvent.type(screen.getByPlaceholderText('At least 8 characters'), pw);
    await userEvent.type(screen.getByPlaceholderText('Repeat new password'), confirm);
    await userEvent.click(screen.getByRole('button', { name: /set password & continue/i }));
};

describe('SetPassword page', () => {
    it('welcomes the invited user and sets the first password', async () => {
        const { http } = renderPage(<SetPassword />, opts({ 'POST /auth/me/set-password': {} }));
        expect(screen.getByRole('heading', { name: /welcome, ada/i })).toBeInTheDocument();
        await fill();
        await screen.findByText(/password set/i);
        expect(http.requests[0].body).toEqual({ new_password: 'longpassword' });
    });

    it('shows progress while saving', async () => {
        renderPage(<SetPassword />, opts({ 'POST /auth/me/set-password': pending() }));
        await fill();
        expect(screen.getByRole('button', { name: /setting password/i })).toBeDisabled();
    });

    it('shows the API error', async () => {
        renderPage(<SetPassword />, opts({ 'POST /auth/me/set-password': fail(500) }));
        await fill();
        await expectLoadError();
    });

    it('requires 8 characters', async () => {
        renderPage(<SetPassword />, opts({}));
        await fill('short', 'short');
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
});
