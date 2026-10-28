import { useEffect, useRef, useState } from 'react';
import { campaignApi, sequenceApi } from '../../../api/campaigns';
import { campaignDraftsApi } from '../../../api/campaignDrafts';
import { INITIAL_FORM_DATA } from './constants';
import { trackVersion } from './useWizardMutations';
import { useApiQuery } from '../../../lib/useApiQuery';

// Draft persistence of the create-campaign wizard:
//   - edit mode (?edit=<id>): restore the per-campaign localStorage cache instantly, then the campaign
//     (form fields) and its sequence from the API
//   - ?fresh=true: clear the server-side draft and start clean
//   - otherwise: restore the single server-side draft (discarded when its campaign was deleted)
//   - auto-save 2 s after the last change, to the server draft and (with a campaign id) the local cache

const DRAFT_CACHE_KEY = 'campaign_draft_cache';

export function getCachedDraft(cId) {
    try {
        const cache = JSON.parse(localStorage.getItem(DRAFT_CACHE_KEY) || '{}');
        return cache[cId] || null;
    } catch { return null; }
}

export function setCachedDraft(cId, step, state) {
    try {
        const cache = JSON.parse(localStorage.getItem(DRAFT_CACHE_KEY) || '{}');
        cache[cId] = {
            step,
            selectedLists: state?.selectedLists,
            sequenceSteps: state?.sequenceSteps,
            selectedProfileId: state?.selectedProfileId,
            uploadMode: state?.uploadMode,
            selectedPersona: state?.selectedPersona,
            customInstruction: state?.customInstruction,
            creativeEmail: state?.creativeEmail,
            processingResult: state?.processingResult || null,
            ts: Date.now()
        };
        localStorage.setItem(DRAFT_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.warn('[DRAFT] localStorage cache write failed:', e);
    }
}

/** The step to reopen from the local cache: step >= 4 needs generated templates, else step 3. */
export function cachedStep(cached) {
    const step = cached?.step || 1;
    const hasValidTemplates = cached?.processingResult?.templates_generated?.length > 0;
    return step >= 4 && !hasValidTemplates ? 3 : step;
}

/**
 * The server side of a wizard draft (reads only):
 *   edit mode: { campaign, sequences } (sequences only when the campaign has any; a failed sequence read is ignored)
 *   otherwise: { draft } (draft null when there is none), with { campaign } when the draft names one that still
 *   exists, or { stale: true } when that campaign was deleted.
 */
export async function fetchDraftSnapshot({ editCampaignId }) {
    if (editCampaignId) {
        const campaign = await campaignApi.get(editCampaignId);
        let sequences = null;
        if (campaign.sequence_count > 0) {
            try {
                sequences = await sequenceApi.list(editCampaignId);
            } catch (e) {
                console.warn('[DRAFT] Could not fetch sequences:', e);
            }
        }
        return { campaign, sequences };
    }
    const draft = await campaignDraftsApi.getCurrentDraft();
    const campaignRef = draft?.draft_data?.campaignId;
    if (!campaignRef) return { draft: draft || null };
    try {
        return { draft, campaign: await campaignApi.get(campaignRef) };
    } catch {
        return { draft, stale: true };
    }
}

/**
 * @param {object} opts
 * @param {string|null} opts.editCampaignId
 * @param {boolean} opts.isFreshStart
 * @param {object} opts.state    the saved wizard state (campaignId, currentStep, formData, selectedLists, ...)
 * @param {object} opts.setters  the matching state setters (setCampaignId, setCurrentStep, setFormData, ...)
 * @returns {{ draftLoaded: boolean, lastSaved: Date|null, isSavingDraft: boolean, snapError: Error|null }}
 */
export function useCampaignDraft({ editCampaignId, isFreshStart, campaignVersionRef, state, setters }) {
    const [draftLoaded, setDraftLoaded] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const initialLoadRef = useRef(true);

    const {
        campaignId, currentStep, formData, selectedLists, sequenceSteps, selectedProfileId,
        uploadMode, processingResult, selectedPersona, customInstruction, creativeEmail,
    } = state;
    const {
        setCampaignId, setCurrentStep, setFormData, setSelectedLists, setSequenceSteps, setSelectedProfileId,
        setUploadMode, setProcessingResult, setSelectedPersona, setCustomInstruction, setCreativeEmail,
    } = setters;

    // Collect all wizard state into a single object for saving
    const getDraftState = () => ({
        campaignId,
        formData,
        selectedLists,
        sequenceSteps,
        selectedProfileId,
        uploadMode,
        processingResult,
        selectedPersona,
        customInstruction,
        creativeEmail,
    });

    // The server side of the draft (W-9: read through useApiQuery, applied once below). A fresh start reads nothing.
    const loadsSnapshot = Boolean(editCampaignId) || !isFreshStart;
    const snapshot = useApiQuery(['campaign-wizard-draft', editCampaignId || 'current'],
        () => fetchDraftSnapshot({ editCampaignId }),
        { enabled: loadsSnapshot, retry: false, staleTime: 0, gcTime: 0 });
    const appliedRef = useRef(false);

    const finishLoading = () => {
        setDraftLoaded(true);
        setTimeout(() => { initialLoadRef.current = false; }, 1500);
    };

    // On mount: edit mode restores the per-campaign localStorage cache at once (no step 1 flash);
    // ?fresh=true clears the server-side draft and starts clean.
    useEffect(() => {
        if (editCampaignId) {
            console.log('[DRAFT] Edit mode — loading campaign', editCampaignId);
            const cached = getCachedDraft(editCampaignId);
            if (cached) {
                const hasValidTemplates = cached.processingResult?.templates_generated?.length > 0;
                if (cached.selectedLists) setSelectedLists(cached.selectedLists);
                if (cached.selectedProfileId) setSelectedProfileId(cached.selectedProfileId);
                if (cached.uploadMode) setUploadMode(cached.uploadMode);
                if (cached.selectedPersona) setSelectedPersona(cached.selectedPersona);
                if (cached.customInstruction) setCustomInstruction(cached.customInstruction);
                if (typeof cached.creativeEmail === 'boolean') setCreativeEmail(cached.creativeEmail);
                if (hasValidTemplates) setProcessingResult(cached.processingResult);
                setCurrentStep(cachedStep(cached));
                console.log('[DRAFT] Restored cached step', cachedStep(cached), 'from localStorage');
            }
            return;
        }
        if (isFreshStart) {
            console.log('[DRAFT] Fresh start requested — clearing old drafts');
            campaignDraftsApi.clearAllDrafts()
                .catch(e => console.warn('[DRAFT] Failed to clear old drafts:', e))
                .finally(finishLoading);
        }
        // Runs once on mount: the URL parameters and setters are fixed for the page's lifetime
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Apply the server snapshot once, when it has arrived (or failed)
    const { data: snap, error: snapError } = snapshot;
    useEffect(() => {
        if (!loadsSnapshot || appliedRef.current || (!snap && !snapError)) return;
        appliedRef.current = true;
        try {
            if (editCampaignId) applyEditSnapshot(snap, snapError);
            else if (snap) applyDraftSnapshot(snap);
            else console.error('[DRAFT] Failed to load draft:', snapError);
        } finally {
            finishLoading();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [snap, snapError]);

    function applyEditSnapshot(data, error) {
        const cached = getCachedDraft(editCampaignId);
        let detectedStep = cachedStep(cached);
        if (error || !data) {
            console.error('[DRAFT] Failed to load campaign for editing:', error);
            setCurrentStep(detectedStep); // still use the cached step if the API failed
            return;
        }
        const { campaign, sequences } = data;
        setCampaignId(editCampaignId);
        trackVersion(campaignVersionRef, campaign);
        setFormData(prev => ({
            ...prev,
            campaign_name: campaign.campaign_name || '',
            campaign_description: campaign.campaign_description || '',
            sender_name: campaign.sender_name || '',
            sender_title: campaign.sender_title || '',
            cta_link: campaign.cta_link || '',
            inbox_ids: campaign.inbox_ids || prev.inbox_ids,
            send_window_start: campaign.send_window_start || prev.send_window_start,
            send_window_end: campaign.send_window_end || prev.send_window_end,
            campaign_timezone: campaign.campaign_timezone || prev.campaign_timezone,
            sending_mode: campaign.sending_mode || prev.sending_mode,
            min_gap_minutes: campaign.min_gap_minutes ?? prev.min_gap_minutes,
            batch_size: campaign.batch_size ?? prev.batch_size,
            batch_gap_minutes: campaign.batch_gap_minutes ?? prev.batch_gap_minutes,
            unsubscribe_mode: campaign.unsubscribe_mode || prev.unsubscribe_mode,
        }));
        // The campaign's sequence (the user was past step 2), else the cached one
        if (sequences?.length > 0) {
            setSequenceSteps(sequences.map(s => ({
                step_number: s.step_number,
                wait_days: s.wait_days,
                type: s.step_number === 1 ? 'Initial Email' : `Follow-up ${s.step_number - 1}`
            })));
            detectedStep = Math.max(detectedStep, 2);
        }
        if (cached?.sequenceSteps && !(campaign.sequence_count > 0)) {
            setSequenceSteps(cached.sequenceSteps);
        }
        setCurrentStep(detectedStep);
        console.log('[DRAFT] Campaign loaded:', campaign.campaign_name, '→ step', detectedStep);
    }

    function applyDraftSnapshot({ draft, campaign, stale }) {
        if (stale) {
            // Campaign was deleted — discard stale draft and start fresh
            console.warn('[DRAFT] Campaign', draft.draft_data.campaignId, 'no longer exists — starting fresh');
            campaignDraftsApi.clearAllDrafts().catch(() => { /* ignore */ });
            return;
        }
        if (!draft?.draft_data) return;
        const data = draft.draft_data;
        if (data.campaignId) {
            setCampaignId(data.campaignId);
            trackVersion(campaignVersionRef, campaign);
        }
        if (data.formData) setFormData({ ...INITIAL_FORM_DATA, ...data.formData });
        if (data.selectedLists) setSelectedLists(data.selectedLists);
        if (data.sequenceSteps) setSequenceSteps(data.sequenceSteps);
        if (data.selectedProfileId) setSelectedProfileId(data.selectedProfileId);
        if (data.uploadMode) setUploadMode(data.uploadMode);
        if (data.processingResult) setProcessingResult(data.processingResult);
        if (data.selectedPersona) setSelectedPersona(data.selectedPersona);
        if (data.customInstruction) setCustomInstruction(data.customInstruction);
        if (typeof data.creativeEmail === 'boolean') setCreativeEmail(data.creativeEmail);
        setCurrentStep(draft.current_step);
        console.log('[DRAFT] Restored draft from', draft.updated_at);
    }

    // Debounced auto-save effect (2 seconds after last change)
    useEffect(() => {
        if (!draftLoaded) return;
        if (initialLoadRef.current) return;

        const timeoutId = setTimeout(async () => {
            try {
                setIsSavingDraft(true);
                const draftName = formData.campaign_name || 'Untitled Campaign';
                const draftState = getDraftState();

                // Save to localStorage per-campaign (instant, per-campaign)
                if (campaignId) {
                    setCachedDraft(campaignId, currentStep, draftState);
                }

                // Also save to backend (single-draft, for new campaign recovery)
                await campaignDraftsApi.saveDraft(draftName, currentStep, draftState);
                setLastSaved(new Date());
                console.log('[DRAFT] Auto-saved at', new Date().toLocaleTimeString());
            } catch (error) {
                console.error('[DRAFT] Auto-save failed:', error);
            } finally {
                setIsSavingDraft(false);
            }
        }, 2000);

        return () => clearTimeout(timeoutId);
        // Same trigger set as before the split: campaignId changes are saved with the next edit
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData, selectedLists, sequenceSteps, currentStep, selectedProfileId, uploadMode, processingResult, selectedPersona, customInstruction, creativeEmail, draftLoaded]);

    // snapError: the failed draft / campaign read (null when it loaded or nothing was read), for the page to show
    return { draftLoaded, lastSaved, isSavingDraft, snapError: snapError || null };
}
