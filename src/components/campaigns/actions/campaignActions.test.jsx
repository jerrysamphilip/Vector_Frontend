import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api/campaigns', () => ({
    campaignApi: { rename: vi.fn(), duplicate: vi.fn(), get: vi.fn(), getProspectLists: vi.fn().mockResolvedValue([]) },
}));

import { campaignApi } from '../../../api/campaigns';
import CampaignActionsMenu from './CampaignActionsMenu';
import RenameCampaignModal from './RenameCampaignModal';
import { menuItems } from './menuItems';
import { duplicateFormError, duplicatePayload, initialDuplicateForm } from './duplicatePayload';

const wrap = (ui) => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe('campaign actions menu', () => {
    it('offers actions by status and role', () => {
        const actions = (status, role) => menuItems({ status }, { role }).map(i => i.action);
        expect(actions('DRAFT', 'ADMIN')).toEqual(['edit', 'rename', 'duplicate', 'launch', 'delete']);
        expect(actions('ACTIVE', 'MANAGER')).toEqual(['edit', 'rename', 'duplicate', 'pause']);
        expect(actions('PAUSED', 'SUPER_ADMIN')).toEqual(['edit', 'rename', 'duplicate', 'resume', 'delete']);
        expect(actions('ACTIVE', 'AGENT')).toEqual(['rename', 'duplicate']);
        expect(menuItems({ status: 'COMPLETED' }, { role: 'ADMIN', showView: true }).map(i => i.action))
            .toEqual(['rename', 'duplicate', 'view', 'delete']);
    });

    it('opens, calls onAction and closes on Escape', async () => {
        const onAction = vi.fn();
        const campaign = { campaign_id: 'c1', campaign_name: 'Q4', status: 'DRAFT' };
        render(<CampaignActionsMenu campaign={campaign} onAction={onAction} role="ADMIN" />);
        const button = screen.getByRole('button', { name: 'More actions for Q4' });
        await userEvent.click(button);
        expect(screen.getByRole('menu')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }));
        expect(onAction).toHaveBeenCalledWith('duplicate', campaign, expect.anything());
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        await userEvent.click(button);
        await userEvent.keyboard('{Escape}');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
});

describe('rename modal', () => {
    beforeEach(() => vi.clearAllMocks());

    it('sends the new name with the row_version on screen', async () => {
        campaignApi.rename.mockResolvedValue({ campaign_id: 'c1', campaign_name: 'New', row_version: 4 });
        const onClose = vi.fn();
        const onRenamed = vi.fn();
        wrap(<RenameCampaignModal campaign={{ campaign_id: 'c1', campaign_name: 'Old', row_version: 3 }} onClose={onClose} onRenamed={onRenamed} />);
        const input = screen.getByRole('textbox', { name: 'Name' });
        await userEvent.clear(input);
        await userEvent.type(input, '  New ');
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(campaignApi.rename).toHaveBeenCalledWith('c1', 'New', 3);
        expect(onRenamed).toHaveBeenCalled();
    });

    it('refuses an empty name', async () => {
        wrap(<RenameCampaignModal campaign={{ campaign_id: 'c1', campaign_name: 'Old', row_version: 1 }} onClose={vi.fn()} />);
        await userEvent.clear(screen.getByRole('textbox', { name: 'Name' }));
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(screen.getByRole('alert')).toHaveTextContent('Enter a name');
        expect(campaignApi.rename).not.toHaveBeenCalled();
    });
});

describe('duplicate payload', () => {
    const campaign = {
        campaign_name: 'Spring', campaign_timezone: 'UTC', send_window_start: '09:00:00', send_window_end: '17:00:00',
        sending_inboxes: [{ inbox_id: 'i1' }, { inbox_id: 'i2' }],
    };

    it('leaves unchanged fields out', () => {
        const form = initialDuplicateForm(campaign);
        expect(form.campaign_name).toBe('Copy of Spring');
        expect(duplicatePayload(form, campaign)).toEqual({
            skip_source_prospects: true, campaign_name: 'Copy of Spring', send_window_start: '09:00', send_window_end: '17:00',
        });
    });

    it('sends overrides, changed inboxes and the list to enrol', () => {
        const form = { ...initialDuplicateForm(campaign), campaign_timezone: 'Europe/London', inbox_ids: ['i2'],
            list_id: 'l1', start_date: '2030-01-02', skip_source_prospects: false };
        expect(duplicatePayload(form, campaign)).toMatchObject({
            campaign_timezone: 'Europe/London', inbox_ids: ['i2'], list_ids: ['l1'], start_date: '2030-01-02',
            skip_source_prospects: false,
        });
        expect(duplicatePayload({ ...form, inbox_ids: ['i2', 'i1'] }, campaign).inbox_ids).toBeUndefined();
    });

    it('validates like the API', () => {
        const form = initialDuplicateForm(campaign);
        expect(duplicateFormError(form, '2030-01-01')).toBeNull();
        expect(duplicateFormError({ ...form, campaign_name: ' ' }, '2030-01-01')).toMatch(/name/);
        expect(duplicateFormError({ ...form, start_date: '2029-12-31' }, '2030-01-01')).toMatch(/past/);
        expect(duplicateFormError({ ...form, send_window_end: '08:00' }, '2030-01-01')).toMatch(/window/);
    });
});
