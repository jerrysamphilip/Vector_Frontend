import { apiClient as api } from './http';

export const reportsApi = {
    // Dashboard Summary — single call for full reports page
    dashboardSummary: async (params = {}) => {
        const response = await api.get('/reports/dashboard-summary', { params });
        return response.data;
    },

    // Global Analytics — KPIs + time-series (supports user_id filter)
    globalAnalytics: async (params = {}) => {
        const response = await api.get('/reports/global-analytics', { params });
        return response.data;
    },

    // Campaign Comparison — sortable, paginated (supports user_id filter)
    campaignComparison: async (params = {}) => {
        const response = await api.get('/reports/campaign-comparison', { params });
        return response.data;
    },

    // Provider Performance — per-provider stats
    providerPerformance: async (params = {}) => {
        const response = await api.get('/reports/provider-performance', { params });
        return response.data;
    },

    // CSV Exports — trigger browser download
    exportGlobalCsv: async (params = {}) => {
        const response = await api.get('/reports/export/global-analytics', {
            params,
            responseType: 'blob',
        });
        downloadBlob(response.data, 'global_analytics.csv');
    },

    exportCampaignComparisonCsv: async (params = {}) => {
        const response = await api.get('/reports/export/campaign-comparison', {
            params,
            responseType: 'blob',
        });
        downloadBlob(response.data, 'campaign_comparison.csv');
    },

    exportProspectsCsv: async (campaignId) => {
        const response = await api.get(`/reports/export/prospects/${campaignId}`, {
            responseType: 'blob',
        });
        downloadBlob(response.data, `prospects_${campaignId.slice(0, 8)}.csv`);
    },

    exportDeliverabilityCsv: async () => {
        const response = await api.get('/reports/export/deliverability', {
            responseType: 'blob',
        });
        downloadBlob(response.data, 'deliverability_report.csv');
    },

    exportGlobalDocx: async (params = {}) => {
        const response = await api.get('/reports/export/global-analytics/docx', {
            params,
            responseType: 'blob',
        });
        const today = new Date().toISOString().split('T')[0];
        downloadBlob(response.data, `analytics_report_${today}.docx`);
    },
};

function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
}
