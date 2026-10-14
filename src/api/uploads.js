// Prospect list uploads: dry-run validation of a spreadsheet, re-validation of edited rows,
// and confirmation (creates the prospect list from the accepted rows).
import { apiClient as api } from './http';

export const uploadsApi = {
    /** Validate a .xlsx/.xls/.csv file without saving; returns { upload_id, records, total_rows, accepted, rejected }. */
    validateFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/uploads/validations', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    /** Re-run validation on edited records; returns { records }. */
    revalidate: async (uploadId, records) => {
        const response = await api.post(`/uploads/${uploadId}/revalidations`, { records });
        return response.data;
    },

    /** Save the accepted records as a prospect list; returns { list_id, ... }. */
    confirm: async (uploadId, { title, records }) => {
        const response = await api.post(`/uploads/${uploadId}/confirmations`, {
            upload_id: uploadId,
            title,
            records,
        });
        return response.data;
    },
};

export default uploadsApi;
