// Render coverage (W-11). Confirm outcomes are covered in ProspectValidate.f1.test.jsx.
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProspectValidate from './ProspectValidate';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';

const ROUTE = '/app/prospects/validate';
const state = {
    upload_id: 'up-1', title: 'October leads',
    records: [
        { row: 2, first_name: 'Ada', email: 'ada@acme.test', status: 'ACCEPTED' },
        { row: 3, first_name: 'Cy', email: 'cy@acme.test', status: 'REJECTED', reason: 'Duplicate' },
    ],
};
const open = (http = {}, withState = true) => renderPage(<ProspectValidate />, {
    route: ROUTE, path: withState ? { pathname: ROUTE, state } : ROUTE, http,
});

describe('ProspectValidate page', () => {
    it('shows the uploaded rows to validate', () => {
        open();
        expect(screen.getByRole('heading', { name: 'Validate Prospects' })).toBeInTheDocument();
        expect(screen.getByText('ada@acme.test')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /confirm upload \(1\)/i })).toBeEnabled();
    });

    it('goes back to Prospects without upload data (page refreshed)', async () => {
        open({}, false);
        expect(await screen.findByTestId('navigated-away')).toBeInTheDocument();
    });

    it('shows "Confirming..." while saving', async () => {
        open({ 'POST /uploads/:id/confirmations': pending() });
        await userEvent.click(screen.getByRole('button', { name: /confirm upload/i }));
        expect(screen.getByRole('button', { name: /confirming/i })).toBeDisabled();
        expectLoading();
    });

    it('shows a failed confirm', async () => {
        open({ 'POST /uploads/:id/confirmations': fail(500) });
        await userEvent.click(screen.getByRole('button', { name: /confirm upload/i }));
        await expectLoadError();
    });
});
