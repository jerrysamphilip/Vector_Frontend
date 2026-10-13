import { apiClient } from './http';

export const platformAdminApi = {
    // Platform stats
    getStats: () => apiClient.get('/api/admin/stats').then(r => r.data),

    // Tenants
    listTenants: (params = {}) => apiClient.get('/api/admin/tenants', { params }).then(r => r.data),
    getTenantDetail: (tenantId) => apiClient.get(`/api/admin/tenants/${tenantId}`).then(r => r.data),
    updateTenantStatus: (tenantId, status) =>
        apiClient.put(`/api/admin/tenants/${tenantId}/status`, { status }).then(r => r.data),

    // Users
    listAllUsers: (params = {}) => apiClient.get('/api/admin/users', { params }).then(r => r.data),

    // Create tenant
    createTenant: (data) => apiClient.post('/api/admin/tenants', data).then(r => r.data),

    // Email scheduler pause switch (platform-wide; /scheduler/* is root-mounted)
    getSchedulerStatus: () => apiClient.get('/scheduler/status').then(r => r.data),
    pauseScheduler: () => apiClient.post('/scheduler/stop').then(r => r.data),
    resumeScheduler: () => apiClient.post('/scheduler/start').then(r => r.data),
};
