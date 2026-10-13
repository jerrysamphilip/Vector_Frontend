import { apiClient as api } from './http';

// A/B testing of email subject lines (BR-SF-18): 2-4 subject variants per sequence step.
const base = (campaignId, step) => `/campaigns/${campaignId}/sequences/${step}/subject-variants`;

export const subjectVariantsApi = {
    list: async (campaignId, step) => {
        const response = await api.get(base(campaignId, step));
        return response.data;
    },

    create: async (campaignId, step, { subject, weight }) => {
        const response = await api.post(base(campaignId, step), { subject, weight: weight || undefined });
        return response.data;
    },

    update: async (campaignId, step, label, data) => {
        const response = await api.patch(`${base(campaignId, step)}/${label}`, data);
        return response.data;
    },

    remove: async (campaignId, step, label) => {
        await api.delete(`${base(campaignId, step)}/${label}`);
    },

    stats: async (campaignId, step) => {
        const response = await api.get(`${base(campaignId, step)}/stats`);
        return response.data;
    },

    messages: async (campaignId, step, { label, limit = 50, offset = 0 } = {}) => {
        const response = await api.get(`${base(campaignId, step)}/messages`, {
            params: { label: label || undefined, limit, offset },
        });
        return response.data;
    },

    promote: async (campaignId, step, label) => {
        const response = await api.post(`${base(campaignId, step)}/${label}/promote`);
        return response.data;
    },
};

export default subjectVariantsApi;
