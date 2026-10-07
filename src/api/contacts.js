// Contacts, companies, lists, views, tasks, imports and search (CRM, BRD v2.0 section 5.2)

import { apiClient as api } from './http';

function toParams(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        params.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
    });
    return params;
}

const get = async (path, params) => (await api.get(params ? `${path}?${toParams(params)}` : path)).data;
const post = async (path, body) => (await api.post(path, body)).data;
const patch = async (path, body) => (await api.patch(path, body)).data;
const del = async (path) => (await api.delete(path)).data;

/** Trigger a browser download for an authenticated GET that returns a file. */
export async function downloadFile(path, params, fallbackName) {
    const response = await api.get(params ? `${path}?${toParams(params)}` : path, { responseType: 'blob' });
    const disposition = response.headers['content-disposition'] || '';
    const name = /filename="?([^"]+)"?/.exec(disposition)?.[1] || fallbackName;
    const url = URL.createObjectURL(response.data);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    a.click();
    URL.revokeObjectURL(url);
}

export const contactsApi = {
    meta: () => get('/contacts/meta'),
    list: (filters) => get('/contacts', filters),
    board: (filters) => get('/contacts/board', filters),
    get: (id) => get(`/contacts/${id}`),
    create: (payload) => post('/contacts', payload),
    update: (id, payload) => patch(`/contacts/${id}`, payload),
    remove: (id) => del(`/contacts/${id}`),
    exportFile: (params) => downloadFile('/contacts/export', params, `contacts.${params?.format || 'csv'}`),

    timeline: (id, params) => get(`/contacts/${id}/timeline`, params),
    history: (id, field) => get(`/contacts/${id}/history`, { field }),
    logActivity: (id, payload) => post(`/contacts/${id}/activities`, payload),
    updateActivity: (activityId, payload) => patch(`/contacts/activities/${activityId}`, payload),
    deleteActivity: (activityId) => del(`/contacts/activities/${activityId}`),

    facets: () => get('/contacts/facets'),
    owners: () => get('/contacts/owners'),
    bulk: (payload) => post('/contacts/bulk', payload),

    deleted: (params) => get('/contacts/deleted', params),
    restore: (ids) => post('/contacts/restore', { prospect_ids: ids }),

    duplicates: () => get('/contacts/duplicates'),
    merge: (primaryId, duplicateIds, choices = {}) =>
        post('/contacts/merge', { primary_id: primaryId, duplicate_ids: duplicateIds, choices }),

    fields: () => get('/contacts/fields'),
    createField: (payload) => post('/contacts/fields', payload),
    updateField: (id, payload) => patch(`/contacts/fields/${id}`, payload),
    deleteField: (id) => del(`/contacts/fields/${id}`),
};

export const accountsApi = {
    list: (filters) => get('/accounts', filters),
    get: (id) => get(`/accounts/${id}`),
    create: (payload) => post('/accounts', payload),
    update: (id, payload) => patch(`/accounts/${id}`, payload),
    remove: (id) => del(`/accounts/${id}`),
    backfill: () => post('/accounts/backfill'),
    deleted: () => get('/accounts/deleted'),
    restore: (id) => post(`/accounts/${id}/restore`),
};

export const listsApi = {
    list: (params) => get('/lists', params),
    get: (id) => get(`/lists/${id}`),
    create: (payload) => post('/lists', payload),
    update: (id, payload) => patch(`/lists/${id}`, payload),
    remove: (id) => del(`/lists/${id}`),
    preview: (filters) => post('/lists/preview', { filters }),
    addMembers: (id, ids) => post(`/lists/${id}/members`, { prospect_ids: ids }),
    removeMembers: (id, ids) => post(`/lists/${id}/members/remove`, { prospect_ids: ids }),
};

export const viewsApi = {
    list: (objectType = 'CONTACT') => get('/views', { object_type: objectType }),
    create: (payload) => post('/views', payload),
    update: (id, payload) => patch(`/views/${id}`, payload),
    remove: (id) => del(`/views/${id}`),
};

export const tasksApi = {
    list: (params) => get('/tasks', params),
    create: (payload) => post('/tasks', payload),
    update: (id, payload) => patch(`/tasks/${id}`, payload),
    remove: (id) => del(`/tasks/${id}`),
};

export const importsApi = {
    preview: async (file) => {
        const form = new FormData();
        form.append('file', file);
        return (await api.post('/imports/preview', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
    },
    run: async (file, mapping, options) => {
        const form = new FormData();
        form.append('file', file);
        form.append('mapping', JSON.stringify(mapping));
        form.append('options', JSON.stringify(options || {}));
        return (await api.post('/imports', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000 })).data;
    },
    history: (params) => get('/imports', params),
    get: (id) => get(`/imports/${id}`),
    downloadErrors: (id) => downloadFile(`/imports/${id}/errors.csv`, null, 'import-errors.csv'),
};

export const searchApi = {
    search: (q) => get('/search', { q }),
};

// FastAPI errors come back as {detail: string | {message} | [{msg}]}
export function errorMessage(err, fallback = 'Something went wrong. Try again.') {
    const detail = err?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (detail?.message) return detail.message;
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg.replace(/^Value error, /, '');
    return err?.response?.data?.error || err?.message || fallback;
}
