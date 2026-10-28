import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { prospectsApi } from '../../../api/prospects';
import { PROSPECT_PAGE_SIZE } from './constants';

// Step 3 "Select Existing List": the selected list's prospects (paged, searchable), inline edit,
// delete with confirmation, and list re-validation (per-prospect status badges).

/**
 * @param {object} opts
 * @param {string|undefined} opts.selectedListId
 * @param {boolean} opts.enabled  fetch only while step 3 shows the existing-list mode
 * @param {import('@tanstack/react-query').QueryClient} opts.queryClient
 */
export function useListProspects({ selectedListId, enabled, queryClient }) {
    const [prospectPage, setProspectPage] = useState(1);
    const [prospectSearch, setProspectSearch] = useState('');
    const [editingProspectId, setEditingProspectId] = useState(null);
    const [editProspectValues, setEditProspectValues] = useState({});
    const [deleteConfirmProspectId, setDeleteConfirmProspectId] = useState(null);
    const [validationMap, setValidationMap] = useState({});
    const [revalidationResult, setRevalidationResult] = useState(null);

    const { data: listProspectsData, isLoading: prospectsLoading, refetch: refetchProspects } = useQuery({
        queryKey: ['list-prospects', selectedListId, prospectPage, prospectSearch],
        queryFn: () => prospectsApi.getListProspects(selectedListId, {
            page: prospectPage,
            pageSize: PROSPECT_PAGE_SIZE,
            search: prospectSearch
        }),
        enabled: !!selectedListId && enabled,
    });

    const updateProspectMutation = useMutation({
        mutationFn: ({ prospectId, updates }) => prospectsApi.updateProspect(prospectId, updates),
        onSuccess: () => {
            refetchProspects();
            setEditingProspectId(null);
            setEditProspectValues({});
        },
    });

    const deleteProspectMutation = useMutation({
        mutationFn: (prospectId) => prospectsApi.deleteProspect(prospectId),
        onSuccess: () => {
            refetchProspects();
            queryClient.invalidateQueries({ queryKey: ['prospect-lists'] });
            setDeleteConfirmProspectId(null);
        },
    });

    const revalidateMutation = useMutation({
        mutationFn: (listId) => prospectsApi.revalidateList(listId),
        onSuccess: (result) => {
            setRevalidationResult(result);
            // Build validation map for quick lookup
            const map = {};
            result.results?.forEach(r => {
                map[r.prospect_id] = { status: r.status, issues: r.issues };
            });
            setValidationMap(map);
            refetchProspects();
        },
    });

    return {
        prospectPage, setProspectPage,
        prospectSearch, setProspectSearch,
        editingProspectId, setEditingProspectId,
        editProspectValues, setEditProspectValues,
        deleteConfirmProspectId, setDeleteConfirmProspectId,
        validationMap, revalidationResult,
        listProspectsData, prospectsLoading,
        updateProspectMutation, deleteProspectMutation, revalidateMutation,
    };
}
