import { useMutation } from '@tanstack/react-query';
import { campaignApi, sequenceApi } from '../../../api/campaigns';
import { campaignWizardApi } from '../../../api/campaignWizard';
import { campaignDraftsApi } from '../../../api/campaignDrafts';
import { versionOf } from '../../../lib/staleVersion';
import { OUR_COMPANY } from './emailPreview';
import { errorMessage } from '../../../lib/apiErrors';
import { serverFieldErrors } from '../../../lib/fieldValidation';

/** Keep the draft campaign's latest row_version (T-3) from a create / get / update / launch response. */
export function trackVersion(versionRef, record) {
    const v = versionOf(record);
    if (versionRef && v !== null) versionRef.current = v;
}

// Server actions of the create-campaign wizard, one per step:
//   1 create campaign, 2 save sequence, 3 process list + generate persona templates
//   (and on demand for an undetected persona), 5 enroll the selected lists and launch.
// The launch sends the draft's row_version (ctx.campaignVersionRef) as expected_version (T-3).

/**
 * @param {object} ctx  wizard state (campaignId, formData, selectedLists, sequenceSteps, creativeEmail,
 *                      excludedProspectIds) and setters (setCampaignId, setCurrentStep, setErrors,
 *                      setProcessingResult, setSelectedPersona, setPreviewProspect, setIsGeneratingTemplates,
 *                      setGenerationStatus, setEnrollReport), plus queryClient and navigate
 */
export function useWizardMutations(ctx) {
    const {
        campaignId, formData, selectedLists, sequenceSteps, creativeEmail, excludedProspectIds,
        setCampaignId, setCurrentStep, setErrors, setProcessingResult, setSelectedPersona, setPreviewProspect,
        setIsGeneratingTemplates, setGenerationStatus, setEnrollReport, queryClient, navigate, campaignVersionRef,
    } = ctx;
    const exclusions = () => (excludedProspectIds.length > 0 ? excludedProspectIds : null);

    // Step 1: Create Campaign
    const createMutation = useMutation({
        mutationFn: (data) => campaignApi.create(data),
        onSuccess: (result) => {
            setCampaignId(result.campaign_id);
            trackVersion(campaignVersionRef, result);
            setCurrentStep(2);
            queryClient.invalidateQueries({ queryKey: ['campaigns'], });
        },
        // a 422 puts its field errors next to the fields (sender details) as well as the summary line
        onError: (error) => setErrors({ ...serverFieldErrors(error), submit: errorMessage(error, 'Failed to create campaign') })
    });

    // Step 2: Sequence
    const sequenceMutation = useMutation({
        mutationFn: async (id) => {
            // Delete any existing sequences first (editing a draft that already has them)
            try {
                const existing = await sequenceApi.list(id);
                if (existing?.steps?.length > 0) {
                    for (const s of existing.steps) {
                        await sequenceApi.delete(s.sequence_id);
                    }
                }
            } catch (e) {
                console.warn('[Sequence] Could not fetch/delete existing sequences:', e);
            }
            // Add the new sequence steps
            for (const step of sequenceSteps) {
                await sequenceApi.add(id, { step_number: step.step_number, wait_days: step.wait_days });
            }
            return true;
        },
        onSuccess: () => setCurrentStep(3),
        onError: () => setErrors({ sequence: 'Failed to save sequence' })
    });

    // Step 3: Process Prospects & Generate Templates
    const processMutation = useMutation({
        mutationFn: async () => {
            setIsGeneratingTemplates(true);
            setGenerationStatus('Analyzing prospects and generating templates...');
            const listId = selectedLists[0];
            return await campaignWizardApi.processList(
                campaignId,
                listId,
                formData.campaign_name,
                OUR_COMPANY,
                formData.campaign_description,
                sequenceSteps, // Pass user-configured sequence timing
                formData.include_first_name_in_subject, // Pass first name in subject preference
                creativeEmail, // Optional creative writing mode
                exclusions(),
            );
        },
        onSuccess: (result) => {
            setIsGeneratingTemplates(false);
            setGenerationStatus('');
            setProcessingResult(result);
            // Auto-select first persona
            if (result.templates_generated?.[0]) {
                const first = result.templates_generated[0];
                setSelectedPersona(first.persona_type);
                setPreviewProspect(result.sample_prospects?.[first.persona_type]?.[0] || null);
            }
            setCurrentStep(4);
        },
        onError: (err) => {
            setIsGeneratingTemplates(false);
            setGenerationStatus('');
            setErrors({ process: err.response?.data?.detail || 'AI processing failed' });
        }
    });

    // On-demand: generate a template for a persona with no prospects detected yet
    // (selected from the "always show all personas" picker).
    const generatePersonaMutation = useMutation({
        mutationFn: async (personaType) => {
            const listId = selectedLists[0];
            return await campaignWizardApi.generatePersonaTemplate(
                campaignId,
                personaType,
                listId,
                formData.campaign_name,
                OUR_COMPANY,
                formData.campaign_description,
                sequenceSteps,
                formData.include_first_name_in_subject,
                creativeEmail,
                exclusions(),
            );
        },
        onSuccess: (result) => {
            setProcessingResult(prev => {
                const updated = { ...prev };
                const existingIdx = updated.templates_generated?.findIndex(
                    t => t.persona_type === result.persona_type
                );
                const templates = updated.templates_generated ? [...updated.templates_generated] : [];
                if (existingIdx >= 0) {
                    templates[existingIdx] = result;
                } else {
                    templates.push(result);
                }
                updated.templates_generated = templates;
                return updated;
            });
            setSelectedPersona(result.persona_type);
        },
        onError: (err) => {
            setErrors({ process: err.response?.data?.detail || 'Failed to generate template for this persona' });
        }
    });

    // Step 5: Launch — enroll every selected list, then launch only if anyone was enrolled
    const launchMutation = useMutation({
        mutationFn: async () => {
            if (!selectedLists.length) {
                throw new Error('No prospect list selected. Please go back to Step 3 and select a list.');
            }
            let enrolled = 0;
            const rejected = [];
            const seen = new Set();
            for (const [index, listId] of selectedLists.entries()) {
                const result = await campaignWizardApi.enrollProspects(
                    campaignId,
                    listId,
                    null, // Enroll all personas detected
                    true, // Exclude personal emails default
                    0,    // No cool-off filter — user explicitly chose to enroll
                    formData.daily_batch_size || null,
                    exclusions(),
                );
                enrolled += result.enrolled_count || 0;
                for (const r of result.rejected || []) {
                    // A contact on several selected lists is enrolled once; don't report the repeats
                    if (index > 0 && r.reason_code === 'already_enrolled') continue;
                    if (seen.has(r.prospect_id)) continue;
                    seen.add(r.prospect_id);
                    rejected.push(r);
                }
            }
            if (enrolled === 0) {
                const error = new Error('No contacts could be enrolled, so the campaign was not launched.');
                error.report = { enrolled, rejected, launched: false };
                throw error;
            }
            // Launch with the version the wizard last saw: an edit made elsewhere meanwhile gets a 409 (T-3)
            const launched = await campaignApi.launch(campaignId, campaignVersionRef?.current);
            trackVersion(campaignVersionRef, launched);
            return { enrolled, rejected, launched: true };
        },
        onSuccess: async (report) => {
            // Clear draft after successful launch
            try {
                await campaignDraftsApi.clearAllDrafts();
            } catch (err) {
                console.error('[DRAFT] Failed to clear after launch:', err);
            }
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            if (report.rejected.length) {
                setEnrollReport(report); // navigate when the user closes it
            } else {
                navigate('/app/campaigns');
            }
        },
        onError: (err) => {
            if (err.report) setEnrollReport(err.report);
            setErrors({ launch: err.report ? err.message : 'Failed to launch campaign: ' + (err.response?.data?.detail || err.message) });
        }
    });

    return { createMutation, sequenceMutation, processMutation, generatePersonaMutation, launchMutation };
}
