// Contacts & Accounts API Client

import { apiClient as api } from './http';

function toParams(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') params.append(key, value);
    });
    return params;
}

export const contactsApi = {
    list: async (filters) => (await api.get(`/contacts?${toParams(filters)}`)).data,
    get: async (id) => (await api.get(`/contacts/${id}`)).data,
    create: async (payload) => (await api.post('/contacts', payload)).data,
    update: async (id, payload) => (await api.patch(`/contacts/${id}`, payload)).data,
    remove: async (id) => (await api.delete(`/contacts/${id}`)).data,

    timeline: async (id, types) => (await api.get(`/contacts/${id}/timeline?${toParams({ types })}`)).data,
    logActivity: async (id, payload) => (await api.post(`/contacts/${id}/activities`, payload)).data,
    updateActivity: async (activityId, payload) => (await api.patch(`/contacts/activities/${activityId}`, payload)).data,
    deleteActivity: async (activityId) => (await api.delete(`/contacts/activities/${activityId}`)).data,

    facets: async () => (await api.get('/contacts/facets')).data,
    owners: async () => (await api.get('/contacts/owners')).data,
    bulk: async (payload) => (await api.post('/contacts/bulk', payload)).data,

    duplicates: async () => (await api.get('/contacts/duplicates')).data,
    merge: async (primaryId, duplicateIds) =>
        (await api.post('/contacts/merge', { primary_id: primaryId, duplicate_ids: duplicateIds })).data,

    fields: async () => (await api.get('/contacts/fields')).data,
    createField: async (payload) => (await api.post('/contacts/fields', payload)).data,
    updateField: async (id, payload) => (await api.patch(`/contacts/fields/${id}`, payload)).data,
    deleteField: async (id) => (await api.delete(`/contacts/fields/${id}`)).data,
};

export const accountsApi = {
    list: async (filters) => (await api.get(`/accounts?${toParams(filters)}`)).data,
    get: async (id) => (await api.get(`/accounts/${id}`)).data,
    create: async (payload) => (await api.post('/accounts', payload)).data,
    update: async (id, payload) => (await api.patch(`/accounts/${id}`, payload)).data,
    remove: async (id) => (await api.delete(`/accounts/${id}`)).data,
    backfill: async () => (await api.post('/accounts/backfill')).data,
};

// FastAPI errors come back as {detail: string | {message} | [{msg}]}
export function errorMessage(err, fallback = 'Something went wrong. Try again.') {
    const detail = err?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (detail?.message) return detail.message;
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg.replace(/^Value error, /, '');
    return err?.response?.data?.error || err?.message || fallback;
}
