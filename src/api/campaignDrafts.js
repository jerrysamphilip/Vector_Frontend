// frontend/src/api/campaignDrafts.js
/**
 * Campaign Drafts API Client.
 * Handles saving and loading incomplete campaign creation state.
 */

import { apiClient as api } from './http';

export const campaignDraftsApi = {
    /**
     * Save or update campaign draft (auto-save friendly).
     * Upserts based on user - one active draft per user.
     */
    saveDraft: async (draftName, currentStep, draftData) => {
        const response = await api.post('/campaign-drafts/', {
            draft_name: draftName,
            current_step: currentStep,
            draft_data: draftData,
        });
        return response.data;
    },

    /**
     * Get the most recent draft for current user.
     * Returns null if no draft exists.
     */
    getCurrentDraft: async () => {
        try {
            const response = await api.get('/campaign-drafts/current');
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    },

    /**
     * List all drafts for current user.
     */
    listDrafts: async () => {
        const response = await api.get('/campaign-drafts/');
        return response.data;
    },

    /**
     * Get a specific draft by ID.
     */
    getDraft: async (draftId) => {
        const response = await api.get(`/campaign-drafts/${draftId}`);
        return response.data;
    },

    /**
     * Delete a specific draft.
     */
    deleteDraft: async (draftId) => {
        const response = await api.delete(`/campaign-drafts/${draftId}`);
        return response.data;
    },

    /**
     * Clear all drafts for current user.
     * Called after successful campaign launch.
     */
    clearAllDrafts: async () => {
        const response = await api.delete('/campaign-drafts/');
        return response.data;
    },
};

export default campaignDraftsApi;
