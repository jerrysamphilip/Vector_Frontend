import { Check, Edit2, Save, Trash2, X as XIcon } from 'lucide-react';

// Step 3 upload: the validated rows of the uploaded file with inline edit and delete.
export default function UploadRecordsTable({ wizard }) {
    const {
        cancelUploadEdit, editableUploadRecords, handleUploadRowDelete, saveUploadEdit, setUploadEditValues,
        startUploadEdit, uploadEditValues, uploadEditingIndex
    } = wizard;
    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
                <table className="w-full text-left min-w-[700px]">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide text-center w-12">Status</th>
                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Reason</th>
                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">First Name</th>
                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Last Name</th>
                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Designation</th>
                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Company</th>
                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Email</th>
                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">City</th>
                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">State</th>
                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Country</th>
                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide text-center w-16">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {editableUploadRecords.map((record, index) => (
                            <tr
                                key={index}
                                className={`transition-colors ${uploadEditingIndex === index
                                    ? 'bg-blue-50/50'
                                    : record.status === 'REJECTED'
                                        ? 'bg-slate-50/50 hover:bg-slate-100/50'
                                        : 'hover:bg-blue-50/30'
                                    }`}
                            >
                                <td className="py-1.5 px-2 text-center">
                                    {record.status === 'ACCEPTED' ? (
                                        <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full">
                                            <Check className="w-3 h-3" />
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center justify-center w-5 h-5 bg-slate-200 text-slate-500 rounded-full">
                                            <XIcon className="w-3 h-3" />
                                        </span>
                                    )}
                                </td>
                                <td className="py-1.5 px-2">
                                    <span className="text-[10px] font-bold text-red-500">{record.reason || '-'}</span>
                                </td>
                                <td className="py-1.5 px-2">
                                    {uploadEditingIndex === index ? (
                                        <input
                                            value={uploadEditValues.first_name || ''}
                                            onChange={(e) => setUploadEditValues(v => ({ ...v, first_name: e.target.value }))}
                                            className="w-full px-1 py-0.5 border border-blue-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                            placeholder="First"
                                        />
                                    ) : (
                                        <span className="text-[11px] font-medium text-slate-800">{record.first_name || '-'}</span>
                                    )}
                                </td>
                                <td className="py-1.5 px-2">
                                    {uploadEditingIndex === index ? (
                                        <input
                                            value={uploadEditValues.last_name || ''}
                                            onChange={(e) => setUploadEditValues(v => ({ ...v, last_name: e.target.value }))}
                                            className="w-full px-1 py-0.5 border border-blue-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                            placeholder="Last"
                                        />
                                    ) : (
                                        <span className="text-[11px] font-medium text-slate-800">{record.last_name || '-'}</span>
                                    )}
                                </td>
                                <td className="py-1.5 px-2">
                                    {uploadEditingIndex === index ? (
                                        <input
                                            value={uploadEditValues.designation || ''}
                                            onChange={(e) => setUploadEditValues(v => ({ ...v, designation: e.target.value }))}
                                            className="w-full px-1 py-0.5 border border-blue-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                        />
                                    ) : (
                                        <span className="text-[11px] text-slate-600">{record.designation || '-'}</span>
                                    )}
                                </td>
                                <td className="py-1.5 px-2">
                                    {uploadEditingIndex === index ? (
                                        <input
                                            value={uploadEditValues.company_name || ''}
                                            onChange={(e) => setUploadEditValues(v => ({ ...v, company_name: e.target.value }))}
                                            className="w-full px-1 py-0.5 border border-blue-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                        />
                                    ) : (
                                        <span className="text-[11px] text-slate-600">{record.company_name || '-'}</span>
                                    )}
                                </td>
                                <td className="py-1.5 px-2">
                                    {uploadEditingIndex === index ? (
                                        <input
                                            value={uploadEditValues.email || ''}
                                            onChange={(e) => setUploadEditValues(v => ({ ...v, email: e.target.value }))}
                                            className="w-full px-1 py-0.5 border border-blue-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                        />
                                    ) : (
                                        <span className="text-[11px] text-slate-600">{record.email}</span>
                                    )}
                                </td>
                                <td className="py-1.5 px-2">
                                    {uploadEditingIndex === index ? (
                                        <input
                                            value={uploadEditValues.poc_city || ''}
                                            onChange={(e) => setUploadEditValues(v => ({ ...v, poc_city: e.target.value }))}
                                            className="w-full px-1 py-0.5 border border-blue-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                            placeholder="City"
                                        />
                                    ) : (
                                        <span className="text-[11px] text-slate-600">{record.poc_city || '-'}</span>
                                    )}
                                </td>
                                <td className="py-1.5 px-2">
                                    {uploadEditingIndex === index ? (
                                        <input
                                            value={uploadEditValues.poc_state || ''}
                                            onChange={(e) => setUploadEditValues(v => ({ ...v, poc_state: e.target.value }))}
                                            className="w-full px-1 py-0.5 border border-blue-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                            placeholder="State"
                                        />
                                    ) : (
                                        <span className="text-[11px] text-slate-600">{record.poc_state || '-'}</span>
                                    )}
                                </td>
                                <td className="py-1.5 px-2">
                                    {uploadEditingIndex === index ? (
                                        <input
                                            value={uploadEditValues.poc_country || ''}
                                            onChange={(e) => setUploadEditValues(v => ({ ...v, poc_country: e.target.value }))}
                                            className="w-full px-1 py-0.5 border border-blue-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                            placeholder="Country"
                                        />
                                    ) : (
                                        <span className="text-[11px] text-slate-600">{record.poc_country || '-'}</span>
                                    )}
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                    {uploadEditingIndex === index ? (
                                        <div className="flex gap-1 justify-center">
                                            <button
                                                type="button"
                                                onClick={saveUploadEdit}
                                                className="p-0.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                                                title="Save"
                                            >
                                                <Save className="w-3 h-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={cancelUploadEdit}
                                                className="p-0.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
                                                title="Cancel"
                                            >
                                                <XIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-1 justify-center">
                                            <button
                                                type="button"
                                                onClick={() => startUploadEdit(index)}
                                                className="p-0.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleUploadRowDelete(index)}
                                                className="p-0.5 text-rose-500 hover:bg-rose-100 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
