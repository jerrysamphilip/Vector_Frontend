import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    ArrowLeft,
    Check,
    X,
    AlertCircle,
    Edit2,
    Trash2,
    Loader2,
    Save,
    RefreshCw,
} from 'lucide-react';
import PageTransition from '../components/layout/PageTransition';
import { apiClient as api } from '../api/http';

export default function ProspectValidate() {
    const navigate = useNavigate();
    const location = useLocation();
    const [data, setData] = useState(null);
    const [records, setRecords] = useState([]);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [confirming, setConfirming] = useState(false);
    const [revalidating, setRevalidating] = useState(false);
    const [error, setError] = useState(null);

    // Load data from React Router navigation state (avoids sessionStorage 5 MB quota).
    // If the user refreshes, location.state is lost — redirect them back gracefully.
    useEffect(() => {
        const state = location.state;
        if (!state) {
            navigate('/app/prospects');
            return;
        }
        setData(state);
        setRecords(state.records || []);
    }, [location.state, navigate]);

    // Handle record edit
    const startEdit = (index) => {
        setEditingIndex(index);
        const record = records[index];
        setEditValues({
            ...record
        });
    };

    const saveEdit = async () => {
        const updated = [...records];
        updated[editingIndex] = {
            ...editValues
        };
        setEditingIndex(null);
        setEditValues({});

        // Re-run backend validation on the edited set so a changed email that
        // now duplicates another accepted row (or fixes/breaks a rejection)
        // gets its status recomputed before it can reach Confirm Upload.
        setRevalidating(true);
        setError(null);
        try {
            const res = await api.post(`/uploads/${data.upload_id}/revalidations`, { records: updated });
            setRecords(res.data.records || updated);
        } catch (err) {
            setError(err.response?.data?.detail || err.message);
            setRecords(updated);
        } finally {
            setRevalidating(false);
        }
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditValues({});
    };

    const deleteRecord = (index) => {
        setRecords(prev => prev.filter((_, i) => i !== index));
    };

    // Revalidate records
    const handleRevalidate = async () => {
        if (!data) return;

        setRevalidating(true);
        setError(null);

        try {
            const res = await api.post(`/uploads/${data.upload_id}/revalidations`, { records });
            const result = res.data;
            setRecords(result.records || []);
        } catch (err) {
            setError(err.response?.data?.detail || err.message);
        } finally {
            setRevalidating(false);
        }
    };

    // Confirm upload
    const handleConfirm = async () => {
        if (!data) return;

        setConfirming(true);
        setError(null);

        try {
            await api.post(`/uploads/${data.upload_id}/confirmations`, {
                    upload_id: data.upload_id,
                    title: data.title,
                    records: records.filter(r => r.status === 'ACCEPTED'),
            });
            navigate('/app/prospects', { replace: true });
        } catch (err) {
            setError(err.response?.data?.detail || err.message);
        } finally {
            setConfirming(false);
        }
    };

    if (!data) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
            </div>
        );
    }

    const acceptedCount = records.filter(r => r.status === 'ACCEPTED').length;
    const rejectedCount = records.filter(r => r.status === 'REJECTED').length;

    return (
        <PageTransition>
            <div className="space-y-6 min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/app/prospects')}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Validate Prospects</h1>
                            <p className="text-sm text-slate-500">{data.title}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRevalidate}
                            disabled={revalidating || confirming}
                            className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 rounded-lg text-sm font-semibold hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] btn-pulse active:ring-2 active:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center gap-2"
                        >
                            {revalidating ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Revalidating...</>
                            ) : (
                                <><RefreshCw className="w-4 h-4" /> Revalidate</>
                            )}
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={confirming || revalidating || acceptedCount === 0}
                            className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 rounded-lg text-sm font-semibold hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] btn-pulse active:ring-2 active:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center gap-2"
                        >
                            {confirming ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Confirming...</>
                            ) : (
                                <><Check className="w-4 h-4" /> Confirm Upload ({acceptedCount})</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Summary */}
                <div className="flex gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-2">
                        <Check className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">{acceptedCount} Accepted</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-2">
                        <X className="w-5 h-5 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600">{rejectedCount} Needs Attention</span>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-rose-600" />
                        <span className="text-sm text-rose-700">{error}</span>
                    </div>
                )}

                {/* Records Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
                    <div className="overflow-x-scroll">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                                    <th className="py-2.5 px-3 text-[11px] font-semibold text-blue-700 uppercase tracking-wide text-center w-16 whitespace-nowrap sticky left-0 bg-blue-50 z-20">Status</th>
                                    <th className="py-2.5 px-3 text-[11px] font-semibold text-blue-700 uppercase tracking-wide whitespace-nowrap sticky left-[64px] bg-blue-50 z-20">First Name</th>
                                    <th className="py-2.5 px-3 text-[11px] font-semibold text-blue-700 uppercase tracking-wide whitespace-nowrap sticky left-[160px] bg-blue-50 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">Last Name</th>
                                    <th className="py-2.5 px-3 text-[11px] font-semibold text-blue-700 uppercase tracking-wide whitespace-nowrap">Designation</th>
                                    <th className="py-2.5 px-3 text-[11px] font-semibold text-blue-700 uppercase tracking-wide whitespace-nowrap">Company</th>
                                    <th className="py-2.5 px-3 text-[11px] font-semibold text-blue-700 uppercase tracking-wide whitespace-nowrap">Email</th>
                                    <th className="py-2.5 px-3 text-[11px] font-semibold text-blue-700 uppercase tracking-wide whitespace-nowrap">Location</th>
                                    <th className="py-2.5 px-3 text-[11px] font-semibold text-blue-700 uppercase tracking-wide whitespace-nowrap">Country</th>
                                    <th className="py-2.5 px-3 text-[11px] font-semibold text-blue-700 uppercase tracking-wide whitespace-nowrap">Reason</th>
                                    <th className="py-2.5 px-3 text-[11px] font-semibold text-blue-700 uppercase tracking-wide text-center w-20 whitespace-nowrap sticky right-0 bg-indigo-50 shadow-[-2px_0_4px_rgba(0,0,0,0.06)] z-10">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {records.map((record, index) => (
                                    <tr
                                        key={index}
                                        className={`transition-colors ${editingIndex === index
                                            ? 'bg-blue-50/50'
                                            : record.status === 'REJECTED'
                                                ? 'bg-slate-50/50 hover:bg-slate-100/50'
                                                : 'hover:bg-blue-50/30'
                                            }`}
                                    >
                                        <td className="py-2 px-3 text-center sticky left-0 bg-white z-10">
                                            {record.status === 'ACCEPTED' ? (
                                                <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full">
                                                    <Check className="w-3.5 h-3.5" />
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-200 text-slate-500 rounded-full">
                                                    <X className="w-3.5 h-3.5" />
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2 px-3 sticky left-[64px] bg-white z-10">
                                            {editingIndex === index ? (
                                                <input
                                                    value={editValues.first_name || ''}
                                                    onChange={(e) => setEditValues(v => ({ ...v, first_name: e.target.value }))}
                                                    className="w-full px-1.5 py-1 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                    placeholder="First"
                                                />
                                            ) : (
                                                <span className="text-xs font-medium text-slate-800">{record.first_name || '-'}</span>
                                            )}
                                        </td>
                                        <td className="py-2 px-3 sticky left-[160px] bg-white z-10 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">
                                            {editingIndex === index ? (
                                                <input
                                                    value={editValues.last_name || ''}
                                                    onChange={(e) => setEditValues(v => ({ ...v, last_name: e.target.value }))}
                                                    className="w-full px-1.5 py-1 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                    placeholder="Last"
                                                />
                                            ) : (
                                                <span className="text-xs font-medium text-slate-800">{record.last_name || '-'}</span>
                                            )}
                                        </td>
                                        <td className="py-2 px-3">
                                            {editingIndex === index ? (
                                                <input
                                                    value={editValues.designation || ''}
                                                    onChange={(e) => setEditValues(v => ({ ...v, designation: e.target.value }))}
                                                    className="w-full px-1.5 py-1 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                />
                                            ) : (
                                                <span className="text-xs text-slate-600">{record.designation || '-'}</span>
                                            )}
                                        </td>
                                        <td className="py-2 px-3">
                                            {editingIndex === index ? (
                                                <input
                                                    value={editValues.company_name || ''}
                                                    onChange={(e) => setEditValues(v => ({ ...v, company_name: e.target.value }))}
                                                    className="w-full px-1.5 py-1 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                />
                                            ) : (
                                                <span className="text-xs text-slate-600">{record.company_name || '-'}</span>
                                            )}
                                        </td>
                                        <td className="py-2 px-3">
                                            {editingIndex === index ? (
                                                <input
                                                    value={editValues.email || ''}
                                                    onChange={(e) => setEditValues(v => ({ ...v, email: e.target.value }))}
                                                    className="w-full px-1.5 py-1 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                />
                                            ) : (
                                                <span className="text-xs text-slate-600">{record.email}</span>
                                            )}
                                        </td>
                                        <td className="py-2 px-3">
                                            {editingIndex === index ? (
                                                <div className="flex gap-1">
                                                    <input
                                                        value={editValues.poc_city || ''}
                                                        onChange={(e) => setEditValues(v => ({ ...v, poc_city: e.target.value }))}
                                                        className="w-16 px-1.5 py-1 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                        placeholder="City"
                                                    />
                                                    <input
                                                        value={editValues.poc_state || ''}
                                                        onChange={(e) => setEditValues(v => ({ ...v, poc_state: e.target.value }))}
                                                        className="w-12 px-1.5 py-1 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                        placeholder="State"
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-600">{[record.poc_city, record.poc_state].filter(Boolean).join(', ') || '-'}</span>
                                            )}
                                        </td>
                                        <td className="py-2 px-3">
                                            {editingIndex === index ? (
                                                <input
                                                    value={editValues.poc_country || ''}
                                                    onChange={(e) => setEditValues(v => ({ ...v, poc_country: e.target.value }))}
                                                    className="w-full px-1.5 py-1 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                    placeholder="Country"
                                                />
                                            ) : (
                                                <span className="text-xs text-slate-600">{record.poc_country || '-'}</span>
                                            )}
                                        </td>
                                        <td className="py-2 px-3">
                                            <span className="text-[11px] text-slate-500 italic">{record.reason || '-'}</span>
                                        </td>
                                        <td className="py-2 px-3 text-center sticky right-0 bg-white shadow-[-2px_0_4px_rgba(0,0,0,0.06)] z-10">
                                            {editingIndex === index ? (
                                                <div className="flex gap-1 justify-center">
                                                    <button
                                                        onClick={saveEdit}
                                                        className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                                                        title="Save"
                                                    >
                                                        <Save className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="p-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
                                                        title="Cancel"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-1 justify-center">
                                                    <button
                                                        onClick={() => startEdit(index)}
                                                        className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteRecord(index)}
                                                        className="p-1 text-rose-500 hover:bg-rose-100 rounded transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
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
            </div>
        </PageTransition>
    );
}
