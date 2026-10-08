
import { apiClient as api } from './http';

const deliverabilityApi = {
    getDomains: async () => {
        const response = await api.get('/deliverability/domains');
        return response.data;
    },

    getAlerts: async (resolved = false) => {
        const response = await api.get('/deliverability/alerts', {
            params: { resolved }
        });
        return response.data;
    },

    getDashboardAlerts: async () => {
        const response = await api.get('/deliverability/dashboard-alerts');
        return response.data;
    },

    getAlertPreferences: async () => {
        const response = await api.get('/deliverability/alert-preferences');
        return response.data;
    },

    updateAlertPreferences: async (preferences) => {
        const response = await api.put('/deliverability/alert-preferences', { preferences });
        return response.data;
    },

    triggerScan: async (domainName) => {
        const response = await api.post(`/deliverability/domains/${domainName}/scans`);
        return response.data;
    },

    triggerSnapshot: async () => {
        const response = await api.post('/deliverability/snapshots');
        return response.data;
    },

    deleteDomain: async (domainName) => {
        await api.delete(`/deliverability/domains/${domainName}`);
    },

    getIntegrationStatus: async () => {
        const response = await api.get('/deliverability/integrations/status');
        return response.data;
    },

    ingestIntegrationData: async (payload) => {
        const response = await api.post('/deliverability/integrations/ingest', payload);
        return response.data;
    },

    getIntegrationMetrics: async (provider, domainName, limit = 20) => {
        const response = await api.get('/deliverability/integrations/metrics', {
            params: { provider, domain_name: domainName, limit }
        });
        return response.data;
    },

    getIntegrationEvents: async (provider, domainName, limit = 20) => {
        const response = await api.get('/deliverability/integrations/events', {
            params: { provider, domain_name: domainName, limit }
        });
        return response.data;
    },
};

export default deliverabilityApi;
