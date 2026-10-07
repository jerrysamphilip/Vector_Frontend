import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Search, Upload, Loader2, X, FileSpreadsheet,
    ChevronLeft, ChevronRight, Trash2, Users, AlertTriangle,
    UserCheck, UserX, Target, Plus, CheckCircle2, ShieldCheck,
    TrendingUp, TrendingDown,
} from 'lucide-react';
import { prospectsApi } from '../api/prospects';
import { apiClient as api } from '../api/http';
import { getStoredUser } from '../lib/authStorage';
import Loading from '../components/common/Loading';
import ProspectListsTable from '../components/prospects/ProspectListsTable';
import ProspectListModal from '../components/prospects/ProspectListModal';
import BouncedRevalidationModal from '../components/prospects/BouncedRevalidationModal';

// ── Sparklines ───────────────────────────────────────────────────
function BarSparkline({ color = '#fff', animKey = 0 }) {
    const bars = [40, 65, 50, 80, 60, 90, 70, 85, 55, 75];
    return (
        <svg width="80" height="32" viewBox="0 0 80 32">
            {bars.map((h, i) => (
                <rect key={`${animKey}-${i}`} x={i * 8 + 1} y={32 - h * 0.3}
                    width="5" height={h * 0.3} rx="2"
                    fill={color} opacity="0.55"
                    className="spark-bar"
                    style={{ animationDelay: `${i * 55}ms` }} />
            ))}
        </svg>
    );
}

function WaveSparkline({ color = '#fff', animKey = 0 }) {
    return (
        <svg width="80" height="32" viewBox="0 0 80 32">
            <path key={animKey}
                d="M0,24 C10,20 15,8 25,12 C35,16 40,6 50,10 C60,14 65,4 80,8"
                fill="none" stroke={color} strokeWidth="2.5"
                strokeLinecap="round" opacity="0.7"
                className="spark-wave" />
        </svg>
    );
}

// ── GradientCard ─────────────────────────────────────────────────
function GradientCard({ label, value, sub, from, to, dark = false, chart = 'bar', trend, animDelay = '0ms', loading }) {
    const [animKey, setAnimKey] = useState(0);
    const mountedRef = useRef(false);
    useEffect(() => {
        if (!mountedRef.current) {
            mountedRef.current = true;
            const t = setTimeout(() => setAnimKey(k => k + 1), 100);
            return () => clearTimeout(t);
        }
    }, []);
    const textColor = dark ? '#1a1a1a' : '#ffffff';
    const subColor  = dark ? 'rgba(26,26,26,0.6)' : 'rgba(255,255,255,0.7)';
    return (
        <div className="card-anim relative rounded-2xl p-5 overflow-hidden flex flex-col justify-between"
            style={{ background: `linear-gradient(135deg, ${from}, ${to})`, minHeight: 130, animationDelay: animDelay }}
            onMouseEnter={() => setAnimKey(k => k + 1)}>
            <div className="absolute inset-0 opacity-10"
                style={{ background: 'radial-gradient(circle at 80% 20%, #fff 0%, transparent 60%)' }} />
            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: subColor }}>{label}</p>
                    {loading
                        ? <div className="h-8 w-16 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.25)' }} />
                        : <p className="text-3xl font-bold leading-none" style={{ color: textColor }}>
                            {(value ?? 0).toLocaleString()}
                          </p>
                    }
                    <p className="text-[12px] mt-1.5 font-medium" style={{ color: subColor }}>{sub}</p>
                </div>
                {trend !== undefined && (
                    <span className="mt-1" style={{ color: textColor, opacity: 0.75 }}>
                        {trend ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </span>
                )}
            </div>
            <div className="relative z-10 mt-3">
                {chart === 'bar'
                    ? <BarSparkline color={textColor} animKey={animKey} />
                    : <WaveSparkline color={textColor} animKey={animKey} />}
            </div>
        </div>
    );
}

// ── File Drop Zone ────────────────────────────────────────────────
function DropZone({ file, onFile }) {
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef(null);

    const onDrop = e => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
    };

    return (
        <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className="relative flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all select-none"
            style={{
                borderColor: dragging ? '#2d6bbf' : file ? '#10b981' : '#e5e7eb',
                background: dragging ? 'rgba(45,107,191,0.05)' : file ? 'rgba(16,185,129,0.04)' : '#fafaf9',
            }}
        >
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv"
                onChange={e => onFile(e.target.files?.[0] || null)} className="hidden" />

            {file ? (
                <>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-gray-800">{file.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button type="button"
                        onClick={e => { e.stopPropagation(); onFile(null); }}
                        className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </>
            ) : (
                <>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.1), rgba(115,200,210,0.1))' }}>
                        <FileSpreadsheet className="w-6 h-6" style={{ color: '#2d6bbf' }} />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-gray-700">
                            {dragging ? 'Drop it here' : 'Drop file or click to browse'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">.xlsx, .xls or .csv · Max 10 MB</p>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Upload Modal ──────────────────────────────────────────────────
function UploadModal({ onClose }) {
    const navigate = useNavigate();
    const [name, setName]     = useState('');
    const [file, setFile]     = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState(null);

    const handleSubmit = async () => {
        if (!name.trim()) { setError('Give this list a name'); return; }
        if (!file)        { setError('Select a file to upload'); return; }
        setError(null);
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/uploads/validations', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            // Pass data via React Router navigation state to avoid sessionStorage
            // 5 MB quota limit which breaks on large files (10k+ rows).
            onClose();
            navigate('/app/prospects/validate', {
                state: { ...res.data, title: name },
            });
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Upload failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                onClick={e => e.stopPropagation()}>

                {/* Gradient top bar */}
                <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #2d6bbf, #73C8D2)' }} />

                <div className="px-6 pt-5 pb-2 flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">New Prospect List</h2>
                        <p className="text-sm text-gray-400 mt-0.5">Upload contacts from a spreadsheet</p>
                    </div>
                    <button onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-6 py-4 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                            List Name
                        </label>
                        <input
                            type="text" value={name} onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                            placeholder="e.g., Q2 SaaS Decision Makers"
                            className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium placeholder:text-gray-400 text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-2 transition-all"
                            style={{ '--tw-ring-color': 'rgba(45,107,191,0.15)' }}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                            File
                        </label>
                        <DropZone file={file} onFile={setFile} />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                <div className="px-6 pb-6 flex gap-2.5">
                    <button onClick={onClose}
                        className="flex-1 h-11 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={loading}
                        className="flex-1 h-11 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                        {loading
                            ? <><Loader2 className="w-4 h-4 animate-spin" />Validating…</>
                            : <><Upload className="w-4 h-4" />Validate & Continue</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Delete Confirm Modal ──────────────────────────────────────────
function DeleteModal({ title, message, onConfirm, onCancel, loading }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6"
                onClick={e => e.stopPropagation()}>
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-center font-bold text-gray-800 mb-1">{title}</h3>
                <p className="text-center text-sm text-gray-500 mb-5">{message}</p>
                <div className="flex gap-2.5">
                    <button onClick={onCancel}
                        className="flex-1 h-10 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm} disabled={loading}
                        className="flex-1 h-10 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function Prospects() {
    const queryClient = useQueryClient();
    const currentUser = getStoredUser();
    const canRevalidateBounced = ['SUPER_ADMIN', 'ADMIN'].includes(currentUser?.role);

    const [search, setSearch]           = useState('');
    const [page, setPage]               = useState(1);
    const [sortBy, setSortBy]           = useState('uploaded_at');
    const [sortOrder, setSortOrder]     = useState('desc');
    const [selectedIds, setSelectedIds] = useState([]);
    const [viewList, setViewList]       = useState(null);
    const [deleteList, setDeleteList]   = useState(null);
    const [showBulkDelete, setShowBulkDelete] = useState(false);
    const [showUpload, setShowUpload]   = useState(false);
    const [showBouncedRevalidation, setShowBouncedRevalidation] = useState(false);

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['prospect-stats'],
        queryFn: prospectsApi.getStats,
    });

    const { data: listsData, isLoading: listsLoading } = useQuery({
        queryKey: ['prospect-lists', page, search, sortBy, sortOrder],
        queryFn: () => prospectsApi.getLists({ page, search, sortBy, sortOrder }),
    });

    const deleteMutation = useMutation({
        mutationFn: id => prospectsApi.deleteList(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prospect-lists'] });
            queryClient.invalidateQueries({ queryKey: ['prospect-stats'] });
            setDeleteList(null);
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async ids => { for (const id of ids) await prospectsApi.deleteList(id); },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prospect-lists'] });
            queryClient.invalidateQueries({ queryKey: ['prospect-stats'] });
            setSelectedIds([]);
            setShowBulkDelete(false);
        },
    });

    const lists      = listsData?.items || [];
    const total      = listsData?.total || 0;
    const pageSize   = listsData?.page_size || 20;
    const totalPages = Math.ceil(total / pageSize);

    if (statsLoading && listsLoading) {
        return <Loading text="Loading prospects..." size="lg" fullScreen/>;
    }

    return (
        <div className="w-full space-y-6">

            {/* ── Page Header ── */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Prospect Lists</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        {total > 0
                            ? `${total.toLocaleString()} list${total !== 1 ? 's' : ''} · ${(stats?.total ?? 0).toLocaleString()} total contacts`
                            : 'Upload and manage your contact lists'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {canRevalidateBounced && (
                        <button
                            onClick={() => setShowBouncedRevalidation(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors whitespace-nowrap"
                            title="Admin-only hard bounce revalidation"
                        >
                            <ShieldCheck className="w-4 h-4" />
                            Revalidate Bounced
                        </button>
                    )}
                    <button
                        onClick={() => setShowUpload(true)}
                        className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                        <Plus className="w-4 h-4" />
                        New List
                    </button>
                </div>
            </div>

            {/* ── Gradient Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <GradientCard
                    label="Total Contacts"
                    value={stats?.total}
                    sub="across all lists"
                    from="#2d6bbf" to="#1f56aa"
                    chart="bar" trend={stats?.total > 0}
                    animDelay="0ms" loading={statsLoading}
                />
                <GradientCard
                    label="In Campaigns"
                    value={stats?.available}
                    sub="actively enrolled"
                    from="#F5F1DC" to="#e8e3c0"
                    dark chart="wave" trend={stats?.available > 0}
                    animDelay="80ms" loading={statsLoading}
                />
                <GradientCard
                    label="Not In Campaigns"
                    value={stats?.active}
                    sub="ready to contact"
                    from="#FF9013" to="#cc6f00"
                    chart="bar" trend={stats?.active > 0}
                    animDelay="160ms" loading={statsLoading}
                />
                <GradientCard
                    label="Opted Out"
                    value={stats?.opted_out}
                    sub="unsubscribed contacts"
                    from="#73C8D2" to="#4db0bb"
                    chart="wave" trend={stats?.opted_out === 0}
                    animDelay="240ms" loading={statsLoading}
                />
            </div>

            {/* ── Lists Panel ── */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

                {/* Section header */}
                <div className="flex items-center justify-between px-5 py-4 flex-wrap gap-3"
                    style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}>

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}>
                            <Users className="w-4 h-4" style={{ color: '#2d6bbf' }} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-800">Contact Lists</p>
                            <p className="text-xs text-gray-400">
                                {total > 0 ? `${total} list${total !== 1 ? 's' : ''}` : 'No lists yet'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                        {/* Search */}
                        <div className="relative max-w-xs w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                            <input
                                type="text" placeholder="Search lists…"
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                className="w-full h-9 pl-9 pr-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 transition-all placeholder:text-gray-400"
                                style={{ '--tw-ring-color': 'rgba(45,107,191,0.15)' }}
                            />
                        </div>

                        {/* Bulk delete bar */}
                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-2 px-3 h-9 rounded-xl border shrink-0"
                                style={{ background: 'rgba(45,107,191,0.06)', borderColor: 'rgba(45,107,191,0.2)' }}>
                                <span className="text-xs font-semibold" style={{ color: '#2d6bbf' }}>
                                    {selectedIds.length} selected
                                </span>
                                <div className="w-px h-4 bg-gray-200" />
                                <button onClick={() => setShowBulkDelete(true)}
                                    className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete
                                </button>
                                <button onClick={() => setSelectedIds([])}
                                    className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Table */}
                <ProspectListsTable
                    lists={lists}
                    isLoading={listsLoading}
                    onView={setViewList}
                    onDelete={setDeleteList}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={(col, ord) => { setSortBy(col); setSortOrder(ord); setPage(1); }}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    onUpload={() => setShowUpload(true)}
                />

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                            {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of{' '}
                            <span className="font-medium text-gray-700">{total.toLocaleString()}</span>
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-3 text-xs font-medium text-gray-700">{page} / {totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modals ── */}
            {viewList && <ProspectListModal list={viewList} onClose={() => setViewList(null)} />}

            {deleteList && (
                <DeleteModal
                    title="Delete this list?"
                    message={`"${deleteList.list_name}" with ${deleteList.prospect_count?.toLocaleString() ?? 0} contacts will be permanently removed.`}
                    onConfirm={() => deleteMutation.mutate(deleteList.list_id)}
                    onCancel={() => setDeleteList(null)}
                    loading={deleteMutation.isPending}
                />
            )}

            {showBulkDelete && (
                <DeleteModal
                    title={`Delete ${selectedIds.length} lists?`}
                    message="All selected lists and their contacts will be permanently deleted. This cannot be undone."
                    onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
                    onCancel={() => setShowBulkDelete(false)}
                    loading={bulkDeleteMutation.isPending}
                />
            )}

            {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
            {showBouncedRevalidation && canRevalidateBounced && (
                <BouncedRevalidationModal onClose={() => setShowBouncedRevalidation(false)} />
            )}
        </div>
    );
}
