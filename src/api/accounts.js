// Companies (BR-CM-03/04): list / record / edit, company custom properties (C-16), export (C-07) and the
// backfill preview / runs / undo (C-14). Saved company views live under /views with object_type COMPANY.

import { apiClient as api } from './http';
import { downloadFile } from './contacts';

function toParams(params = {}) {
    const out = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        out.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
    });
    return out;
}

const get = async (path, params) => (await api.get(params ? `${path}?${toParams(params)}` : path)).data;
const post = async (path, body) => (await api.post(path, body)).data;
const patch = async (path, body) => (await api.patch(path, body)).data;
const del = async (path) => (await api.delete(path)).data;

/** An AND filter spec with no conditions is no filter at all (keeps cache keys and URLs short). */
export function filterParam(spec) {
    return spec?.conditions?.length ? spec : undefined;
}

export const companiesApi = {
    list: (params) => get('/accounts', { ...params, filters: filterParam(params?.filters) }),
    meta: () => get('/accounts/meta'),
    get: (id) => get(`/accounts/${id}`),
    create: (payload) => post('/accounts', payload),
    update: (id, payload) => patch(`/accounts/${id}`, payload),
    remove: (id) => del(`/accounts/${id}`),
    restore: (id) => post(`/accounts/${id}/restore`),
    exportFile: (params) => downloadFile('/accounts/export', { ...params, filters: filterParam(params?.filters) },
        `companies.${params?.format || 'csv'}`),

    // Company custom properties (C-16)
    fields: () => get('/accounts/fields'),
    createField: (payload) => post('/accounts/fields', payload),
    updateField: (id, payload) => patch(`/accounts/fields/${id}`, payload),
    deleteField: (id) => del(`/accounts/fields/${id}`),

    // Backfill: preview (dry run), run, history, undo (C-14)
    backfillPreview: () => post('/accounts/backfill/previews'),
    backfillRun: () => post('/accounts/backfill/runs'),
    backfillRuns: () => get('/accounts/backfill/runs'),
    backfillUndo: (runId) => post(`/accounts/backfill/runs/${runId}/undo`),

    // Saved company views (backend: /views with object_type COMPANY)
    views: () => get('/views', { object_type: 'COMPANY' }),
    createView: (payload) => post('/views', { ...payload, object_type: 'COMPANY' }),
    updateView: (id, payload) => patch(`/views/${id}`, { ...payload, object_type: 'COMPANY' }),
    deleteView: (id) => del(`/views/${id}`),
};
