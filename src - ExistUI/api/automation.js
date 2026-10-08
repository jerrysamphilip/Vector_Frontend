
import { apiClient as api } from './http';

const automationApi = {
    getRules: async (campaignId = null) => {
        const params = campaignId ? { campaign_id: campaignId } : {};
        const response = await api.get('/automation-rules', { params });
        return response.data;
    },

    createRule: async (ruleData) => {
        const response = await api.post('/automation-rules', ruleData);
        return response.data;
    },

    updateRule: async (ruleId, updateData) => {
        const response = await api.patch(`/automation-rules/${ruleId}`, updateData);
        return response.data;
    },

    deleteRule: async (ruleId) => {
        const response = await api.delete(`/automation-rules/${ruleId}`);
        return response.data;
    }
};

export default automationApi;
