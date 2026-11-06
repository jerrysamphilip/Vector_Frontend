import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../api/campaigns', () => ({ campaignApi: { getProspects: vi.fn(), getProspectLists: vi.fn() } }));
vi.mock('../../../api/prospects', () => ({ prospectsApi: {} }));
vi.mock('../../../api/reports', () => ({ reportsApi: {} }));

import { campaignApi } from '../../../api/campaigns';
import LeadListTab, { unsubscribedLater } from './LeadListTab';

const row = (id, status, consent_status) => ({ id, prospect_id: id, email: `${id}@x.test`, name: id, status, consent_status });

describe('LeadListTab consent state', () => {
    it('flags a contact who replied and then unsubscribed, and only that one', () => {
        expect(unsubscribedLater(row('a', 'REPLIED', 'UNSUBSCRIBED'))).toBe(true);
        expect(unsubscribedLater(row('b', 'COMPLETED', 'unsubscribed'))).toBe(true);
        expect(unsubscribedLater(row('c', 'UNSUBSCRIBED', 'UNSUBSCRIBED'))).toBe(false); // already says so
        expect(unsubscribedLater(row('d', 'REPLIED', 'OPT_IN'))).toBe(false);
        expect(unsubscribedLater(null)).toBe(false);
    });

    it('shows an Unsubscribed badge next to Replied', async () => {
        campaignApi.getProspects.mockResolvedValue([row('rae', 'REPLIED', 'UNSUBSCRIBED'), row('sam', 'REPLIED', 'OPT_IN')]);
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(<QueryClientProvider client={client}><LeadListTab campaignId="c-1" /></QueryClientProvider>);
        const badges = await screen.findAllByTestId('consent-unsubscribed');
        expect(badges.length).toBeGreaterThan(0);
        for (const badge of badges) {
            expect(badge.closest('tr')).toHaveTextContent('rae');
            expect(badge.parentElement).toHaveTextContent('REPLIED');
        }
    });
});
