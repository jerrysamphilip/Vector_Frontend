import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prospectsApi } from '../../../api/prospects';
import { withVersion } from '../../../lib/staleVersion';

// State and actions of the prospect list dialog (ProspectListModal): paged / searchable prospects of
// one list, inline edit and per-list note, revalidation, selection with bulk edit / delete / add to list.
export function useProspectListModal(list) {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [revalidationResult, setRevalidationResult] = useState(null);
    const [validationMap, setValidationMap] = useState({});

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState([]);
    const [showBulkEdit, setShowBulkEdit] = useState(false);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [showAddToList, setShowAddToList] = useState(false);
    const [listNotice, setListNotice] = useState(null);

    // Fetch prospects for this list
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['list-prospects', list.list_id, page, search],
        queryFn: () => prospectsApi.getListProspects(list.list_id, { page, search }),
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ prospectId, updates }) => prospectsApi.updateProspect(prospectId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries(['list-prospects', list.list_id]);
            setEditingId(null);
            setEditValues({});
        },
    });

    // Note update mutation (per-list)
    const notesMutation = useMutation({
        mutationFn: ({ prospectId, notes }) => prospectsApi.updateProspectNote(list.list_id, prospectId, notes),
        onSuccess: () => {
            queryClient.invalidateQueries(['list-prospects', list.list_id]);
        },
    });

    // Revalidate mutation
    const revalidateMutation = useMutation({
        mutationFn: () => prospectsApi.revalidateList(list.list_id),
        onSuccess: (data) => {
            setRevalidationResult(data);
            const map = {};
            if (data.results) {
                data.results.forEach(r => {
                    map[r.prospect_id] = { status: r.status, issues: r.issues || [] };
                });
            }
            setValidationMap(map);
            refetch();
        },
    });

    // Delete prospect mutation
    const deleteMutation = useMutation({
        mutationFn: (prospectId) => prospectsApi.deleteProspect(prospectId),
        onSuccess: () => {
            queryClient.invalidateQueries(['list-prospects', list.list_id]);
            queryClient.invalidateQueries(['prospect-lists']);
            queryClient.invalidateQueries(['prospect-stats']);
            setDeleteConfirmId(null);
        },
    });

    // Bulk delete mutation
    const bulkDeleteMutation = useMutation({
        mutationFn: (ids) => prospectsApi.bulkDeleteProspects(ids),
        onSuccess: () => {
            queryClient.invalidateQueries(['list-prospects', list.list_id]);
            queryClient.invalidateQueries(['prospect-lists']);
            queryClient.invalidateQueries(['prospect-stats']);
            setSelectedIds([]);
            setShowBulkDeleteConfirm(false);
        },
    });

    // Bulk update mutation
    const bulkUpdateMutation = useMutation({
        mutationFn: ({ ids, updates }) => prospectsApi.bulkUpdateProspects(ids, updates),
        onSuccess: () => {
            queryClient.invalidateQueries(['list-prospects', list.list_id]);
            setSelectedIds([]);
            setShowBulkEdit(false);
        },
    });

    const startEdit = (prospect) => {
        setEditingId(prospect.prospect_id);
        // The version is captured when editing starts and saved as expected_version (T-3, lib/staleVersion.js)
        setEditValues(withVersion({
            first_name: prospect.first_name || '',
            last_name: prospect.last_name || '',
            designation: prospect.designation || '',
            company_name: prospect.company_name || '',
            email: prospect.email || '',
            poc_city: prospect.poc_city || '',
            poc_state: prospect.poc_state || '',
            poc_country: prospect.poc_country || '',
            notes: prospect.notes || '',
        }, prospect));
    };

    const saveEdit = () => {
        const { notes, ...prospectFields } = editValues;
        updateMutation.mutate({ prospectId: editingId, updates: prospectFields });
        notesMutation.mutate({ prospectId: editingId, notes });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValues({});
    };

    const prospects = data?.prospects || [];
    const total = data?.total || 0;
    const pageSize = data?.page_size || 20;
    const totalPages = Math.ceil(total / pageSize);

    // Selection helpers
    const allSelected = prospects.length > 0 && prospects.every(p => selectedIds.includes(p.prospect_id));
    const someSelected = selectedIds.length > 0;

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(prev => prev.filter(id => !prospects.some(p => p.prospect_id === id)));
        } else {
            const currentPageIds = prospects.map(p => p.prospect_id);
            setSelectedIds(prev => [...new Set([...prev, ...currentPageIds])]);
        }
    };

    const toggleSelect = (prospectId) => {
        setSelectedIds(prev =>
            prev.includes(prospectId)
                ? prev.filter(id => id !== prospectId)
                : [...prev, prospectId]
        );
    };

    return {
        page, setPage, search, setSearch, editingId, setEditingId, editValues, setEditValues,
        deleteConfirmId, setDeleteConfirmId, revalidationResult, setRevalidationResult, validationMap,
        selectedIds, setSelectedIds, showBulkEdit, setShowBulkEdit, showBulkDeleteConfirm, setShowBulkDeleteConfirm,
        showAddToList, setShowAddToList, listNotice, setListNotice,
        isLoading, refetch, updateMutation, notesMutation, revalidateMutation, deleteMutation, bulkDeleteMutation,
        bulkUpdateMutation, startEdit, saveEdit, cancelEdit,
        prospects, total, pageSize, totalPages, allSelected, someSelected, toggleSelectAll, toggleSelect,
    };
}
