import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api/inboxes', () => ({ inboxesApi: { list: vi.fn() } }));

import { inboxesApi } from '../../../api/inboxes';
import { USER_KEY } from '../../../lib/authStorage';
import AnalyticsTab from './AnalyticsTab';
import { campaignInboxIds, formatSentToday, sentTodayVsCapacity } from './sentToday';

const inbox = (inbox_id, sent_today, daily_capacity) => ({ inbox_id, email_address: `${inbox_id}@x.test`, sent_today, daily_capacity });
const campaign = (ids) => ({ campaign_id: 'c-1', campaign_name: 'Q4', sending_inboxes: ids.map(inbox_id => ({ inbox_id })) });

describe('sentTodayVsCapacity', () => {
    it('sums sent_today and daily_capacity over the campaign inboxes only', () => {
        const all = [inbox('i1', 12, 100), inbox('i2', 3, 50), inbox('other', 999, 999)];
        expect(sentTodayVsCapacity(campaign(['i1', 'i2']), all)).toEqual({ sent: 15, capacity: 150, inboxCount: 2 });
        expect(sentTodayVsCapacity(campaign(['i1']), { items: all })).toEqual({ sent: 12, capacity: 100, inboxCount: 1 });
    });

    it('is unknown when the list is missing, the campaign has no listed inbox, or a figure is missing', () => {
        const unknown = { sent: null, capacity: null, inboxCount: 0 };
        expect(sentTodayVsCapacity(campaign(['i1']), undefined)).toEqual(unknown);
        expect(sentTodayVsCapacity(campaign([]), [inbox('i1', 1, 2)])).toEqual(unknown);
        expect(sentTodayVsCapacity(campaign(['gone']), [inbox('i1', 1, 2)])).toEqual(unknown);
        expect(sentTodayVsCapacity(campaign(['i1', 'i2']), [inbox('i1', 4, 100), inbox('i2', null, 50)]))
            .toEqual({ sent: null, capacity: 150, inboxCount: 2 });
    });

    it('reads inbox_ids when the campaign has no sending_inboxes; formats unknowns as a dash', () => {
        expect(campaignInboxIds({ inbox_ids: ['a', 'b'] })).toEqual(['a', 'b']);
        expect(campaignInboxIds(null)).toEqual([]);
        expect(formatSentToday({ sent: 1200, capacity: 3000 })).toBe(`${(1200).toLocaleString()} / ${(3000).toLocaleString()}`);
        expect(formatSentToday({ sent: null, capacity: 40 })).toBe('— / 40');
        expect(formatSentToday({ sent: null, capacity: null })).toBe('—');
    });
});

function renderTab(props) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <AnalyticsTab metrics={{}} barData={[]} sequences={[]} leadStats={{}} {...props} />
        </QueryClientProvider>,
    );
}

describe('AnalyticsTab "Total Sent Today / Limit"', () => {
    beforeEach(() => { inboxesApi.list.mockReset(); });

    it('shows the summed figures of the campaign inboxes (no hard-coded value)', async () => {
        localStorage.setItem(USER_KEY, JSON.stringify({ role: 'ADMIN', tenant_id: 't' }));
        inboxesApi.list.mockResolvedValue([inbox('i1', 7, 200), inbox('i2', 5, 100), inbox('x', 50, 50)]);
        renderTab({ campaign: campaign(['i1', 'i2']) });
        await waitFor(() => expect(screen.getByTestId('sent-today-value')).toHaveTextContent('12 / 300'));
        expect(screen.getByText(/this campaign's 2 inboxes/)).toBeInTheDocument();
        expect(screen.queryByText('55')).toBeNull();
    });

    it('shows a dash when the figures are unknown (inbox list failed)', async () => {
        localStorage.setItem(USER_KEY, JSON.stringify({ role: 'SUPER_ADMIN', tenant_id: 't' }));
        inboxesApi.list.mockRejectedValue(new Error('boom'));
        renderTab({ campaign: campaign(['i1']) });
        await waitFor(() => expect(inboxesApi.list).toHaveBeenCalled());
        expect(screen.getByTestId('sent-today-value')).toHaveTextContent('—');
    });

    it('does not call the admin-only inbox list for other roles, and shows a dash', () => {
        localStorage.setItem(USER_KEY, JSON.stringify({ role: 'AGENT', tenant_id: 't' }));
        renderTab({ campaign: campaign(['i1']) });
        expect(inboxesApi.list).not.toHaveBeenCalled();
        expect(screen.getByTestId('sent-today-value')).toHaveTextContent('—');
    });
});
