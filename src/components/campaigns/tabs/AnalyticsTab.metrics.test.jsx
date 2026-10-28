// UAT defects 3-5: campaign analytics labels name what they count, rates name their denominator, and the
// chart / reply dates are read as the calendar day / UTC instant the API means, in any browser time zone.
import { cloneElement } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api/inboxes', () => ({ inboxesApi: { list: vi.fn() } }));
vi.mock('../../../api/campaigns', () => ({ campaignApi: { getSequenceStepEmails: vi.fn() } }));
// jsdom has no layout: give the chart a fixed size so its axis ticks render
vi.mock('recharts', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, ResponsiveContainer: ({ children }) => cloneElement(children, { width: 900, height: 300 }) };
});

import { campaignApi } from '../../../api/campaigns';
import { inboxesApi } from '../../../api/inboxes';
import { USER_KEY } from '../../../lib/authStorage';
import AnalyticsTab from './AnalyticsTab';
import CampaignsTable from '../CampaignsTable';

// The UAT campaign: 415 enrolled, 36 sent, 7 bounced, 16 unique openers
const UAT_METRICS = { sent_count: 36, opened_count: 16, bounced_count: 7, replied_count: 0 };
const UAT_CAMPAIGN = { campaign_id: 'c-1', campaign_name: 'Test Bhavna', prospect_count: 415, status: 'PAUSED',
    sending_inboxes: [{ inbox_id: 'i1' }] };

const originalTZ = process.env.TZ;

function renderTab(props = {}) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <AnalyticsTab metrics={UAT_METRICS} barData={[]} sequences={[]} leadStats={{ total: 415, data: [] }}
                campaign={UAT_CAMPAIGN} setChartFilter={() => {}} {...props} />
        </QueryClientProvider>,
    );
}

const xTicks = (container) => [...container.querySelectorAll('.recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value')]
    .map(t => t.textContent);
const tile = (label) => screen.getByText(label, { selector: 'p' }).parentElement;

beforeEach(() => {
    localStorage.setItem(USER_KEY, JSON.stringify({ role: 'ADMIN', tenant_id: 't' }));
    inboxesApi.list.mockResolvedValue([{ inbox_id: 'i1', sent_today: 20, daily_capacity: 500 }]);
});

afterEach(() => {
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
});

describe('AnalyticsTab labels (UAT 3-5)', () => {
    it('calls prospect_count "Enrolled" and says what Total Sent counts', () => {
        renderTab();
        expect(screen.queryByText('Total Leads Contacted')).toBeNull();
        expect(within(tile('Enrolled')).getByText('415')).toBeInTheDocument();
        const sent = tile('Total Sent');
        expect(within(sent).getByText('36')).toBeInTheDocument();
        expect(within(sent).queryByText('Contacts enrolled')).toBeNull();
        expect(within(sent).getByText('Emails sent (incl. bounced)')).toBeInTheDocument();
    });

    it('names the real denominator of every rate: delivered for opens / replies, sent for bounces', () => {
        renderTab();
        expect(screen.queryByText(/of metrics/)).toBeNull();
        expect(within(tile('Opened (unique)')).getByText('55.2% of delivered')).toBeInTheDocument();   // 16 / (36 - 7)
        expect(within(tile('Bounced')).getByText('19.4% of sent')).toBeInTheDocument();             // 7 / 36
        expect(within(tile('Unsubscribed')).getByText('0.0% of sent')).toBeInTheDocument();
        expect(screen.getByTitle(/repeat opens are not counted/i)).toBeInTheDocument();
    });

    it('says the sent-today card is mailbox-wide, for today since 00:00 UTC, against the capacity', async () => {
        renderTab();
        await waitFor(() => expect(screen.getByTestId('sent-today-value')).toHaveTextContent('20 / 500'));
        expect(screen.queryByText('Total Sent Today / Limit')).toBeNull();
        expect(screen.getByText(/Mailbox sends today/)).toBeInTheDocument();
        expect(screen.getByText(/all campaigns/)).toBeInTheDocument();
        expect(screen.getByText(/since 00:00 UTC/)).toBeInTheDocument();
        expect(screen.getByText(/daily capacity/)).toBeInTheDocument();
    });
});

describe('AnalyticsTab chart buckets are calendar days (UAT 3-5)', () => {
    const day = (date, sent) => ({ date, sent, opened: 0, replied: 0, bounced: 0 });

    it('labels the "2026-10-26" bar Oct 26 in New York (not Oct 25)', async () => {
        process.env.TZ = 'America/New_York';
        const { container } = renderTab({ barData: [day('2026-10-24', 0), day('2026-10-25', 0), day('2026-10-26', 36)] });
        await waitFor(() => expect(xTicks(container)).toEqual(['Oct 24', 'Oct 25', 'Oct 26']));
    });

    it('puts "2026-11-01" in November in the monthly view', async () => {
        process.env.TZ = 'America/New_York';
        const { container } = renderTab({ chartFilter: 'Monthly', barData: [day('2026-10-31', 3), day('2026-11-01', 5)] });
        await waitFor(() => expect(xTicks(container)).toEqual(['Oct 2026', 'Nov 2026']));
    });

    it('reads a reply time without a zone as UTC', async () => {
        process.env.TZ = 'America/New_York';
        campaignApi.getSequenceStepEmails.mockResolvedValue({
            template: { subject: 'Hi', body: 'b' },
            recent_replies: [{ from_email: 'a@x.test', subject: 'Hi', body_text: 'yes', received_at: '2026-10-26T14:00:00' }],
        });
        renderTab({ sequences: [{ step: 1, type: 'Initial Email', sent: 36, openRate: 55.17, replyRate: 0, bounceRate: 19.44 }] });
        fireEvent.click(screen.getByText('View Emails'));
        const expected = new Date(Date.UTC(2026, 9, 26, 14, 0, 0)).toLocaleString();   // 10:00 AM in New York
        await waitFor(() => expect(screen.getByText(expected)).toBeInTheDocument());
    });
});

describe('CampaignsTable header (UAT 3-5)', () => {
    it('calls the in-progress column "In sequence" and explains it', () => {
        render(
            <MemoryRouter>
                <CampaignsTable campaigns={[{ campaign_id: 'c-1', campaign_name: 'Test Bhavna', status: 'PAUSED',
                    prospect_count: 415, in_progress_count: 408, sent_count: 36, opened_count: 16, bounced_count: 7 }]}
                visibleCols={['inProgress', 'sent', 'opened']} onToggleSelect={() => {}} onToggleAll={() => {}} />
            </MemoryRouter>,
        );
        expect(screen.queryByText('In Progress')).toBeNull();
        const head = screen.getByText('In sequence');
        expect(head.closest('[title]').getAttribute('title')).toMatch(/not finished.*not emailed yet.*bounced.*unsubscribed.*completed/is);
        expect(screen.getByText('Opened').closest('[title]').getAttribute('title')).toMatch(/unique.*delivered/i);
        expect(screen.getByText('55.2%')).toBeInTheDocument();
    });
});
