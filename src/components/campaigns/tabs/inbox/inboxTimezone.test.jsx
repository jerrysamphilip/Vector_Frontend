import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MessageBubble from './MessageBubble';
import ConversationListItem from './ConversationListItem';
import { ActivityTimeline } from './inboxBadges';
import { fmtDate, getConvType } from './inboxShared';

// UAT defect 2: the API sends UTC. A zone-less value ("2026-10-26T17:54:09.654321", what the API sent before
// the fix) and a "...Z" value (after) are the same instant: 1:54 PM in New York, 10:54 AM in Los Angeles
// (US daylight time ends on 1 November 2026).
const NAIVE = '2026-10-26T17:54:09.654321';
const ZONED = '2026-10-26T17:54:09.654321Z';
const ZONES = [
    ['America/New_York', '1:54 PM', 'EDT'],
    ['America/Los_Angeles', '10:54 AM', 'PDT'],
];

const originalTZ = process.env.TZ;
beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-26T20:00:00Z')); // same afternoon in both zones
});
afterEach(() => {
    vi.useRealTimers();
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
});

const bubbleInbox = { activeConversation: { prospect_name: 'Vincent D', prospect_email: 'v@x.com' }, createLead: vi.fn(), leadBusy: null };
const conv = (extra = {}) => ({
    id: 'c1', prospect_name: 'Vincent D', prospect_email: 'v@x.com', subject: 'Vincent, AccessOS demo',
    last_message_at: NAIVE, is_unread: true, last_message_direction: 'INBOUND', ...extra,
});

describe.each(ZONES)('in %s', (zone, clock, abbr) => {
    beforeEach(() => { process.env.TZ = zone; });

    it.each([NAIVE, ZONED])('MessageBubble shows %s in the viewer\'s zone', (value) => {
        render(<MessageBubble m={{ direction: 'OUTBOUND', display_time: value, cleaned_body: 'Hi', activity: [] }} inbox={bubbleInbox} />);
        expect(screen.getByText(new RegExp(`${clock} ${abbr}`))).toBeInTheDocument();
    });

    it.each([NAIVE, ZONED])('the activity timeline shows %s in the viewer\'s zone', (value) => {
        const { container } = render(<ActivityTimeline activity={[{ type: 'SENT', at: value }, { type: 'BOUNCED', at: value }]} />);
        expect(container.textContent).toContain(`Oct 26, ${clock} ${abbr}`);
        expect(container.textContent).not.toMatch(/0?5:54 PM/);
    });

    it.each([NAIVE, ZONED])('the conversation list shows %s in the viewer\'s zone', (value) => {
        expect(fmtDate(value)).toBe(`${clock} ${abbr}`);
        render(<ConversationListItem c={conv({ last_message_at: value })} inbox={{ selectedId: null, setSelectedId: vi.fn() }} />);
        expect(screen.getByText(`${clock} ${abbr}`)).toBeInTheDocument();
    });
});

describe('conversation list dates', () => {
    it('uses calendar days in the viewer\'s zone for Yesterday and weekdays', () => {
        process.env.TZ = 'America/Los_Angeles';
        // 01:00 PDT on 26 Oct is "today"; 23:30 PDT on 25 Oct is yesterday although under 24 hours ago
        expect(fmtDate('2026-10-26T08:00:00Z')).toBe('1:00 AM PDT');
        expect(fmtDate('2026-10-26T06:30:00Z')).toBe('Yesterday');
        expect(fmtDate('2026-10-22T18:00:00Z')).toBe('Thu');
        expect(fmtDate('2026-09-01T18:00:00Z')).toBe('Sep 1');
        expect(fmtDate(null)).toBe('');
    });
});

describe('the bounce notice is not a reply', () => {
    it('labels a conversation whose newest message is a system notice as Bounced', () => {
        process.env.TZ = 'UTC';
        expect(getConvType(conv({ last_message_is_system: true }))).toBe('bounce');
        expect(getConvType(conv())).toBe('reply');
        render(<ConversationListItem c={conv({ last_message_is_system: true })} inbox={{ selectedId: null, setSelectedId: vi.fn() }} />);
        expect(screen.getByText('Bounced')).toBeInTheDocument();
        expect(screen.queryByText('Reply')).not.toBeInTheDocument();
    });

    it('shows the note as a delivery failure, without Create lead', () => {
        process.env.TZ = 'UTC';
        render(<MessageBubble m={{ direction: 'INBOUND', is_system: true, subject: 'Re: hello', message_id: 'n1',
            display_time: ZONED, cleaned_body: 'Email delivery failed (Permanent).' }} inbox={bubbleInbox} />);
        expect(screen.getByText('Delivery Failed')).toBeInTheDocument();
        expect(screen.queryByText(/Create lead/)).not.toBeInTheDocument();
    });
});
