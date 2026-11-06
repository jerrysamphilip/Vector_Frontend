import { describe, expect, it } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CampaignEdit from './CampaignEdit';
import { fail, pending, renderPage, reply } from '../test/renderPage';
import { expectLoading } from '../test/pageAssertions';
import { campaign } from '../test/fixtures/campaigns';

const sequences = {
    campaign_id: 'c-1', total_steps: 2, total_wait_days: 2, steps: [
        { sequence_id: 's-1', campaign_id: 'c-1', step_number: 1, wait_days: 0, stop_on_reply: true, stop_on_bounce: true, row_version: 1 },
        { sequence_id: 's-2', campaign_id: 'c-1', step_number: 2, wait_days: 2, stop_on_reply: true, stop_on_bounce: true, row_version: 1 },
    ],
};
const assignments = {
    campaign_id: 'c-1', total: 1, limit: 500, offset: 0,
    steps: [
        { sequence_id: 's-1', step_number: 1, wait_days: 0, unassigned: 0, templates: [
            { template_id: 't-1', designation: null, subject: 'Hello {{first_name}}', body: '<p>Hi</p>', recipients: 0 },
            { template_id: 't-cfo', designation: 'CFO', subject: 'Numbers', body: '<p>For CFOs</p>', recipients: 1 },
        ] },
        { sequence_id: 's-2', step_number: 2, wait_days: 2, unassigned: 0, templates: [
            { template_id: 't-2', designation: null, subject: 'Follow up', body: '<p>Again</p>', recipients: 1 },
        ] },
    ],
    prospects: [{ prospect_id: 'p-1', name: 'Pat Prospect', email: 'pat@acme.test', persona: 'CFO', assignments: [
        { step_number: 1, sequence_id: 's-1', template_id: 't-cfo', source: 'email', message_status: 'SENT' },
        { step_number: 2, sequence_id: 's-2', template_id: 't-2', source: 'email', message_status: 'SCHEDULED' },
    ] }],
};
const check = { dry_run: true, unsent_emails_affected: 1, emails_rerendered: 1 };
const http = (over = {}) => ({
    'GET /campaigns/:id': campaign('c-1', {
        campaign_name: 'Autumn push', row_version: 4, sender_name: 'Ann', send_window_start: '09:00:00',
        send_window_end: '17:00:00', campaign_timezone: 'UTC', sending_inboxes: [{ inbox_id: 'i-1' }],
    }),
    'GET /campaigns/:id/sequences': sequences,
    'GET /campaigns/:id/template-assignments': assignments,
    'GET /inboxes': [{ inbox_id: 'i-1', email_address: 'sales@acme.test', status: 'ACTIVE' }],
    'POST /campaigns/:id/edits/checks': check,
    'POST /campaigns/:id/edits': { ...check, dry_run: false, campaign: { row_version: 5 } },
    ...over,
});
const opts = (over) => ({ route: '/app/campaigns/:id/edit', path: '/app/campaigns/c-1/edit', role: 'MANAGER', http: http(over) });

describe('CampaignEdit page', () => {
    it('shows every persona version per step with who receives it', async () => {
        renderPage(<CampaignEdit />, opts());
        expect(await screen.findByRole('heading', { level: 1, name: /Edit Autumn push/ })).toBeInTheDocument();
        expect(screen.getAllByTestId('step-1-version')).toHaveLength(2);
        expect(screen.getAllByText('1 contact gets this version')).toHaveLength(2);
        expect(screen.getByText('0 contacts get this version')).toBeInTheDocument();
        // step 1 was sent: it can't be deleted; the start date is locked after launch
        expect(screen.getByRole('button', { name: 'Delete step 1' })).toBeDisabled();
        expect(screen.getByLabelText(/Start date \(locked after launch\)/)).toBeDisabled();
    });

    it('shows the loading screen', () => {
        renderPage(<CampaignEdit />, opts({ 'GET /campaigns/:id': pending() }));
        expectLoading();
    });

    it('reviews the impact on unsent emails, then saves only what changed', async () => {
        const { http: h } = renderPage(<CampaignEdit />, opts());
        const subject = await screen.findByLabelText('Step 2 email 1 subject');
        await userEvent.clear(subject);
        await userEvent.type(subject, 'New follow up');
        await userEvent.click(screen.getByRole('button', { name: /Review and save/ }));
        expect(await screen.findByTestId('edit-impact')).toHaveTextContent('1 unsent email will be updated');
        await userEvent.click(screen.getByRole('button', { name: /Save changes/ }));
        await waitFor(() => expect(h.requests.some(r => r.method === 'POST' && r.path === '/campaigns/c-1/edits')).toBe(true));
        const body = h.requests.find(r => r.path === '/campaigns/c-1/edits').body;
        expect(body.expected_version).toBe(4);
        expect(body.steps).toEqual([
            { sequence_id: 's-1', templates: [] },
            { sequence_id: 's-2', templates: [{ template_id: 't-2', designation: null, subject: 'New follow up', body: '<p>Again</p>' }] },
        ]);
        expect(await screen.findByText(/Saved\./)).toBeInTheDocument();
    });

    it('saves a body edited in the rich-text editor as the editor HTML', async () => {
        const { http: h } = renderPage(<CampaignEdit />, opts());
        await screen.findByLabelText('Step 2 email 1 subject');
        const editors = [...document.querySelectorAll('.ProseMirror')];
        const step2 = editors.find(el => el.textContent === 'Again');
        act(() => { step2.editor.commands.selectAll(); });
        await userEvent.click(within(step2.closest('.border-2')).getByTitle('Bold'));
        await userEvent.click(screen.getByRole('button', { name: /Review and save/ }));
        await userEvent.click(await screen.findByRole('button', { name: /Save changes/ }));
        await waitFor(() => expect(h.requests.some(r => r.method === 'POST' && r.path === '/campaigns/c-1/edits')).toBe(true));
        const body = h.requests.find(r => r.path === '/campaigns/c-1/edits').body;
        expect(body.steps).toEqual([
            { sequence_id: 's-1', templates: [] },
            { sequence_id: 's-2', templates: [{ template_id: 't-2', designation: null, subject: 'Follow up', body: '<p><strong>Again</strong></p>' }] },
        ]);
    });

    it('fills a step email from the template library, after confirming the overwrite', async () => {
        const library = { items: [{ template_id: 'lib-1', name: 'Check-in', category: 'Follow-up', subject: 'Checking in, {{first_name}}', body: 'Hi {{first_name}},\nAny news?' }] };
        const { http: h } = renderPage(<CampaignEdit />, opts({ 'GET /template-library': library }));
        await screen.findByLabelText('Step 2 email 1 subject');
        await userEvent.click(screen.getByTitle('Fill step 2 email 1 from a library template'));
        await userEvent.click(await screen.findByRole('button', { name: /Check-in/ }));
        // The email has content: nothing changes until the replacement is confirmed
        const dialog = await screen.findByRole('dialog');
        expect(dialog).toHaveTextContent('Replace this email?');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Replace' }));
        await waitFor(() => expect(screen.getByLabelText('Step 2 email 1 subject')).toHaveValue('Checking in, {{first_name}}'));
        await waitFor(() => expect([...document.querySelectorAll('.ProseMirror')].some(el => el.textContent.includes('Any news?'))).toBe(true));
        await userEvent.click(screen.getByRole('button', { name: /Review and save/ }));
        await userEvent.click(await screen.findByRole('button', { name: /Save changes/ }));
        await waitFor(() => expect(h.requests.some(r => r.method === 'POST' && r.path === '/campaigns/c-1/edits')).toBe(true));
        const body = h.requests.find(r => r.path === '/campaigns/c-1/edits').body;
        expect(body.steps[1].templates).toEqual([{ template_id: 't-2', designation: null, subject: 'Checking in, {{first_name}}',
            body: '<p>Hi {{first_name}},</p><p>Any news?</p>' }]);
    });

    it('keeps the step email when the library overwrite is cancelled', async () => {
        const library = { items: [{ template_id: 'lib-1', name: 'Check-in', subject: 'Checking in', body: 'Any news?' }] };
        renderPage(<CampaignEdit />, opts({ 'GET /template-library': library }));
        await screen.findByLabelText('Step 2 email 1 subject');
        await userEvent.click(screen.getByTitle('Fill step 2 email 1 from a library template'));
        await userEvent.click(await screen.findByRole('button', { name: /Check-in/ }));
        await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));
        expect(screen.getByLabelText('Step 2 email 1 subject')).toHaveValue('Follow up');
    });

    it('warns about a merge field the campaign cannot fill', async () => {
        renderPage(<CampaignEdit />, opts());
        const subject = await screen.findByLabelText('Step 2 email 1 subject');
        expect(screen.queryByTestId('merge-fields-notice')).toBeNull();
        await userEvent.clear(subject);
        await userEvent.type(subject, 'Hi {{{{nickname}}');
        expect(await screen.findByTestId('merge-fields-notice')).toHaveTextContent('{{nickname}} is not a merge field a campaign can fill');
    });

    it('offers a reload when someone else changed the campaign (409)', async () => {
        renderPage(<CampaignEdit />, opts({
            'POST /campaigns/:id/edits/checks': reply(409, { detail: { code: 'STALE_VERSION', current_version: 5, message: 'changed' } }),
        }));
        await userEvent.click(await screen.findByRole('button', { name: /Review and save/ }));
        expect(await screen.findByText(/Someone else changed this campaign/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Reload/ })).toBeInTheDocument();
    });

    it('shows the API error of a refused edit', async () => {
        renderPage(<CampaignEdit />, opts({ 'POST /campaigns/:id/edits/checks': fail(400, 'The new step 3 needs an email') }));
        await userEvent.click(await screen.findByRole('button', { name: /Review and save/ }));
        expect(await screen.findByText('The new step 3 needs an email')).toBeInTheDocument();
    });

    describe('links in a body without a CTA link (A1-07b)', () => {
        const linked = {
            ...assignments,
            steps: assignments.steps.map(st => st.step_number !== 2 ? st : {
                ...st, templates: [{ ...st.templates[0], body: '<p>See <a href="https://example.com/case-1">our case study</a></p>' }],
            }),
        };

        it('warns under the body that the links are removed when sending', async () => {
            renderPage(<CampaignEdit />, opts({ 'GET /campaigns/:id/template-assignments': linked }));
            await screen.findByLabelText('Step 2 email 1 subject');
            const notices = screen.getAllByTestId('body-links-notice');
            expect(notices).toHaveLength(1);
            expect(notices[0]).toHaveTextContent('Links in the body are removed when sending unless a CTA link is set.');
            // setting a CTA link on the same page clears the warning
            await userEvent.type(screen.getByLabelText(/Booking \/ CTA link/), 'https://calendly.com/ann');
            expect(screen.queryByTestId('body-links-notice')).toBeNull();
        });

        it('shows no warning when the campaign has a CTA link', async () => {
            renderPage(<CampaignEdit />, opts({
                'GET /campaigns/:id/template-assignments': linked,
                'GET /campaigns/:id': campaign('c-1', {
                    campaign_name: 'Autumn push', row_version: 4, sender_name: 'Ann', cta_link: 'https://calendly.com/ann',
                    send_window_start: '09:00:00', send_window_end: '17:00:00', campaign_timezone: 'UTC',
                    sending_inboxes: [{ inbox_id: 'i-1' }],
                }),
            }));
            await screen.findByLabelText('Step 2 email 1 subject');
            expect(screen.queryByTestId('body-links-notice')).toBeNull();
        });
    });
});
