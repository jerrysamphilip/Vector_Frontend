// Prospects API Client

import { apiClient as api } from './http';

export const prospectsApi = {
    // Get prospect stats for KPIs
    getStats: async () => {
        const response = await api.get('/prospects/stats');
        return response.data;
    },

    // Get all prospect lists with pagination
    getLists: async ({ page = 1, pageSize = 20, search = '', sortBy = 'uploaded_at', sortOrder = 'desc' } = {}) => {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('page_size', pageSize);
        if (search) params.append('search', search);
        params.append('sort_by', sortBy);
        params.append('sort_order', sortOrder);

        const response = await api.get(`/prospect-lists?${params}`);
        return response.data;
    },

    // Get prospects in a specific list
    getListProspects: async (listId, { page = 1, pageSize = 20, search = '' } = {}) => {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('page_size', pageSize);
        if (search) params.append('search', search);

        const response = await api.get(`/prospect-lists/${listId}/prospects?${params}`);
        return response.data;
    },

    // Delete a prospect list
    deleteList: async (listId) => {
        const response = await api.delete(`/prospect-lists/${listId}`);
        return response.data;
    },

    // Update a prospect
    updateProspect: async (prospectId, updates) => {
        const response = await api.patch(`/prospects/${prospectId}`, updates);
        return response.data;
    },

    // Update prospect note (per-list)
    updateProspectNote: async (listId, prospectId, notes) => {
        const response = await api.patch(`/prospect-lists/${listId}/prospects/${prospectId}/notes`, { notes });
        return response.data;
    },

    // Revalidate all prospects in a list
    revalidateList: async (listId) => {
        const response = await api.post(`/prospect-lists/${listId}/revalidations`);
        return response.data;
    },

    // Delete an individual prospect
    deleteProspect: async (prospectId) => {
        const response = await api.delete(`/prospects/${prospectId}`);
        return response.data;
    },

    // Bulk delete prospects (calls individual delete for each)
    bulkDeleteProspects: async (prospectIds) => {
        const results = await Promise.allSettled(
            prospectIds.map(id => api.delete(`/prospects/${id}`))
        );
        const failedIds = prospectIds.filter((_, i) => results[i].status === 'rejected');
        const firstError = results.find(r => r.status === 'rejected')?.reason;
        return { deleted: prospectIds.length - failedIds.length, failed: failedIds.length, failed_ids: failedIds, first_error: firstError };
    },

    // Bulk update prospects (calls individual patch for each)
    bulkUpdateProspects: async (prospectIds, updates) => {
        const results = await Promise.allSettled(
            prospectIds.map(id => api.patch(`/prospects/${id}`, updates))
        );
        const failedIds = prospectIds.filter((_, i) => results[i].status === 'rejected');
        const firstError = results.find(r => r.status === 'rejected')?.reason;
        return { updated: prospectIds.length - failedIds.length, failed: failedIds.length, failed_ids: failedIds, first_error: firstError };
    },
};
