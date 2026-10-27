// Settings.jsx is not routed in App.jsx today (/app/settings renders Dashboard); rendered at a test route.
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from './Settings';
import { fail, renderPage } from '../test/renderPage';
import { expectLoadError } from '../test/pageAssertions';

const opts = (http) => ({ route: '/app/account-settings', http });

describe('Settings page', () => {
    it('shows the profile prefilled from the signed-in user', () => {
        renderPage(<Settings />, opts({}));
        expect(screen.getByRole('heading', { name: 'Account Settings' })).toBeInTheDocument();
        expect(screen.getByDisplayValue('Ada')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Lovelace')).toBeInTheDocument();
    });

    it('saves the profile', async () => {
        const { http } = renderPage(<Settings />, opts({ 'PUT /auth/me': { first_name: 'Augusta', last_name: 'Lovelace' } }));
        const first = screen.getByDisplayValue('Ada');
        await userEvent.clear(first);
        await userEvent.type(first, 'Augusta');
        await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
        expect(await screen.findByText(/profile updated successfully/i)).toBeInTheDocument();
        expect(http.requests[0].body).toEqual({ first_name: 'Augusta', last_name: 'Lovelace' });
    });

    it('shows a failed profile save', async () => {
        renderPage(<Settings />, opts({ 'PUT /auth/me': fail(500) }));
        await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
        await expectLoadError();
    });
});
