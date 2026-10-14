import { Link } from 'react-router-dom';
import ValidationIcon from './ValidationIcon';
import { Building2, Edit2, Loader2, Mail, MapPin, Save, Trash2, X } from 'lucide-react';

// One prospect of the list: view or inline-edit mode, note, actions.
export default function ProspectListRow({ prospect, modal }) {
    const {
        cancelEdit, editValues, editingId, saveEdit, selectedIds, setDeleteConfirmId, setEditValues, startEdit,
        toggleSelect, updateMutation, validationMap
    } = modal;
    return (
        <tr
            className={`hover:bg-slate-50/50 transition-colors ${
                editingId === prospect.prospect_id ? 'bg-blue-50/50' :
                selectedIds.includes(prospect.prospect_id) ? 'bg-blue-50/30' : ''
            }`}
        >
            {editingId === prospect.prospect_id ? (
                // Edit mode
                <>
                    {/* Checkbox */}
                    <td className="py-2 pl-3 pr-1">
                        <input type="checkbox" checked disabled className="rounded border-slate-300 w-4 h-4 opacity-50" />
                    </td>
                    {/* Valid icon */}
                    <td className="py-2 px-2">
                        <ValidationIcon prospectId={prospect.prospect_id} validationMap={validationMap} prospect={prospect} />
                    </td>
                    <td className="py-2 px-4">
                        <input
                            value={editValues.first_name}
                            onChange={(e) => setEditValues(v => ({ ...v, first_name: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="First"
                        />
                    </td>
                    <td className="py-2 px-4">
                        <input
                            value={editValues.last_name}
                            onChange={(e) => setEditValues(v => ({ ...v, last_name: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Last"
                        />
                    </td>
                    <td className="py-2 px-4">
                        <input
                            value={editValues.designation}
                            onChange={(e) => setEditValues(v => ({ ...v, designation: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Designation"
                        />
                    </td>
                    <td className="py-2 px-4">
                        <input
                            value={editValues.company_name}
                            onChange={(e) => setEditValues(v => ({ ...v, company_name: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </td>
                    <td className="py-2 px-4">
                        <input
                            value={editValues.email}
                            onChange={(e) => setEditValues(v => ({ ...v, email: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </td>
                    <td className="py-2 px-4">
                        <div className="flex gap-1">
                            <input
                                value={editValues.poc_city}
                                onChange={(e) => setEditValues(v => ({ ...v, poc_city: e.target.value }))}
                                className="w-20 px-2 py-1.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="City"
                            />
                            <input
                                value={editValues.poc_state}
                                onChange={(e) => setEditValues(v => ({ ...v, poc_state: e.target.value }))}
                                className="w-14 px-2 py-1.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="State"
                            />
                            <input
                                value={editValues.poc_country}
                                onChange={(e) => setEditValues(v => ({ ...v, poc_country: e.target.value }))}
                                className="w-20 px-2 py-1.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Country"
                            />
                        </div>
                    </td>
                    <td className="py-2 px-4">
                        <input
                            type="text"
                            value={editValues.notes}
                            onChange={(e) => setEditValues(v => ({ ...v, notes: e.target.value }))}
                            className="w-full min-w-[220px] px-2.5 py-1.5 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:italic placeholder:text-slate-400 transition-all"
                            placeholder="Add a note..."
                        />
                    </td>
                    <td className="py-2 px-4 text-center sticky right-0 bg-white shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                        <div className="flex gap-1 justify-center">
                            <button
                                onClick={saveEdit}
                                disabled={updateMutation.isLoading}
                                className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                title="Save"
                            >
                                {updateMutation.isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                            </button>
                            <button
                                onClick={cancelEdit}
                                className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                title="Cancel"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </>
            ) : (
                // View mode
                <>
                    {/* Checkbox */}
                    <td className="py-3 pl-3 pr-1">
                        <input
                            type="checkbox"
                            checked={selectedIds.includes(prospect.prospect_id)}
                            onChange={() => toggleSelect(prospect.prospect_id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                    </td>
                    {/* Valid icon */}
                    <td className="py-3 px-2">
                        <ValidationIcon prospectId={prospect.prospect_id} validationMap={validationMap} prospect={prospect} />
                    </td>
                    <td className="py-3 px-4">
                        <Link to={`/app/contacts/${prospect.prospect_id}`} title="Open contact"
                            className="text-sm font-normal text-indigo-600 hover:text-indigo-800 hover:underline">
                            {prospect.first_name || '-'}
                        </Link>
                    </td>
                    <td className="py-3 px-4">
                        <p className="text-sm font-normal text-slate-600">
                            {prospect.last_name || '-'}
                        </p>
                    </td>
                    <td className="py-3 px-4">
                        <span className="text-sm text-slate-600">{prospect.designation || '-'}</span>
                    </td>
                    <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-600">{prospect.company_name || '-'}</span>
                        </div>
                    </td>
                    <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-600">{prospect.email}</span>
                        </div>
                    </td>
                    <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-600">
                                {[prospect.poc_city, prospect.poc_state, prospect.poc_country].filter(Boolean).join(', ') || '-'}
                            </span>
                        </div>
                    </td>
                    <td className="py-3 px-4">
                        <span className="text-sm text-slate-500 italic">
                            {prospect.notes || '—'}
                        </span>
                    </td>
                    <td className="py-3 px-4 text-center sticky right-0 bg-white shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                        <div className="flex gap-1 justify-center">
                            <button
                                onClick={() => startEdit(prospect)}
                                className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                                title="Edit"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setDeleteConfirmId(prospect.prospect_id)}
                                className="p-1.5 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </>
            )}
        </tr>
    );
}
