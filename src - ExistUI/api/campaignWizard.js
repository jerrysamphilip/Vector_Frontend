import { apiClient as api } from './http';

// Campaign Wizard API
export const campaignWizardApi = {
    // Get available prospect lists
    getLists: async () => {
        const response = await api.get('/campaigns/lists');
        return response.data;
    },

    // Step 1: Create campaign
    createCampaign: async (campaignName, timezone = 'Asia/Kolkata', sendStartHour = 9, sendEndHour = 17) => {
        const response = await api.post('/campaigns/wizard-creations', {
            campaign_name: campaignName,
            timezone,
            send_start_hour: sendStartHour,
            send_end_hour: sendEndHour,
        });
        return response.data;
    },

    // Process list: Auto-classify prospects and generate templates per persona
    processList: async (
        campaignId,
        listId,
        productName = 'your solution',
        companyName = 'your company',
        campaignDescription = '',
        sequenceSteps = null,
        includeFirstNameInSubject = false,
        creativeEmail = false,
        excludedProspectIds = null
    ) => {
        const response = await api.post(`/campaigns/${campaignId}/generations`, {
            campaign_id: campaignId,
            list_id: listId,
            product_name: productName,
            company_name: companyName,
            campaign_description: campaignDescription,
            sequence_steps: sequenceSteps,
            include_first_name_in_subject: includeFirstNameInSubject,
            creative_email: creativeEmail,
            excluded_prospect_ids: excludedProspectIds,
        });
        return response.data;
    },

    // Canonical persona list (for always-show-all-personas picker)
    getPersonas: async () => {
        const response = await api.get('/personas');
        return response.data;
    },

    // Generate (or on-demand regenerate) a single persona's template —
    // used when a user selects a persona with no prospects detected yet.
    generatePersonaTemplate: async (
        campaignId,
        personaType,
        listId,
        productName = 'your solution',
        companyName = 'your company',
        campaignDescription = '',
        sequenceSteps = null,
        includeFirstNameInSubject = false,
        creativeEmail = false,
        excludedProspectIds = null
    ) => {
        const response = await api.post(`/campaigns/${campaignId}/personas/${personaType}/generations`, {
            list_id: listId,
            product_name: productName,
            company_name: companyName,
            campaign_description: campaignDescription,
            sequence_steps: sequenceSteps,
            include_first_name_in_subject: includeFirstNameInSubject,
            creative_email: creativeEmail,
            excluded_prospect_ids: excludedProspectIds,
        });
        return response.data;
    },

    // Step 2: Preview segmentation
    previewSegmentation: async (listId, personaTypes = null, excludePersonalEmails = true) => {
        const response = await api.post(`/prospect-lists/${listId}/segmentations/previews`, {
            list_id: listId,
            persona_types: personaTypes,
            exclude_personal_emails: excludePersonalEmails,
        });
        return response.data;
    },

    // Step 3: Enroll prospects
    // enrollProspects: async (campaignId, listId, personaTypes = null, excludePersonalEmails = true, coolOffDays = 7, dailyBatchSize = null) => {
    //     const payload = {
    //         campaign_id: campaignId,
    //         list_id: listId,
    //         persona_types: personaTypes,
    //         exclude_personal_emails: excludePersonalEmails,
    //         cool_off_days: coolOffDays,
    //     };
    //     if (dailyBatchSize) payload.daily_batch_size = dailyBatchSize;
    //     const response = await api.post(`/campaigns/${campaignId}/enrollments`, payload);
    //     return response.data;
    // },

      enrollProspects: async (campaignId, listId, personaTypes = null, excludePersonalEmails = true, coolOffDays = 7, dailyBatchSize = null, excludedProspectIds = null) => {
        const payload = {
            campaign_id: campaignId,
            list_id: listId,
            persona_types: personaTypes,
            exclude_personal_emails: excludePersonalEmails,
            cool_off_days: coolOffDays,
            excluded_prospect_ids: excludedProspectIds,
        };
        if (dailyBatchSize) payload.daily_batch_size = dailyBatchSize;
        const response = await api.post(`/campaigns/${campaignId}/enrollments`, payload);
        return response.data;
    },

    // Step 4: Activate campaign
    activateCampaign: async (campaignId) => {
        const response = await api.post(`/campaigns/${campaignId}/activations`, {
            campaign_id: campaignId,
        });
        return response.data;
    },

    // All-in-one wizard
    runWizard: async (campaignName, listId, personaTypes = null, excludePersonalEmails = true, coolOffDays = 7) => {
        const response = await api.post('/campaigns/wizard-executions', {
            campaign_name: campaignName,
            list_id: listId,
            persona_types: personaTypes,
            exclude_personal_emails: excludePersonalEmails,
            cool_off_days: coolOffDays,
        });
        return response.data;
    },

    // Regenerate specific email part (subject or body)
    regenerate: async (templateId, field, context = {}) => {
        const response = await api.post(`/templates/${templateId}/regenerations`, {
            template_id: templateId,
            field: field, // 'subject' or 'body'
            campaign_description: context.campaign_description || '',
            persona_type: context.persona_type || '',
            product_name: context.product_name || 'your solution',
            cta_link: context.cta_link || null,
            custom_instruction: context.custom_instruction || '',
            creative_email: context.creative_email || false,
            step_number: context.step_number || 1,
        });
        return response.data;
    },

    // Manually update template after user edit
    updateTemplate: async (templateId, field, newContent) => {
        const payload = { template_id: templateId };
        if (field === 'subject') payload.subject = newContent;
        if (field === 'body') payload.body = newContent;

        const response = await api.post('/campaign-wizard/update-template', payload);
        return response.data;
    },

    // Get schedule preview with timezone-aware dates
    schedulePreview: async (sequenceSteps, state = 'NY') => {
        const response = await api.post('/campaigns/schedules/previews', {
            sequence_steps: sequenceSteps.map(s => ({
                step_number: s.step_number,
                wait_days: s.wait_days || 0
            })),
            state: state
        });
        return response.data;
    },
};

export default campaignWizardApi;
