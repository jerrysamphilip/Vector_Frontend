// Outbound webhooks (BRD v2.0 BR-SF-20): endpoints, secrets, test events and the delivery log

import { apiClient as api } from './http';

const BASE = '/integrations/webhooks';

export const webhooksApi = {
    eventTypes: async () => (await api.get(`${BASE}/event-types`)).data,
    list: async () => (await api.get(BASE)).data,
    create: async (payload) => (await api.post(BASE, payload)).data,
    update: async (id, payload) => (await api.patch(`${BASE}/${id}`, payload)).data,
    remove: async (id) => (await api.delete(`${BASE}/${id}`)).data,
    rotateSecret: async (id) => (await api.post(`${BASE}/${id}/rotate-secret`)).data,
    test: async (id) => (await api.post(`${BASE}/${id}/test`)).data,
    deliveries: async (id, params = {}) => {
        const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
        return (await api.get(`${BASE}/${id}/deliveries${qs.toString() ? `?${qs}` : ''}`)).data;
    },
    delivery: async (id, deliveryId) => (await api.get(`${BASE}/${id}/deliveries/${deliveryId}`)).data,
    redeliver: async (id, deliveryId) => (await api.post(`${BASE}/${id}/deliveries/${deliveryId}/redeliver`)).data,
};
