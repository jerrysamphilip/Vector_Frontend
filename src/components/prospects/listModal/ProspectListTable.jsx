import ProspectListRow from './ProspectListRow';
import { Loader2, Users } from 'lucide-react';

// The list's prospects table (loading / empty states).
export default function ProspectListTable({ modal }) {
    const {
        allSelected, isLoading, prospects, toggleSelectAll
    } = modal;
    return (
        <div className="flex-1 overflow-auto">
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                </div>
            ) : prospects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <Users className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="text-slate-500">No prospects found</p>
                </div>
            ) : (
                <table className="w-full text-left min-w-[1400px]">
                    <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                            {/* Checkbox column */}
                            <th className="py-3 pl-3 pr-1 w-9">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleSelectAll}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                />
                            </th>
                            {/* Valid icon column */}
                            <th className="py-3 px-2 w-8" title="Status" />
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">First Name</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Last Name</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Designation</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Company</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Email</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Location</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Note</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase text-center sticky right-0 bg-slate-50/80 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {prospects.map((prospect) => (
                            <ProspectListRow key={prospect.prospect_id} prospect={prospect} modal={modal} />
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
