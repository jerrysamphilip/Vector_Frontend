import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import TestAutomation from './TestAutomation';
import { fail, renderPage } from '../test/renderPage';
import { campaign, campaignPage } from '../test/fixtures/campaigns';
import { expectLoadError } from '../test/pageAssertions';

describe('TestAutomation page (dev only)', () => {
    it('loads campaigns into the dropdown', async () => {
        renderPage(<TestAutomation />, { route: '/app/test-automation', http: { 'GET /campaigns': campaignPage([campaign('c-1')]) } });
        expect(screen.getByRole('heading', { name: /test automation dropdown/i })).toBeInTheDocument();
        expect(await screen.findByText('Loaded 1 campaign(s)')).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /campaign c-1/i })).toBeInTheDocument();
    });

    it('shows the load error', async () => {
        renderPage(<TestAutomation />, {
            route: '/app/test-automation', http: { 'GET /campaigns': fail(500) }, allowConsoleError: [/TestAutomation/],
        });
        await expectLoadError();
    });
});
