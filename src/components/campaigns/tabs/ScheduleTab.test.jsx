import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../api/campaigns', () => ({ campaignApi: { getSchedule: vi.fn(), rescheduleDate: vi.fn() } }));

import { campaignApi } from '../../../api/campaigns';
import ScheduleTab, { scheduleState } from './ScheduleTab';

function renderTab() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}><ScheduleTab campaignId="c-1" /></QueryClientProvider>);
}

const tile = (label) => screen.getByText(label).closest('div.rounded-xl');

describe('ScheduleTab', () => {
    it('shows cancelled follow-ups as cancelled, not pending (all contacts replied)', async () => {
        campaignApi.getSchedule.mockResolvedValue({
            campaign_id: 'c-1', total_sent: 4, total_scheduled: 0, total_cancelled: 4, total_failed: 0,
            schedule: [
                { date: '2031-03-04', status: 'SENT', step_number: 1, prospect_count: 4, prospects: [] },
                { date: '2031-03-07', status: 'CANCELLED', step_number: 2, prospect_count: 4, prospects: [] },
            ],
        });
        renderTab();
        await screen.findByText('Pending / Queued');
        expect(within(tile('Pending / Queued')).getByText('0')).toBeInTheDocument();
        expect(within(tile('Cancelled')).getByText('4')).toBeInTheDocument();
        expect(screen.getByText('Cancelled (replied/unsubscribed/bounced)')).toBeInTheDocument();
        expect(screen.queryByText('⏳ Queued')).toBeNull();
        // Nothing is left to reschedule on a day with only sent or cancelled emails
        expect(screen.queryByTitle('Reschedule all queued emails on this day')).toBeNull();
    });

    it('maps every state to its label and treats an unknown one as queued', () => {
        expect(scheduleState('SENT').label).toBe('✓ Sent');
        expect(scheduleState('PAUSED_BY_CAMPAIGN').label).toBe('⏸ Paused');
        expect(scheduleState('FAILED').label).toBe('Failed');
        expect(scheduleState('SOMETHING').label).toBe('⏳ Queued');
    });
});
