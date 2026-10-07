// Phase 2 sales API: hierarchy, leads, SQL queue, deals, proposals, pipeline, reports (BRD v2.0 5.4 - 5.10)

import { apiClient as api } from './http';

function toParams(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        params.append(key, value);
    });
    return params;
}
const get = async (path, params) => (await api.get(params ? `${path}?${toParams(params)}` : path)).data;
const post = async (path, body) => (await api.post(path, body)).data;
const patch = async (path, body) => (await api.patch(path, body)).data;
const put = async (path, body) => (await api.put(path, body)).data;
const del = async (path) => (await api.delete(path)).data;

export const hierarchyApi = {
    get: () => get('/team/hierarchy'),
    set: (userId, payload) => put(`/team/hierarchy/${userId}`, payload),
};

export const leadsApi = {
    meta: () => get('/leads/meta'),
    list: (params) => get('/leads', params),
    board: (params) => get('/leads/board', params),
    sqlQueue: (params) => get('/leads/sql-queue', params),
    get: (id) => get(`/leads/${id}`),
    create: (payload) => post('/leads', payload),
    update: (id, payload) => patch(`/leads/${id}`, payload),
    convert: (id, payload) => post(`/leads/${id}/convert`, payload),
    remove: (id) => del(`/leads/${id}`),
};

export const stagesApi = {
    list: (includeInactive) => get('/sales/stages', includeInactive ? { include_inactive: true } : undefined),
    create: (payload) => post('/sales/stages', payload),
    update: (id, payload) => patch(`/sales/stages/${id}`, payload),
};

export const dealsApi = {
    list: (params) => get('/opportunities', params),
    board: (params) => get('/opportunities/board', params),
    get: (id) => get(`/opportunities/${id}`),
    create: (payload) => post('/opportunities', payload),
    update: (id, payload) => patch(`/opportunities/${id}`, payload),
    remove: (id) => del(`/opportunities/${id}`),
    revenue: (params) => get('/pipeline/revenue', params),
};

export const proposalsApi = {
    list: (params) => get('/proposals', params),
    create: (payload) => post('/proposals', payload),
    update: (id, payload) => patch(`/proposals/${id}`, payload),
    remove: (id) => del(`/proposals/${id}`),
};

export const salesReportsApi = {
    dashboard: (params) => get('/sales-reports/dashboard', params),
    funnel: (params) => get('/sales-reports/funnel', params),
    leads: (params) => get('/sales-reports/leads', params),
    pipeline: (params) => get('/sales-reports/pipeline', params),
    forecast: (params) => get('/sales-reports/forecast', params),
    team: (params) => get('/sales-reports/team-performance', params),
    dailyLimit: () => get('/sales-reports/daily-limit'),
};

// One display currency for amounts (matches company revenue); set VITE_CURRENCY at build time to change it
export const CURRENCY = import.meta.env.VITE_CURRENCY || 'USD';
const currency = new Intl.NumberFormat('en', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en', { style: 'currency', currency: CURRENCY, notation: 'compact', maximumFractionDigits: 1 });
export const money = (v) => (v == null ? '—' : currency.format(v));
export const moneyShort = (v) => (v == null ? '—' : compact.format(v));
export const pct = (v) => (v == null ? '—' : `${v}%`);
