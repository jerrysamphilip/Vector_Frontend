// Contact lists (BR-CM-22/23/24): static and active lists, members, paging and export (C-07, C-21).
// List names are unique per workspace: a clash is a 409 whose detail is { message, field: 'list_name' }.

import { apiClient as api } from './http';
import { downloadFile } from './contacts';

function query(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q.append(k, v); });
    const s = q.toString();
    return s ? `?${s}` : '';
}

const get = async (path, params) => (await api.get(`${path}${query(params)}`)).data;
const post = async (path, body) => (await api.post(path, body)).data;
const patch = async (path, body) => (await api.patch(path, body)).data;
const del = async (path) => (await api.delete(path)).data;

export const LIST_PAGE_SIZE = 25;

export const listsApi = {
    /** Without page / page_size: { items } (up to 500). With them: { items, total, page, page_size }. */
    list: (params) => get('/lists', params),
    page: ({ page = 1, pageSize = LIST_PAGE_SIZE, listType, q } = {}) =>
        get('/lists', { page, page_size: pageSize, list_type: listType, q }),
    get: (id) => get(`/lists/${id}`),
    create: (payload) => post('/lists', payload),
    update: (id, payload) => patch(`/lists/${id}`, payload),
    remove: (id) => del(`/lists/${id}`),
    preview: (filters) => post('/lists/preview', { filters }),
    addMembers: (id, ids) => post(`/lists/${id}/members`, { prospect_ids: ids }),
    removeMembers: (id, ids) => post(`/lists/${id}/members/remove`, { prospect_ids: ids }),
    exportFile: (id, format = 'csv', name = 'list') =>
        downloadFile(`/lists/${id}/export`, { format }, `${name}.${format}`),
};
