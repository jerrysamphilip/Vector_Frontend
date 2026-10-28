import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AutomationRules from './AutomationRules';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
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

    it('reports a failed load instead of "No automation rules yet"', async () => {
        renderPage(<AutomationRules />, opts({ 'GET /automation-rules/': fail(500) }));
        await expectLoadError({ emptyText: /no automation rules yet/i });
    });

    it('offers Retry after a failed load', async () => {
        let calls = 0;
        renderPage(<AutomationRules />, opts({ 'GET /automation-rules/': () => (++calls === 1 ? fail(500) : rules) }));
        await userEvent.click(await screen.findByRole('button', { name: /retry/i }));
        expect(await screen.findByText('Nudge openers')).toBeInTheDocument();
    });

    it('deletes a rule only after the confirm dialog (F5: no window.confirm)', async () => {
        const { http: rec } = renderPage(<AutomationRules />, opts({ 'DELETE /automation-rules/:id': {} }));
        await screen.findByText('Nudge openers');
        await userEvent.click(screen.getAllByTitle('Delete Rule')[0]);
        const ask = await screen.findByRole('dialog', { name: 'Delete this rule?' });
        await userEvent.click(within(ask).getByRole('button', { name: 'Cancel' }));
        expect(rec.requests.some(r => r.method === 'DELETE')).toBe(false);
        await userEvent.click(screen.getAllByTitle('Delete Rule')[0]);
        await userEvent.click(within(await screen.findByRole('dialog', { name: 'Delete this rule?' })).getByRole('button', { name: 'Delete' }));
        await waitFor(() => expect(screen.queryByText('Nudge openers')).toBeNull());
        expect(rec.requests.some(r => r.method === 'DELETE' && r.path === '/automation-rules/r-1')).toBe(true);
    });

    it('reports a failed create in a toast (F5: no alert())', async () => {
        renderPage(<AutomationRules />, {
            ...opts({ 'POST /automation-rules/': fail(422, 'Template is required'), 'GET /campaigns/:id/templates': [] }),
            allowConsoleError: [/Error fetching/, /Error creating rule/],
        });
        await screen.findByText('Nudge openers');
        await userEvent.click(screen.getByRole('button', { name: /create new rule/i }));
        const dialog = await screen.findByRole('dialog', { name: /create automation rule/i });
        await userEvent.type(within(dialog).getByPlaceholderText(/follow up after open/i), 'New rule');
        await userEvent.selectOptions(within(dialog).getAllByRole('combobox')[2], 'PAUSE_PROSPECT');
        await userEvent.selectOptions(within(dialog).getAllByRole('combobox')[0], 'c-1');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Create Rule' }));
        expect(await screen.findByTestId('toast-error')).toHaveTextContent('Template is required');
        expect(screen.getByRole('dialog', { name: /create automation rule/i })).toBeInTheDocument();
    });
});
