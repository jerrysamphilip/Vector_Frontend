// Background CRM imports (C-03..C-06, F-16): upload -> mapping -> dry run -> start -> progress -> result.
// The synchronous one-shot import (importsApi.run in ./contacts) stays for small files.

import { apiClient as api } from './http';
import { downloadFile } from './contacts';

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

/** Job states while the worker still has it. */
export const ACTIVE_STATUSES = ['QUEUED', 'RUNNING'];
export const isActive = (job) => !!job && ACTIVE_STATUSES.includes(job.status);

export const IMPORT_MODES = {
    CREATE_AND_UPDATE: 'Create new and update existing',
    CREATE: 'Only create new records',
    UPDATE_ONLY: 'Only update existing records',
};

export const DATE_ORDERS = {
    MDY: 'Month first (03/04/2026 = March 4)',
    DMY: 'Day first (03/04/2026 = 3 April)',
};

export const backgroundImportsApi = {
    /** Store the file; returns the preview (headers, sample, suggested_mapping, targets, sheet_names) and `import`. */
    upload: async (file, sheet) => {
        const form = new FormData();
        form.append('file', file);
        if (sheet) form.append('sheet', sheet);
        return (await api.post('/imports/uploads', form, multipart)).data;
    },
    dryRun: async (id, mapping, options) => (await api.post(`/imports/${id}/dry-run`, { mapping, options })).data,
    start: async (id, mapping, options) => (await api.post(`/imports/${id}/start`, { mapping, options })).data,
    cancel: async (id) => (await api.post(`/imports/${id}/cancel`)).data,
    resume: async (id) => (await api.post(`/imports/${id}/resume`)).data,
    get: async (id) => (await api.get(`/imports/${id}`)).data,
    history: async (params = {}) => (await api.get('/imports', { params })).data,
    downloadErrors: (id) => downloadFile(`/imports/${id}/errors.csv`, null, 'import-errors.csv'),
};

export const savedMappingsApi = {
    list: async () => (await api.get('/imports/mappings')).data,
    save: async (name, mapping, options) => (await api.post('/imports/mappings', { name, mapping, options })).data,
    remove: async (id) => (await api.delete(`/imports/mappings/${id}`)).data,
};
