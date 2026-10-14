import { Button } from '../../ui/Button';
import ListProspectRow from './ListProspectRow';
import DeleteProspectDialog from './DeleteProspectDialog';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, Users } from 'lucide-react';

// Step 3: the selected list's prospects - revalidate, search, include/exclude contacts, edit, delete, paging.
export default function ListProspectsPanel({ wizard }) {
    const {
        excludedProspectIds, listProspectsData, prospectPage, prospectSearch, prospectsLoading, revalidateMutation,
        revalidationResult, selectedLists, setExcludedProspectIds, setProspectPage, setProspectSearch
    } = wizard;
    return (
        <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
            {/* Header with Revalidate Button */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">
                        {listProspectsData?.list_name || 'Prospects'}
                    </span>
                    <span className="text-xs text-slate-400">
                        ({listProspectsData?.total || 0} total)
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {revalidationResult && (
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-emerald-600 font-medium">{revalidationResult.valid_count} valid</span>
                            {revalidationResult.warning_count > 0 && (
                                <span className="text-amber-600 font-medium">{revalidationResult.warning_count} warnings</span>
                            )}
                            {revalidationResult.invalid_count > 0 && (
                                <span className="text-red-600 font-medium">{revalidationResult.invalid_count} invalid</span>
                            )}
                        </div>
                    )}
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => revalidateMutation.mutate(selectedLists[0])}
                        disabled={revalidateMutation.isPending}
                        className="h-8 text-xs"
                    >
                        {revalidateMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                            <RefreshCw className="w-3 h-3 mr-1" />
                        )}
                        Revalidate
                    </Button>
                </div>
            </div>

            {/* Search + Selection Summary */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200">
                <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search contacts..."
                        value={prospectSearch}
                        onChange={(e) => { setProspectSearch(e.target.value); setProspectPage(1); }}
                        className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all placeholder:text-slate-400"
                    />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                    <span>
                        {(listProspectsData?.total || 0) - excludedProspectIds.length} of {listProspectsData?.total || 0} contacts selected
                    </span>
                    {excludedProspectIds.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setExcludedProspectIds([])}
                            className="font-semibold text-blue-600 hover:text-blue-700"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Prospect Table */}
            {prospectsLoading ? (
                <div className="py-12 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-2 w-9">
                                        <input
                                            type="checkbox"
                                            checked={(listProspectsData?.prospects?.length || 0) > 0 && listProspectsData.prospects.every(p => !excludedProspectIds.includes(p.prospect_id))}
                                            onChange={() => {
                                                const pageIds = (listProspectsData?.prospects || []).map(p => p.prospect_id);
                                                const pageAllSelected = pageIds.every(id => !excludedProspectIds.includes(id));
                                                setExcludedProspectIds(prev => pageAllSelected
                                                    ? [...new Set([...prev, ...pageIds])]
                                                    : prev.filter(id => !pageIds.includes(id))
                                                );
                                            }}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">First Name</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Last Name</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Designation</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Company</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">City</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">State</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Country</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {listProspectsData?.prospects?.map((prospect) => (
                                    <ListProspectRow key={prospect.prospect_id} prospect={prospect} wizard={wizard} />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {listProspectsData?.total > 10 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                            <span className="text-xs text-slate-500">
                                Page {prospectPage} of {Math.ceil((listProspectsData?.total || 0) / 10)}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setProspectPage(p => Math.max(1, p - 1))}
                                    disabled={prospectPage === 1}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded disabled:opacity-30"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setProspectPage(p => p + 1)}
                                    disabled={prospectPage >= Math.ceil((listProspectsData?.total || 0) / 10)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded disabled:opacity-30"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Delete Confirmation Modal */}
            <DeleteProspectDialog wizard={wizard} />
        </div>
    );
}
