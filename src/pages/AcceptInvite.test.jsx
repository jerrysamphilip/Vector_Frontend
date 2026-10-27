import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AcceptInvite from './AcceptInvite';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError } from '../test/pageAssertions';

const opts = (http, path = '/accept-invite?token=inv-1') => ({ route: '/accept-invite', path, signedIn: false, http });
const fill = async () => {
    await userEvent.type(screen.getByPlaceholderText('First name'), 'Bob');
    await userEvent.type(screen.getByPlaceholderText('Last name'), 'Builder');
    await userEvent.type(screen.getByPlaceholderText('Minimum 8 characters'), 'longpassword');
    await userEvent.type(screen.getByPlaceholderText('Re-enter password'), 'longpassword');
    await userEvent.click(screen.getByRole('button', { name: 'Accept Invite' }));
};

describe('AcceptInvite page', () => {
    it('creates the account from the invitation', async () => {
        const { http } = renderPage(<AcceptInvite />, opts({ 'POST /users/accept-invite': {} }));
        expect(screen.getByText('Accept Invitation')).toBeInTheDocument();
        await fill();
        expect(await screen.findByText(/account created successfully/i)).toBeInTheDocument();
        expect(http.requests[0].body).toEqual({ token: 'inv-1', first_name: 'Bob', last_name: 'Builder', password: 'longpassword' });
    });

    it('shows "Creating Account..." while saving', async () => {
        renderPage(<AcceptInvite />, opts({ 'POST /users/accept-invite': pending() }));
        await fill();
        expect(screen.getByRole('button', { name: 'Creating Account...' })).toBeDisabled();
    });

    it('shows the API error', async () => {
        renderPage(<AcceptInvite />, opts({ 'POST /users/accept-invite': fail(500) }));
        await fill();
        await expectLoadError();
    });

    it('rejects a link without a token', async () => {
        renderPage(<AcceptInvite />, opts({}, '/accept-invite'));
        await fill();
        expect(screen.getByText('Invalid or missing invitation token')).toBeInTheDocument();
    });
});
