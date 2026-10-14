// Sending inboxes (mailboxes), their warm-up, and the campaign inbox conversations.
import { apiClient as api } from './http';

export const inboxesApi = {
    list: async () => (await api.get('/inboxes')).data,
    get: async (id) => (await api.get(`/inboxes/${id}`)).data,
    create: async (data) => (await api.post('/inboxes', data)).data,
    update: async (id, data) => (await api.put(`/inboxes/${id}`, data)).data,
    delete: async (id) => api.delete(`/inboxes/${id}`),
    testSmtp: async (id) => (await api.post(`/inboxes/${id}/test-smtp`)).data,
    testImap: async (id) => (await api.get(`/inboxes/${id}/test-imap`)).data,
    // Pull replies over IMAP for the last `days` days
    sync: async (id, days = 30) => (await api.post(`/inboxes/${id}/sync`, { days })).data,
    // Microsoft 365 blocks password sign-in; connect with OAuth instead (BR-DF-05)
    startMicrosoftOAuth: async (id) => (await api.post(`/inboxes/${id}/oauth/microsoft/start`)).data,

    getWarmupOverview: async () => (await api.get('/inboxes/warmup/overview')).data,
    getWarmupDetail: async (id) => (await api.get(`/inboxes/${id}/warmup`)).data,
    runWarmupCycle: async () => (await api.post('/inboxes/warmup/run')).data,
};

export const conversationsApi = {
    list: async (params = {}) => (await api.get('/conversations', { params })).data,
    get: async (id) => (await api.get(`/conversations/${id}`)).data,
    reply: async (id, bodyText) => (await api.post(`/conversations/${id}/reply`, { body_text: bodyText })).data,
};

export default inboxesApi;
