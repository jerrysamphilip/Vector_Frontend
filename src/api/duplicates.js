// Duplicate review, merge preview and contact identity history (BR-CM-32/33; C-08..C-11, C-19, F-21).

import { apiClient as api } from './http';

function query(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q.append(k, v); });
    const s = q.toString();
    return s ? `?${s}` : '';
}

const get = async (path, params) => (await api.get(`${path}${query(params)}`)).data;
const post = async (path, body) => (await api.post(path, body)).data;

export const DUPLICATE_PAGE_SIZE = 20;

export const duplicatesApi = {
    /** Stored suggestions: { items: [{ pair_id, score, confidence, status, reasons, contacts: [a, b] }], total, page, page_size }. */
    pairs: ({ status = 'OPEN', confidence, page = 1, pageSize = DUPLICATE_PAGE_SIZE } = {}) =>
        get('/contacts/duplicates/pairs', { status, confidence, page, page_size: pageSize }),
    scan: () => post('/contacts/duplicates/scan'),
    dismiss: (pairId) => post(`/contacts/duplicates/${pairId}/dismiss`),
    reopen: (pairId) => post(`/contacts/duplicates/${pairId}/reopen`),
    /** { survivor, merging, properties: [{ field, label, values, differs, default }], moves, warnings, tags } */
    preview: (primaryId, duplicateIds) =>
        post('/contacts/merge/preview', { primary_id: primaryId, duplicate_ids: duplicateIds }),
    merge: (primaryId, duplicateIds, choices = {}) =>
        post('/contacts/merge', { primary_id: primaryId, duplicate_ids: duplicateIds, choices }),
    mergeHistory: (prospectId) => get(`/contacts/${prospectId}/merges`),
    emailHistory: (prospectId) => get(`/contacts/${prospectId}/emails`),
};
