import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api/campaigns', () => ({
    campaignApi: { create: vi.fn(), launch: vi.fn() },
    sequenceApi: {},
}));
vi.mock('../../../api/campaignWizard', () => ({
    campaignWizardApi: { enrollProspects: vi.fn() },
}));
vi.mock('../../../api/campaignDrafts', () => ({
    campaignDraftsApi: { clearAllDrafts: vi.fn().mockResolvedValue({}) },
}));

import { campaignApi } from '../../../api/campaigns';
import { campaignWizardApi } from '../../../api/campaignWizard';
import ListProspectRow from './ListProspectRow';
import { trackVersion, useWizardMutations } from './useWizardMutations';

function setup(versionRef) {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const ctx = {
        campaignId: 'c1', formData: { daily_batch_size: null }, selectedLists: ['l1'], sequenceSteps: [],
        creativeEmail: false, excludedProspectIds: [], setCampaignId: vi.fn(), setCurrentStep: vi.fn(),
        setErrors: vi.fn(), setProcessingResult: vi.fn(), setSelectedPersona: vi.fn(), setPreviewProspect: vi.fn(),
        setIsGeneratingTemplates: vi.fn(), setGenerationStatus: vi.fn(), setEnrollReport: vi.fn(),
        queryClient, navigate: vi.fn(), campaignVersionRef: versionRef,
    };
    const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return { ctx, ...renderHook(() => useWizardMutations(ctx), { wrapper }) };
}

describe('create-campaign wizard optimistic concurrency (T-3)', () => {
    beforeEach(() => vi.clearAllMocks());

    it('trackVersion keeps the latest row_version and ignores responses without one', () => {
        const ref = { current: null };
        trackVersion(ref, { row_version: 3 });
        trackVersion(ref, { campaign_id: 'x' });
        expect(ref.current).toBe(3);
    });

    it('remembers the version of the created draft', async () => {
        campaignApi.create.mockResolvedValue({ campaign_id: 'c1', row_version: 1 });
        const ref = { current: null };
        const { result } = setup(ref);
        await act(() => result.current.createMutation.mutateAsync({ campaign_name: 'X' }));
        expect(ref.current).toBe(1);
    });

    it('launches with the version the wizard last saw and keeps the new one', async () => {
        campaignWizardApi.enrollProspects.mockResolvedValue({ enrolled_count: 2, rejected: [] });
        campaignApi.launch.mockResolvedValue({ campaign_id: 'c1', new_status: 'ACTIVE', row_version: 5 });
        const ref = { current: 4 };
        const { result } = setup(ref);
        await act(() => result.current.launchMutation.mutateAsync());
        expect(campaignApi.launch).toHaveBeenCalledWith('c1', 4);
        await waitFor(() => expect(ref.current).toBe(5));
    });

    it('starts a prospect edit with the row_version it was loaded with', async () => {
        const wizard = {
            editProspectValues: {}, editingProspectId: null, excludedProspectIds: [], setDeleteConfirmProspectId: vi.fn(),
            setEditProspectValues: vi.fn(), setEditingProspectId: vi.fn(), setExcludedProspectIds: vi.fn(),
            updateProspectMutation: { mutate: vi.fn(), isPending: false }, validationMap: {},
        };
        const prospect = { prospect_id: 'p1', first_name: 'Pat', email: 'pat@example.com', row_version: 7 };
        render(<table><tbody><ListProspectRow prospect={prospect} wizard={wizard} /></tbody></table>);
        await userEvent.click(screen.getByTitle('Edit'));
        expect(wizard.setEditProspectValues).toHaveBeenCalledWith(
            expect.objectContaining({ first_name: 'Pat', expected_version: 7 }));
    });
});
