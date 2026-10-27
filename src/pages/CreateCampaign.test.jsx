import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import CreateCampaign from './CreateCampaign';
import { fail, renderPage } from '../test/renderPage';
import { bug, expectLoadError } from '../test/pageAssertions';

const http = (over = {}) => ({
    'POST /campaigns/schedules/previews': { schedule: [] },
    'GET /campaign-drafts/current': fail(404, 'No draft'),
    'GET /company-profiles': [],
    'GET /personas': [],
    'GET /prospect-lists': { items: [], total: 0 },
    'GET /inboxes': [],
    ...over,
});

describe('CreateCampaign page', () => {
    it('opens the wizard on the details step', async () => {
        renderPage(<CreateCampaign />, { route: '/app/campaigns/new', http: http() });
        expect(screen.getByRole('heading', { name: 'Create Campaign' })).toBeInTheDocument();
        expect(await screen.findByRole('heading', { name: 'Campaign Setup' })).toBeInTheDocument();
    });

    bug('reports a failed draft load', 'useCampaignDraft only console.errors "[DRAFT] Failed to load draft"; the user sees nothing', async () => {
        renderPage(<CreateCampaign />, {
            route: '/app/campaigns/new', http: http({ 'GET /campaign-drafts/current': fail(500) }), allowConsoleError: [/\[DRAFT\]/],
        });
        await expectLoadError();
    });
});
