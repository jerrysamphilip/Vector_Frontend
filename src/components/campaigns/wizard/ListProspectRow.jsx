import { AlertTriangle, Check, Edit2, Loader2, ShieldCheck, Trash2, XCircle, X as XIcon } from 'lucide-react';

// Step 3: one prospect of the selected list - include checkbox, inline edit, validation status, delete.
export default function ListProspectRow({ prospect, wizard }) {
    const {
        editProspectValues, editingProspectId, excludedProspectIds, setDeleteConfirmProspectId,
        setEditProspectValues, setEditingProspectId, setExcludedProspectIds, updateProspectMutation, validationMap
    } = wizard;
    const isEditing = editingProspectId === prospect.prospect_id;
    const validation = validationMap[prospect.prospect_id];

    return (
        <tr className="hover:bg-slate-50">
            {/* Selection checkbox */}
            <td className="px-4 py-3">
                <input
                    type="checkbox"
                    checked={!excludedProspectIds.includes(prospect.prospect_id)}
                    onChange={() => {
                        setExcludedProspectIds(prev => prev.includes(prospect.prospect_id)
                            ? prev.filter(id => id !== prospect.prospect_id)
                            : [...prev, prospect.prospect_id]
                        );
                    }}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
            </td>
            {/* First Name */}
            <td className="px-4 py-3">
                {isEditing ? (
                    <input
                        type="text"
                        value={editProspectValues.first_name || ''}
                        onChange={(e) => setEditProspectValues({ ...editProspectValues, first_name: e.target.value })}
                        className="w-full px-2 py-1 text-xs border rounded"
                        placeholder="First"
                    />
                ) : (
                    <span className="font-medium text-slate-900">
                        {prospect.first_name || '-'}
                    </span>
                )}
            </td>
            {/* Last Name */}
            <td className="px-4 py-3">
                {isEditing ? (
                    <input
                        type="text"
                        value={editProspectValues.last_name || ''}
                        onChange={(e) => setEditProspectValues({ ...editProspectValues, last_name: e.target.value })}
                        className="w-full px-2 py-1 text-xs border rounded"
                        placeholder="Last"
                    />
                ) : (
                    <span className="font-medium text-slate-900">
                        {prospect.last_name || '-'}
                    </span>
                )}
            </td>
            {/* Designation */}
            <td className="px-4 py-3">
                {isEditing ? (
                    <input
                        type="text"
                        value={editProspectValues.designation || ''}
                        onChange={(e) => setEditProspectValues({ ...editProspectValues, designation: e.target.value })}
                        className="w-full px-2 py-1 text-xs border rounded"
                    />
                ) : (
                    <span className="text-slate-600">{prospect.designation || '-'}</span>
                )}
            </td>
            {/* Company */}
            <td className="px-4 py-3">
                {isEditing ? (
                    <input
                        type="text"
                        value={editProspectValues.company_name || ''}
                        onChange={(e) => setEditProspectValues({ ...editProspectValues, company_name: e.target.value })}
                        className="w-full px-2 py-1 text-xs border rounded"
                    />
                ) : (
                    <span className="text-slate-600">{prospect.company_name || '-'}</span>
                )}
            </td>
            {/* Email */}
            <td className="px-4 py-3">
                {isEditing ? (
                    <input
                        type="email"
                        value={editProspectValues.email || ''}
                        onChange={(e) => setEditProspectValues({ ...editProspectValues, email: e.target.value })}
                        className="w-full px-2 py-1 text-xs border rounded"
                    />
                ) : (
                    <span className="text-slate-600">{prospect.email}</span>
                )}
            </td>
            {/* City */}
            <td className="px-4 py-3">
                {isEditing ? (
                    <input
                        type="text"
                        value={editProspectValues.poc_city || ''}
                        onChange={(e) => setEditProspectValues({ ...editProspectValues, poc_city: e.target.value })}
                        className="w-full px-2 py-1 text-xs border rounded"
                        placeholder="City"
                    />
                ) : (
                    <span className="text-slate-600">{prospect.poc_city || '-'}</span>
                )}
            </td>
            {/* State */}
            <td className="px-4 py-3">
                {isEditing ? (
                    <input
                        type="text"
                        value={editProspectValues.poc_state || ''}
                        onChange={(e) => setEditProspectValues({ ...editProspectValues, poc_state: e.target.value })}
                        className="w-full px-2 py-1 text-xs border rounded"
                        placeholder="State"
                    />
                ) : (
                    <span className="text-slate-600">{prospect.poc_state || '-'}</span>
                )}
            </td>
            {/* Country */}
            <td className="px-4 py-3">
                {isEditing ? (
                    <input
                        type="text"
                        value={editProspectValues.poc_country || ''}
                        onChange={(e) => setEditProspectValues({ ...editProspectValues, poc_country: e.target.value })}
                        className="w-full px-2 py-1 text-xs border rounded"
                        placeholder="Country"
                    />
                ) : (
                    <span className="text-slate-600">{prospect.poc_country || '-'}</span>
                )}
            </td>
            {/* Status */}
            <td className="px-4 py-3">
                {validation ? (
                    <div className="flex items-center gap-1.5">
                        {validation.status === 'valid' && (
                            <span className="flex items-center gap-1 text-emerald-600 text-xs">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Valid
                            </span>
                        )}
                        {validation.status === 'warning' && (
                            <span className="flex items-center gap-1 text-amber-600 text-xs" title={validation.issues?.join(', ')}>
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Warning
                            </span>
                        )}
                        {validation.status === 'invalid' && (
                            <span className="flex items-center gap-1 text-red-600 text-xs" title={validation.issues?.join(', ')}>
                                <XCircle className="w-3.5 h-3.5" />
                                Invalid
                            </span>
                        )}
                    </div>
                ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${prospect.consent_status === 'SUBSCRIBED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : prospect.consent_status === 'UNSUBSCRIBED'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                        {prospect.consent_status || 'Unknown'}
                    </span>
                )}
            </td>
            {/* Actions */}
            <td className="px-4 py-3 text-right">
                {isEditing ? (
                    <div className="flex items-center justify-end gap-1">
                        <button
                            onClick={() => updateProspectMutation.mutate({
                                prospectId: prospect.prospect_id,
                                updates: editProspectValues
                            })}
                            disabled={updateProspectMutation.isPending}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                            {updateProspectMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                        </button>
                        <button
                            onClick={() => {
                                setEditingProspectId(null);
                                setEditProspectValues({});
                            }}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-end gap-1">
                        <button
                            onClick={() => {
                                setEditingProspectId(prospect.prospect_id);
                                setEditProspectValues({
                                    first_name: prospect.first_name,
                                    last_name: prospect.last_name,
                                    email: prospect.email,
                                    company_name: prospect.company_name,
                                    designation: prospect.designation,
                                    poc_city: prospect.poc_city,
                                    poc_state: prospect.poc_state,
                                });
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setDeleteConfirmProspectId(prospect.prospect_id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </td>
        </tr>
    );
}
