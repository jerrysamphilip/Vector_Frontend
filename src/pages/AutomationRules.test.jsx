import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AutomationRules from './AutomationRules';
import { fail, pending, renderPage } from '../test/renderPage';
import { bug, expectLoadError, expectLoading } from '../test/pageAssertions';
import { campaign, campaignPage } from '../test/fixtures/campaigns';

const rules = [
    { rule_id: 'r-1', name: 'Nudge openers', trigger_type: 'EMAIL_OPENED', action_type: 'SEND_EMAIL', delay_hours: 24, is_active: true },
    { rule_id: 'r-2', name: 'Chase silence', trigger_type: 'NO_REPLY', action_type: 'SEND_EMAIL', delay_hours: 72, is_active: false },
];
const http = (over = {}) => ({ 'GET /automation-rules/': rules, 'GET /campaigns': campaignPage([campaign('c-1')]), ...over });
const opts = (over) => ({ route: '/app/automation', http: http(over), allowConsoleError: [/Error fetching/] });

describe('AutomationRules page', () => {
    it('lists the rules', async () => {
        renderPage(<AutomationRules />, opts());
        expect(screen.getByRole('heading', { level: 1, name: /automation rules/i })).toBeInTheDocument();
        expect(await screen.findByText('Nudge openers')).toBeInTheDocument();
        expect(screen.getByText('Chase silence')).toBeInTheDocument();
    });

    it('shows loading', () => {
        renderPage(<AutomationRules />, opts({ 'GET /automation-rules/': pending() }));
        expectLoading();
    });

    it('filters rules by name', async () => {
        renderPage(<AutomationRules />, opts());
        await screen.findByText('Nudge openers');
        await userEvent.type(screen.getByPlaceholderText(/search rules/i), 'chase');
        await waitFor(() => expect(screen.queryByText('Nudge openers')).toBeNull()); // framer-motion exit
        expect(screen.getByText('Chase silence')).toBeInTheDocument();
    });

    it('opens the create-rule dialog', async () => {
        renderPage(<AutomationRules />, opts());
        await screen.findByText('Nudge openers');
        await userEvent.click(screen.getByRole('button', { name: /create new rule/i }));
        expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    bug('reports a failed load instead of "No automation rules yet"', 'fetch error only console.error\'d; the empty state is shown', async () => {
        renderPage(<AutomationRules />, opts({ 'GET /automation-rules/': fail(500) }));
        await expectLoadError({ emptyText: /no automation rules yet/i });
    });
});
