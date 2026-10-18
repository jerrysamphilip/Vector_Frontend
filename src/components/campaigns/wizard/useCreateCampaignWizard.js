import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { campaignApi } from '../../../api/campaigns';
import { campaignWizardApi } from '../../../api/campaignWizard';
import { getCompanyProfiles } from '../../../api/companyProfiles';
import { INITIAL_FORM_DATA, INITIAL_SEQUENCE_STEPS, MAX_SEQUENCE_STEPS } from './constants';
import { useCampaignDraft } from './useCampaignDraft';
import { useListProspects } from './useListProspects';
import { useProspectUpload } from './useProspectUpload';
import { useTemplateEditor } from './useTemplateEditor';
import { trackVersion, useWizardMutations } from './useWizardMutations';
import { withVersion } from '../../../lib/staleVersion';

// All state and actions of the create/edit campaign wizard (pages/CreateCampaign.jsx), returned as one
// object the step components read from. Concerns live in their own hooks:
//   useCampaignDraft (draft restore + auto-save), useProspectUpload / useListProspects (step 3),
//   useTemplateEditor (step 4), useWizardMutations (server actions of every step).

/** Backend schedule preview (timezone-aware send dates) of the sequence steps. */
function useSchedulePreview(sequenceSteps) {
    const [schedulePreview, setSchedulePreview] = useState([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);

    // Fetch schedule preview from backend when sequence steps change
    useEffect(() => {
        const fetchSchedulePreview = async () => {
            if (sequenceSteps.length === 0) return;

            setScheduleLoading(true);
            try {
                const result = await campaignWizardApi.schedulePreview(sequenceSteps);
                setSchedulePreview(result.schedule || []);
            } catch (error) {
                console.error('Failed to fetch schedule preview:', error);
                // Fallback: keep existing preview or set empty
            } finally {
                setScheduleLoading(false);
            }
        };

        fetchSchedulePreview();
    }, [sequenceSteps]);

    return { schedulePreview, scheduleLoading };
}

export function useCreateCampaignWizard() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isFreshStart = searchParams.get('fresh') === 'true';
    const editCampaignId = searchParams.get('edit');
    const queryClient = useQueryClient();

    const [currentStep, setCurrentStep] = useState(1);
    const [campaignId, setCampaignId] = useState(null);
    // The draft campaign's row_version (T-3): set when it is created or loaded, sent as expected_version
    // on update and launch, and advanced from each response, so a change made elsewhere gets a 409.
    const campaignVersionRef = useRef(null);
    const [selectedLists, setSelectedLists] = useState([]);
    const [enrollReport, setEnrollReport] = useState(null); // {enrolled, rejected, launched}
    // Contacts deselected from the currently-selected existing list (exclusion set —
    // empty means "use the whole list", matching prior behavior).
    const [excludedProspectIds, setExcludedProspectIds] = useState([]);

    // Searchable List Selector State
    const [listSearchQuery, setListSearchQuery] = useState('');
    const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);

    // Template/Processing State
    const [processingResult, setProcessingResult] = useState(null);
    const [selectedPersona, setSelectedPersona] = useState(null);
    const [previewProspect, setPreviewProspect] = useState(null);
    const [customInstruction, setCustomInstruction] = useState(''); // User prompt feedback
    const [creativeEmail, setCreativeEmail] = useState(false); // Optional creative mode toggle

    // Simple loading state for AI generation
    const [isGeneratingTemplates, setIsGeneratingTemplates] = useState(false);
    const [generationStatus, setGenerationStatus] = useState('');

    // Sequence State
    const [sequenceSteps, setSequenceSteps] = useState(() => INITIAL_SEQUENCE_STEPS.map(s => ({ ...s })));
    const { schedulePreview, scheduleLoading } = useSchedulePreview(sequenceSteps);

    const [formData, setFormData] = useState(INITIAL_FORM_DATA);
    const dateInputRef = useRef(null);

    const [errors, setErrors] = useState({});
    const [selectedProfileId, setSelectedProfileId] = useState('');

    // 'select' (existing list) or 'upload' (new list), step 3
    const [uploadMode, setUploadMode] = useState('select');

    // AI context modal (step 1)
    const [isContextOpen, setIsContextOpen] = useState(false);
    const [tempContext, setTempContext] = useState("");
    const contextRef = useRef(null);
    useEffect(() => {
        if (isContextOpen) {
            setTimeout(() => {
                contextRef.current?.focus();
            }, 50);
        }
    }, [isContextOpen]);

    const draft = useCampaignDraft({
        editCampaignId,
        isFreshStart,
        campaignVersionRef,
        state: {
            campaignId, currentStep, formData, selectedLists, sequenceSteps, selectedProfileId,
            uploadMode, processingResult, selectedPersona, customInstruction, creativeEmail,
        },
        setters: {
            setCampaignId, setCurrentStep, setFormData, setSelectedLists, setSequenceSteps, setSelectedProfileId,
            setUploadMode, setProcessingResult, setSelectedPersona, setCustomInstruction, setCreativeEmail,
        },
    });

    const { data: companyProfiles } = useQuery({
        queryKey: ['company-profiles'],
        queryFn: () => getCompanyProfiles(),
    });

    // All canonical personas (not just ones detected in the uploaded list) —
    // lets the wizard always show every persona as choosable.
    const { data: allPersonas } = useQuery({
        queryKey: ['personas'],
        queryFn: () => campaignWizardApi.getPersonas(),
        staleTime: Infinity,
    });

    const { data: prospectLists, isLoading: listsLoading } = useQuery({
        queryKey: ['prospect-lists'],
        queryFn: () => campaignApi.getProspectLists(),
    });

    const { data: inboxes, isLoading: inboxesLoading } = useQuery({
        queryKey: ['inboxes'],
        queryFn: () => campaignApi.getInboxes(),
    });

    // Prospects of the selected list (Step 3 - Select Existing List)
    const listProspects = useListProspects({
        selectedListId: selectedLists[0],
        enabled: uploadMode === 'select' && currentStep === 3,
        queryClient,
    });

    const upload = useProspectUpload({ setErrors, setSelectedLists, queryClient });

    // Handle company profile selection - auto-fill fields
    const handleProfileSelect = (profileId) => {
        setSelectedProfileId(profileId);
        const profile = companyProfiles?.find(p => p.profile_id === profileId);
        if (profile) {
            setFormData(prev => ({
                ...prev,
                sender_name: profile.default_sender_name || prev.sender_name,
                cta_link: profile.default_cta_link || prev.cta_link,
            }));
        }
    };

    // Auto-select default profile
    useEffect(() => {
        if (companyProfiles?.length > 0 && !selectedProfileId) {
            const defaultProfile = companyProfiles.find(p => p.is_default) || companyProfiles[0];
            if (defaultProfile) {
                handleProfileSelect(defaultProfile.profile_id);
            }
        }
        // Only when the profiles arrive (a later manual "no profile" choice is kept)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyProfiles]);

    // Auto-select first list
    useEffect(() => {
        if (prospectLists?.length > 0 && selectedLists.length === 0) {
            setSelectedLists([prospectLists[0].list_id]);
        }
        // Only when the lists arrive
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prospectLists]);

    const templateEditor = useTemplateEditor({
        processingResult, setProcessingResult, selectedPersona, formData, customInstruction, creativeEmail, setErrors,
    });

    const mutations = useWizardMutations({
        campaignId, formData, selectedLists, sequenceSteps, creativeEmail, excludedProspectIds,
        setCampaignId, setCurrentStep, setErrors, setProcessingResult, setSelectedPersona, setPreviewProspect,
        setIsGeneratingTemplates, setGenerationStatus, setEnrollReport, queryClient, navigate, campaignVersionRef,
    });

    const handleStep1Submit = (e) => {
        e.preventDefault();
        if (!formData.campaign_name.trim()) {
            setErrors({ campaign_name: 'Campaign name is required' });
            return;
        }
        if (formData.inbox_ids.length === 0) {
            setErrors({ inboxes: 'Select at least one inbox for rotation' });
            return;
        }

        // If editing an existing campaign, update it and go to step 2
        if (campaignId) {
            campaignApi.update(campaignId, withVersion(
                { ...formData, send_window_end: formData.send_window_end || null }, campaignVersionRef.current))
                .then((updated) => {
                    trackVersion(campaignVersionRef, updated);
                    setCurrentStep(2);
                    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
                })
                .catch((err) => {
                    setErrors({ submit: err.response?.data?.detail || 'Failed to update campaign' });
                });
            return;
        }

        mutations.createMutation.mutate({
            ...formData,
            send_window_end: formData.send_window_end || null,
        });
    };

    const addSequenceStep = () => {
        if (sequenceSteps.length >= MAX_SEQUENCE_STEPS) return;
        setSequenceSteps(prev => [
            ...prev,
            { step_number: prev.length + 1, wait_days: 2, type: `Follow-up ${prev.length}` }
        ]);
    };

    const removeSequenceStep = (index) => {
        if (index === 0) return;
        setSequenceSteps(prev => prev.filter((_, i) => i !== index).map((s, i) => ({
            ...s,
            step_number: i + 1,
            type: i === 0 ? 'Initial Email' : `Follow-up ${i}`
        })));
    };

    return {
        navigate, editCampaignId,
        currentStep, setCurrentStep,
        campaignId,
        selectedLists, setSelectedLists,
        enrollReport, setEnrollReport,
        excludedProspectIds, setExcludedProspectIds,
        listSearchQuery, setListSearchQuery,
        isListDropdownOpen, setIsListDropdownOpen,
        processingResult,
        selectedPersona, setSelectedPersona,
        previewProspect, setPreviewProspect,
        creativeEmail, setCreativeEmail,
        isGeneratingTemplates, generationStatus,
        sequenceSteps, setSequenceSteps, addSequenceStep, removeSequenceStep,
        schedulePreview, scheduleLoading,
        formData, setFormData, dateInputRef,
        errors, setErrors,
        selectedProfileId, handleProfileSelect,
        uploadMode, setUploadMode,
        isContextOpen, setIsContextOpen, tempContext, setTempContext, contextRef,
        companyProfiles, allPersonas, prospectLists, listsLoading, inboxes, inboxesLoading,
        handleStep1Submit,
        ...draft,
        ...listProspects,
        ...upload,
        ...templateEditor,
        ...mutations,
    };
}
