import { useState } from 'react';
import { uploadsApi } from '../../../api/uploads';

// Step 3 "Upload New List": dry-run validation of a spreadsheet, inline editing of the validated rows,
// re-validation, and confirmation (creates the list and selects it for the campaign).

/**
 * @param {object} opts
 * @param {(errors: object) => void} opts.setErrors
 * @param {(ids: string[]) => void} opts.setSelectedLists
 * @param {import('@tanstack/react-query').QueryClient} opts.queryClient
 */
export function useProspectUpload({ setErrors, setSelectedLists, queryClient }) {
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadResult, setUploadResult] = useState(null);
    const [editableUploadRecords, setEditableUploadRecords] = useState([]);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadConfirmed, setUploadConfirmed] = useState(false);
    // Inline editing state for upload table (matching ProspectValidate style)
    const [uploadEditingIndex, setUploadEditingIndex] = useState(null);
    const [uploadEditValues, setUploadEditValues] = useState({});

    const startUploadEdit = (index) => {
        setUploadEditingIndex(index);
        const record = editableUploadRecords[index];
        setUploadEditValues({ ...record });
    };

    const saveUploadEdit = () => {
        setEditableUploadRecords(prev => {
            const updated = [...prev];
            updated[uploadEditingIndex] = { ...uploadEditValues };
            return updated;
        });
        setUploadEditingIndex(null);
        setUploadEditValues({});
    };

    const cancelUploadEdit = () => {
        setUploadEditingIndex(null);
        setUploadEditValues({});
    };

    // Re-validate edited records
    const handleUploadRevalidate = async () => {
        if (editableUploadRecords.length === 0) return;

        setUploadLoading(true);
        try {
            const result = await uploadsApi.revalidate(uploadResult?.upload_id || 'current', editableUploadRecords);
            setEditableUploadRecords(result.records || []);
        } catch (error) {
            console.error('Re-validation error:', error);
            setErrors({ upload: error.response?.data?.detail || error.message });
        } finally {
            setUploadLoading(false);
        }
    };

    // Dry-run validation of uploaded file
    const handleUploadDryRun = async () => {
        if (!uploadFile) return;

        setUploadLoading(true);
        try {
            const result = await uploadsApi.validateFile(uploadFile);
            setUploadResult(result);
            setEditableUploadRecords(result.records || []);
        } catch (error) {
            console.error('Upload validation error:', error);
            setErrors({ upload: error.response?.data?.detail || error.message });
        } finally {
            setUploadLoading(false);
        }
    };

    // Handle row deletion
    const handleUploadRowDelete = (index) => {
        setEditableUploadRecords(prev => prev.filter((_, i) => i !== index));
    };

    // Confirm upload and save to database
    const handleConfirmUpload = async () => {
        if (!uploadResult?.upload_id) return;

        // Use filename as title if not specified
        const title = uploadTitle.trim() || uploadFile?.name?.replace(/\.[^.]+$/, '') || 'Uploaded List';

        setUploadLoading(true);
        try {
            const result = await uploadsApi.confirm(uploadResult.upload_id, {
                title: title,
                records: editableUploadRecords.filter(r => r.status === 'ACCEPTED') || [],
            });

            // Set the list as selected for the campaign
            setSelectedLists([result.list_id]);
            setUploadConfirmed(true);

            // Refresh prospect lists
            queryClient.invalidateQueries(['prospect-lists']);
        } catch (error) {
            console.error('Upload confirm error:', error);
            setErrors({ upload: error.response?.data?.detail || error.message });
        } finally {
            setUploadLoading(false);
        }
    };

    return {
        uploadFile, setUploadFile,
        uploadTitle, setUploadTitle,
        uploadResult, setUploadResult,
        editableUploadRecords,
        uploadLoading,
        uploadConfirmed, setUploadConfirmed,
        uploadEditingIndex,
        uploadEditValues, setUploadEditValues,
        startUploadEdit, saveUploadEdit, cancelUploadEdit,
        handleUploadRevalidate, handleUploadDryRun, handleUploadRowDelete, handleConfirmUpload,
    };
}
