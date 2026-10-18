import { useEffect, useRef, useState } from 'react';
import { campaignApi, sequenceApi } from '../../../api/campaigns';
import { campaignDraftsApi } from '../../../api/campaignDrafts';
import { INITIAL_FORM_DATA } from './constants';
import { trackVersion } from './useWizardMutations';

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

/**
 * @param {object} opts
 * @param {string|null} opts.editCampaignId
 * @param {boolean} opts.isFreshStart
 * @param {object} opts.state    the saved wizard state (campaignId, currentStep, formData, selectedLists, ...)
 * @param {object} opts.setters  the matching state setters (setCampaignId, setCurrentStep, setFormData, ...)
 * @returns {{ draftLoaded: boolean, lastSaved: Date|null, isSavingDraft: boolean }}
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

    // Load existing draft on mount (skip if fresh start)
    useEffect(() => {
        const loadDraft = async () => {
            try {
                // ── EDIT MODE: Load existing campaign by ID ──
                if (editCampaignId) {
                    console.log('[DRAFT] Edit mode — loading campaign', editCampaignId);

                    // 1. Instantly check localStorage for cached step (no network wait)
                    const cached = getCachedDraft(editCampaignId);
                    let detectedStep = cached?.step || 1;

                    // Validate cached processingResult before using it
                    const hasValidTemplates = cached?.processingResult?.templates_generated?.length > 0;

                    // If step >= 4 but no valid processingResult, fall back to step 3
                    if (detectedStep >= 4 && !hasValidTemplates) {
                        detectedStep = 3;
                    }

                    // Restore cached state immediately (makes UI feel instant)
                    if (cached) {
                        if (cached.selectedLists) setSelectedLists(cached.selectedLists);
                        if (cached.selectedProfileId) setSelectedProfileId(cached.selectedProfileId);
                        if (cached.uploadMode) setUploadMode(cached.uploadMode);
                        if (cached.selectedPersona) setSelectedPersona(cached.selectedPersona);
                        if (cached.customInstruction) setCustomInstruction(cached.customInstruction);
                        if (typeof cached.creativeEmail === 'boolean') setCreativeEmail(cached.creativeEmail);
                        if (hasValidTemplates) setProcessingResult(cached.processingResult);
                        // Set step immediately so user doesn't see step 1 flash
                        setCurrentStep(detectedStep);
                        console.log('[DRAFT] Restored cached step', detectedStep, 'from localStorage');
                    }

                    try {
                        // 2. Fetch campaign data from API (for form fields)
                        const campaign = await campaignApi.get(editCampaignId);
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

                        // 3. If campaign has sequences, fetch them (user was past step 2)
                        if (campaign.sequence_count > 0) {
                            try {
                                const sequences = await sequenceApi.list(editCampaignId);
                                if (sequences?.length > 0) {
                                    setSequenceSteps(sequences.map(s => ({
                                        step_number: s.step_number,
                                        wait_days: s.wait_days,
                                        type: s.step_number === 1 ? 'Initial Email' : `Follow-up ${s.step_number - 1}`
                                    })));
                                    detectedStep = Math.max(detectedStep, 2);
                                }
                            } catch (e) {
                                console.warn('[DRAFT] Could not fetch sequences:', e);
                            }
                        }

                        // Also restore cached sequenceSteps if no sequences from API
                        if (cached?.sequenceSteps && !(campaign.sequence_count > 0)) {
                            setSequenceSteps(cached.sequenceSteps);
                        }

                        setCurrentStep(detectedStep);
                        console.log('[DRAFT] Campaign loaded:', campaign.campaign_name, '→ step', detectedStep);
                    } catch (err) {
                        console.error('[DRAFT] Failed to load campaign for editing:', err);
                        // Still use cached step if API failed
                        setCurrentStep(detectedStep);
                    }
                    return;
                }

                // If fresh start, clear any existing drafts and start clean
                if (isFreshStart) {
                    console.log('[DRAFT] Fresh start requested — clearing old drafts');
                    try {
                        await campaignDraftsApi.clearAllDrafts();
                    } catch (e) {
                        console.warn('[DRAFT] Failed to clear old drafts:', e);
                    }
                    return; // Skip loading — use initial state
                }

                const draft = await campaignDraftsApi.getCurrentDraft();
                if (draft && draft.draft_data) {
                    const data = draft.draft_data;

                    // If the draft references a campaignId, verify the campaign still exists
                    if (data.campaignId) {
                        try {
                            const campaign = await campaignApi.get(data.campaignId);
                            setCampaignId(data.campaignId);
                            trackVersion(campaignVersionRef, campaign);
                        } catch {
                            // Campaign was deleted — discard stale draft and start fresh
                            console.warn('[DRAFT] Campaign', data.campaignId, 'no longer exists — starting fresh');
                            try { await campaignDraftsApi.clearAllDrafts(); } catch { /* ignore */ }
                            return;
                        }
                    }

                    // Restore wizard state
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
            } catch (error) {
                console.error('[DRAFT] Failed to load draft:', error);
            } finally {
                setDraftLoaded(true);
                setTimeout(() => { initialLoadRef.current = false; }, 1500);
            }
        };
        loadDraft();
        // Runs once on mount: the URL parameters and setters are fixed for the page's lifetime
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    return { draftLoaded, lastSaved, isSavingDraft };
}
