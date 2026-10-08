import { apiClient as api } from './http';

// Campaign API
export const campaignApi = {
    // List campaigns with filters
    list: async (params = {}) => {
        const response = await api.get('/campaigns', { params });
        return response.data;
    },

    // Get single campaign
    get: async (id) => {
        const response = await api.get(`/campaigns/${id}`);
        return response.data;
    },

    // Create campaign
    create: async (data) => {
        const response = await api.post('/campaigns', data);
        return response.data;
    },

    // Update campaign
    update: async (id, data) => {
        const response = await api.put(`/campaigns/${id}`, data);
        return response.data;
    },

    // Delete campaign
    delete: async (id) => {
        await api.delete(`/campaigns/${id}`);
    },

    // Launch campaign
    launch: async (id) => {
        const response = await api.post(`/campaigns/${id}/launch`);
        return response.data;
    },

    // Pause campaign
    pause: async (id, reason = null) => {
        const response = await api.post(`/campaigns/${id}/pause`, null, {
            params: reason ? { reason } : {},
        });
        return response.data;
    },

    // Resume campaign
    resume: async (id) => {
        const response = await api.post(`/campaigns/${id}/resume`);
        return response.data;
    },

    // Send Now (Bypass Schedule)
    sendNow: async (id) => {
        const response = await api.post(`/campaigns/${id}/send-now`);
        return response.data;
    },

    // Get metrics
    getMetrics: async (id) => {
        const response = await api.get(`/campaigns/${id}/metrics`);
        return response.data;
    },

    // Get audit trail
    getAudit: async (id) => {
        const response = await api.get(`/campaigns/${id}/audit`);
        return response.data;
    },

    // Get Enrolled Prospects
    getProspects: async (id) => {
        // TODO: Implement backend endpoint GET /campaigns/{id}/prospects
        // For now this will likely 404, but we add it for the UI structure.
        try {
            const response = await api.get(`/campaigns/${id}/prospects`);
            return response.data;
        } catch (e) {
            console.warn("getProspects failed (backend missing?)", e);
            return [];
        }
    },

    // --- New Methods for 6-Stage Workflow ---

    // Get Prospect Lists (returns items array from paginated response)
    getProspectLists: async () => {
        const response = await api.get('/prospect-lists');
        // Backend returns paginated response {items, total, page, page_size}
        // Extract items array for backwards compatibility
        return response.data.items || response.data;
    },

    // Enroll Prospects (Stage 3) — also works after the campaign is scheduled/paused
    enrollProspects: async (campaignId, listIds) => {
        const response = await api.post(`/campaigns/${campaignId}/prospects`, {
            list_ids: listIds,
            prospect_ids: []
        });
        return response.data;
    },

    // Remove a prospect from the campaign (cancels their not-yet-sent emails)
    removeProspect: async (campaignId, prospectId) => {
        const response = await api.delete(`/campaigns/${campaignId}/prospects/${prospectId}`);
        return response.data;
    },

    // Generate Content Stub (Stage 4)
    generateContentStub: async (campaignId) => {
        const response = await api.post(`/campaigns/${campaignId}/content/stub`);
        return response.data;
    },

    // ===== NEW: Analytics Endpoints =====

    // Get detailed analytics (bar chart data, sequence metrics, lead stats)
    getAnalytics: async (campaignId, days = 7) => {
        const response = await api.get(`/campaigns/${campaignId}/analytics`, {
            params: { days }
        });
        return response.data;
    },

    // Get email template and prospect replies for a specific sequence step
    getSequenceStepEmails: async (campaignId, step) => {
        const response = await api.get(`/campaigns/${campaignId}/sequences/${step}/emails`);
        return response.data;
    },

    // Get all templates for a campaign
    getTemplates: async (campaignId) => {
        const response = await api.get(`/campaigns/${campaignId}/templates`);
        return response.data;
    },

    // Regenerate template content using AI
    regenerateTemplate: async (campaignId, templateId, options = {}) => {
        const response = await api.post(`/campaigns/${campaignId}/templates/${templateId}/regenerate`, {
            tone: options.tone || 'professional',
            regenerate_subject: options.regenerateSubject ?? true,
            regenerate_body: options.regenerateBody ?? true,
            creative_email: options.creativeEmail ?? false,
            custom_instruction: options.customInstruction || '',
        });
        return response.data;
    },

    // Get schedule timeline (upcoming/sent emails by date)
    getSchedule: async (campaignId) => {
        const response = await api.get(`/campaigns/${campaignId}/schedule`);
        return response.data;
    },

    // Approve a single template
    approveTemplate: async (campaignId, templateId) => {
        const response = await api.post(`/campaigns/${campaignId}/templates/${templateId}/approve`);
        return response.data;
    },

    // Approve all templates for a campaign
    approveAllTemplates: async (campaignId) => {
        const response = await api.post(`/campaigns/${campaignId}/templates/approve-all`);
        return response.data;
    },

    // ===== Manual Event Tracking =====

    // Mark a prospect as replied
    markProspectReplied: async (campaignId, prospectId) => {
        const response = await api.post(`/campaigns/${campaignId}/prospects/${prospectId}/mark-replied`);
        return response.data;
    },

    // Mark a prospect as opened
    markProspectOpened: async (campaignId, prospectId) => {
        const response = await api.post(`/campaigns/${campaignId}/prospects/${prospectId}/mark-opened`);
        return response.data;
    },

    // Mark a specific message as replied
    markMessageReplied: async (campaignId, messageId) => {
        const response = await api.post(`/campaigns/${campaignId}/messages/${messageId}/mark-replied`);
        return response.data;
    },

    // Get schedule timeline for a campaign
    getSchedule: async (campaignId) => {
        const response = await api.get(`/campaigns/${campaignId}/schedule`);
        return response.data;
    },

    // Get Inboxes
    getInboxes: async () => {
        const response = await api.get('/inboxes');
        return response.data;
    },

    // Reschedule a specific queued/scheduled email message
    rescheduleMessage: async (campaignId, messageId, newScheduledAt, reason = null) => {
        const response = await api.patch(
            `/campaigns/${campaignId}/messages/${messageId}/reschedule`,
            { new_scheduled_at: newScheduledAt, reason }
        );
        return response.data;
    },

    // Bulk-reschedule all queued emails on a given date + step
    rescheduleDate: async (campaignId, date, stepNumber, newScheduledAt, reason = null) => {
        const response = await api.post(
            `/campaigns/${campaignId}/schedule/reschedule-date`,
            { date, step_number: stepNumber, new_scheduled_at: newScheduledAt, reason }
        );
        return response.data;
    },

    // List bounced prospects eligible for re-validation (Admin only)
    listBouncedCandidates: async () => {
        const response = await api.get('/campaigns/bounced-prospects/revalidation-candidates');
        return response.data;
    },

    // Re-validate a bounced prospect with a new email (Admin only)
    revalidateProspect: async (prospectId, { newEmail, reason }) => {
        const response = await api.patch(`/campaigns/prospects/${prospectId}/revalidate`, {
            new_email: newEmail,
            reason,
        });
        return response.data;
    },
};

// Sequence API
export const sequenceApi = {
    // Get sequences for campaign
    list: async (campaignId) => {
        const response = await api.get(`/campaigns/${campaignId}/sequences`);
        return response.data;
    },

    // Add sequence step
    add: async (campaignId, data) => {
        const response = await api.post(`/campaigns/${campaignId}/sequences`, data);
        return response.data;
    },

    // Update step
    update: async (sequenceId, data) => {
        const response = await api.put(`/campaigns/sequences/${sequenceId}`, data);
        return response.data;
    },

    // Delete step
    delete: async (sequenceId) => {
        await api.delete(`/campaigns/sequences/${sequenceId}`);
    },
};

// Template API
export const templateApi = {
    // Get template
    get: async (id) => {
        const response = await api.get(`/templates/${id}`);
        return response.data;
    },

    // Create template
    create: async (data) => {
        const response = await api.post('/templates', data);
        return response.data;
    },

    // Update template
    update: async (id, data) => {
        const response = await api.put(`/templates/${id}`, data);
        return response.data;
    },

    // Approve template
    approve: async (id, approvedBy) => {
        const response = await api.post(`/templates/${id}/approve`, { approved_by: approvedBy });
        return response.data;
    },

    // Get versions
    getVersions: async (id) => {
        const response = await api.get(`/templates/${id}/versions`);
        return response.data;
    },

    // List attachments for a template
    listAttachments: async (templateId) => {
        const response = await api.get(`/templates/${templateId}/attachments`);
        return response.data;
    },

    // Upload a file attachment (Gmail-style compose attachment)
    uploadAttachment: async (templateId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(`/templates/${templateId}/attachments`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    // Remove an attachment
    deleteAttachment: async (templateId, attachmentId) => {
        await api.delete(`/templates/${templateId}/attachments/${attachmentId}`);
    },

    // Build the authenticated download URL path for an attachment (relative, goes through apiClient's baseURL)
    attachmentDownloadPath: (templateId, attachmentId) =>
        `/templates/${templateId}/attachments/${attachmentId}/download`,
};

export default api;
