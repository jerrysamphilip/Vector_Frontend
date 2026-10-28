// Export audit log (C-07): who exported which records, when, with which view. Admins only.

import { apiClient as api } from './http';

export const EXPORT_LOG_PAGE_SIZE = 50;

export const exportLogsApi = {
    list: async ({ objectType, page = 1, pageSize = EXPORT_LOG_PAGE_SIZE } = {}) => {
        const q = new URLSearchParams({ page, page_size: pageSize });
        if (objectType) q.append('object_type', objectType);
        return (await api.get(`/exports/logs?${q}`)).data;
    },
};
