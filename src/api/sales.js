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
    fromMessage: (messageId) => post('/leads/from-message', { message_id: messageId }),
    replySuggestions: () => get('/leads/reply-suggestions'),
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
    timeline: (id) => get(`/opportunities/${id}/timeline`),
    logActivity: (id, payload) => post(`/opportunities/${id}/activities`, payload),
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
    targets: (params) => get('/sales-reports/targets', params),
    leaderboard: (params) => get('/sales-reports/leaderboard', params),
    campaignRoi: (params) => get('/sales-reports/campaign-roi', params),
};

export const notificationsApi = {
    list: (params) => get('/notifications', params),
    read: (ids) => post('/notifications/read', { ids }),
    setEmail: (email) => put('/notifications/preferences', { email }),
};

export const settingsApi = {
    get: () => get('/sales/settings'),
    save: (payload) => put('/sales/settings', payload),
};

export const workflowApi = {
    meta: () => get('/workflow/meta'),
    list: () => get('/workflow/rules'),
    create: (payload) => post('/workflow/rules', payload),
    update: (id, payload) => patch(`/workflow/rules/${id}`, payload),
    remove: (id) => del(`/workflow/rules/${id}`),
};

export const targetsApi = {
    list: (fy) => get('/sales/targets', fy ? { fy } : undefined),
    set: (payload) => put('/sales/targets', payload),
};

export const templatesApi = {
    list: (params) => get('/template-library', params),
    create: (payload) => post('/template-library', payload),
    update: (id, payload) => patch(`/template-library/${id}`, payload),
    remove: (id) => del(`/template-library/${id}`),
    render: (id, prospectId, countUse = false) => post(`/template-library/${id}/render`, { prospect_id: prospectId || null, count_use: countUse }),
};

export const customReportsApi = {
    meta: () => get('/reports/custom/meta'),
    run: (definition) => post('/reports/custom/run', definition),
    list: () => get('/reports/custom'),
    get: (id) => get(`/reports/custom/${id}`),
    create: (payload) => post('/reports/custom', payload),
    update: (id, payload) => patch(`/reports/custom/${id}`, payload),
    remove: (id) => del(`/reports/custom/${id}`),
};

export const productsApi = {
    list: (includeInactive) => get('/products', includeInactive ? { include_inactive: true } : undefined),
    create: (payload) => post('/products', payload),
    update: (id, payload) => patch(`/products/${id}`, payload),
};

export const quotesApi = {
    get: (proposalId) => get(`/proposals/${proposalId}/lines`),
    save: (proposalId, lines) => put(`/proposals/${proposalId}/lines`, { lines }),
    pdf: async (proposalId, name = 'proposal') => {
        const res = await api.get(`/proposals/${proposalId}/pdf`, { responseType: 'blob' });
        const url = URL.createObjectURL(res.data);
        Object.assign(document.createElement('a'), { href: url, download: `${name}.pdf` }).click();
        URL.revokeObjectURL(url);
    },
};

export const connectionsApi = {
    list: () => get('/connections'),
    start: (provider) => post(`/connections/${provider}/start`),
    update: (id, payload) => patch(`/connections/${id}`, payload),
    sync: (id) => post(`/connections/${id}/sync`),
    remove: (id) => del(`/connections/${id}`),
};

// One display currency for amounts (matches company revenue); set VITE_CURRENCY at build time to change it
export const CURRENCY = import.meta.env.VITE_CURRENCY || 'USD';
const currency = new Intl.NumberFormat('en', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en', { style: 'currency', currency: CURRENCY, notation: 'compact', maximumFractionDigits: 1 });
export const money = (v) => (v == null ? '—' : currency.format(v));
export const moneyShort = (v) => (v == null ? '—' : compact.format(v));
export const pct = (v) => (v == null ? '—' : `${v}%`);
