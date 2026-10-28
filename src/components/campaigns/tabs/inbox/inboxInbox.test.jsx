import { render, screen, waitFor, act, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../api/inboxes', () => ({
    conversationsApi: { list: vi.fn(), get: vi.fn(), reply: vi.fn() },
    inboxesApi: { list: vi.fn().mockResolvedValue([]), sync: vi.fn() },
}));
vi.mock('../../../../api/sales', () => ({ leadsApi: { fromMessage: vi.fn() } }));

import { conversationsApi } from '../../../../api/inboxes';
import { flattenPages, nextPageParam, useCampaignInbox, PAGE_SIZE } from './useCampaignInbox';
import { ActivityTimeline, DeliveryTick, ReplyLabelBadge, deliveryState } from './inboxBadges';
import ConversationListItem from './ConversationListItem';

const wrapper = ({ children }) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return <MemoryRouter><QueryClientProvider client={client}>{children}</QueryClientProvider></MemoryRouter>;
};

const conv = (id, extra = {}) => ({
    id, prospect_id: `p-${id}`, prospect_name: `Name ${id}`, prospect_email: `${id}@x.com`, inbox_email: 'me@x.com',
    subject: `Subject ${id}`, last_message_snippet: 'hi', last_message_at: new Date().toISOString(), is_unread: false,
    status: 'OPEN', last_message_direction: 'OUTBOUND', ...extra,
});

describe('inbox paging helpers', () => {
    it('reads the next page from has_more, or from the totals', () => {
        expect(nextPageParam({ page: 1, page_size: 30, total: 31, has_more: true })).toBe(2);
        expect(nextPageParam({ page: 2, page_size: 30, total: 31, has_more: false })).toBeUndefined();
        expect(nextPageParam({ page: 1, page_size: 30, total: 31 })).toBe(2);
        expect(nextPageParam(undefined)).toBeUndefined();
    });

    it('flattens pages and shows a conversation once when it moved pages', () => {
        const data = { pages: [{ items: [conv('a'), conv('b')] }, { items: [conv('b'), conv('c')] }] };
        expect(flattenPages(data).map(c => c.id)).toEqual(['a', 'b', 'c']);
        expect(flattenPages(undefined)).toEqual([]);
    });
});

describe('useCampaignInbox', () => {
    beforeEach(() => {
        conversationsApi.list.mockReset();
        conversationsApi.get.mockReset();
        conversationsApi.get.mockResolvedValue({ id: 'a', messages: [] });
    });

    it('searches on the server (debounced) and loads the next page', async () => {
        conversationsApi.list.mockImplementation(async ({ page }) => ({
            items: [conv(`c${page}`)], total: 2, page, page_size: PAGE_SIZE, has_more: page === 1,
        }));
        const { result } = renderHook(() => useCampaignInbox({ campaignId: 'camp-1' }), { wrapper });
        await waitFor(() => expect(result.current.conversations).toHaveLength(1));
        expect(conversationsApi.list).toHaveBeenLastCalledWith(
            expect.objectContaining({ campaign_id: 'camp-1', page: 1, page_size: PAGE_SIZE }));
        expect(result.current.hasNextPage).toBe(true);

        await act(async () => { await result.current.fetchNextPage(); });
        await waitFor(() => expect(result.current.conversations.map(c => c.id)).toEqual(['c1', 'c2']));
        expect(result.current.hasNextPage).toBe(false);

        act(() => result.current.setSearchQuery('  50%_off  '));
        await waitFor(() => expect(conversationsApi.list).toHaveBeenLastCalledWith(
            expect.objectContaining({ search: '50%_off', page: 1 })));
    });
});

describe('inbox badges', () => {
    it('derives the delivery tick from final_status', () => {
        expect(deliveryState({ status: 'QUEUED' })).toBe('queued');
        expect(deliveryState({ status: 'SENT' })).toBe('sent');
        expect(deliveryState({ status: 'SENT', final_status: 'DELIVERED' })).toBe('delivered');
        expect(deliveryState({ status: 'SENT', delivered_at: '2026-10-01T00:00:00' })).toBe('delivered');
        expect(deliveryState({ status: 'SENT', final_status: 'BOUNCED' })).toBe('bounced');
        expect(deliveryState({ status: 'FAILED', final_status: 'FAILED' })).toBe('failed');
        expect(deliveryState({ status: 'SENT', final_status: 'UNCONFIRMED' })).toBe('unconfirmed');
        render(<DeliveryTick message={{ status: 'SENT', final_status: 'BOUNCED' }} />);
        expect(screen.getByLabelText('Bounced')).toBeInTheDocument();
    });

    it('shows reply labels and the review flag', () => {
        render(<><ReplyLabelBadge label="POSITIVE" /><ReplyLabelBadge label="UNSUBSCRIBE" needsReview /></>);
        const badges = screen.getAllByTestId('reply-label');
        expect(badges[0]).toHaveTextContent('Positive');
        expect(badges[1]).toHaveTextContent('Unsubscribe ?');
        expect(badges[1]).toHaveAttribute('title', expect.stringContaining('review'));
        const { container } = render(<ReplyLabelBadge label={null} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the activity timeline with the reply label', () => {
        render(<ActivityTimeline activity={[
            { type: 'SENT', at: '2026-10-01T09:00:00Z' }, { type: 'OPENED', at: '2026-10-01T10:00:00Z' },
            { type: 'REPLIED', at: '2026-10-01T11:00:00Z', reply_label: 'NEGATIVE' },
        ]} />);
        const list = screen.getByRole('list', { name: 'Email activity' });
        expect(list).toHaveTextContent('Sent');
        expect(list).toHaveTextContent('Opened');
        expect(list).toHaveTextContent('Replied');
        expect(list).toHaveTextContent('Not interested');
    });

    it('list item shows campaign name, label badge and tick', async () => {
        const setSelectedId = vi.fn();
        render(<ConversationListItem inbox={{ selectedId: null, setSelectedId }}
            c={conv('z', { campaign_name: 'Q4 Push', last_reply_label: 'POSITIVE', last_message_direction: 'INBOUND' })} />);
        expect(screen.getByText('Q4 Push')).toBeInTheDocument();
        expect(screen.getByTestId('reply-label')).toHaveTextContent('Positive');
        await userEvent.click(screen.getByRole('button'));
        expect(setSelectedId).toHaveBeenCalledWith('z');

        render(<ConversationListItem inbox={{ selectedId: null, setSelectedId }}
            c={conv('y', { last_message_status: 'SENT', last_message_final_status: 'DELIVERED' })} />);
        expect(screen.getByTestId('tick-delivered')).toBeInTheDocument();
    });
});
