import React, { useState } from 'react';
import EnrollmentResultModal from '../EnrollmentResultModal';
import { Search, Download, Mail, Users, ChevronLeft, ChevronRight, Edit2, Save, X, Loader2, UserPlus, UserMinus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { campaignApi } from '../../../api/campaigns';
import { prospectsApi } from '../../../api/prospects';
import { containerVariants, itemVariants } from '../../layout/PageTransition';
import Loading from '../../common/Loading';

// Status badge colors matching theme.
// Real backend CampaignProspect statuses: ACTIVE, OPENED, COMPLETED, PAUSED,
// RECONNECT_ELIGIBLE, BOUNCED, REPLIED, UNSUBSCRIBED (see
// app/utils/campaign_prospect_status.py). "CLICKED" isn't a real status —
// kept only as a style fallback in case legacy data has it.
const STATUS_STYLES = {
    ACTIVE: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    REPLIED: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
    OPENED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    CLICKED: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
    BOUNCED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    UNSUBSCRIBED: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    COMPLETED: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
    PAUSED: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
    RECONNECT_ELIGIBLE: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
};

// Statuses still being actively sequenced (the sending gate the scheduler
// checks) — this is what "In Progress" means for a campaign.
const IN_PROGRESS_STATUSES = ['ACTIVE', 'OPENED'];
// Exited the sequence but not for a terminal reason (bounced/replied/
// unsubscribed/completed) — paused or held for a future re-engagement pass.
const PAUSED_STATUSES = ['PAUSED', 'RECONNECT_ELIGIBLE'];

function ProspectStatusBadge({ status }) {
    const style = STATUS_STYLES[status?.toUpperCase()] || STATUS_STYLES.ACTIVE;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
            {status || 'Active'}
        </span>
    );
}

export default function LeadListTab({ campaignId }) {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Editing state
    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [focusedField, setFocusedField] = useState(null);

    // Add-prospects modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedListId, setSelectedListId] = useState('');

    // Fetch prospects
    const { data: prospects, isLoading } = useQuery({
        queryKey: ['campaign-prospects', campaignId],
        queryFn: () => campaignApi.getProspects(campaignId),
    });

    // Prospect lists for the "Add prospects" picker (only fetched once the modal opens)
    const { data: prospectLists, isLoading: listsLoading } = useQuery({
        queryKey: ['prospect-lists'],
        queryFn: campaignApi.getProspectLists,
        enabled: showAddModal,
    });

    // Update mutation — reuses existing prospects API
    const updateMutation = useMutation({
        mutationFn: ({ prospectId, updates }) => prospectsApi.updateProspect(prospectId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries(['campaign-prospects', campaignId]);
            setEditingId(null);
            setEditValues({});
        },
    });

    // Enroll additional prospects into this already-created (possibly already-scheduled) campaign
    const [enrollReport, setEnrollReport] = useState(null);
    const enrollMutation = useMutation({
        mutationFn: (listId) => campaignApi.enrollProspects(campaignId, [listId]),
        onSuccess: (result) => {
            queryClient.invalidateQueries(['campaign-prospects', campaignId]);
            setShowAddModal(false);
            setSelectedListId('');
            setEnrollReport({ enrolled: result?.enrolled_count || 0, rejected: result?.rejected || [], rejectedCount: result?.rejected_count, limitNotice: result?.daily_limit_notice });
        },
    });

    // Remove a prospect from the campaign — cancels their not-yet-sent emails
    const removeMutation = useMutation({
        mutationFn: (prospectId) => campaignApi.removeProspect(campaignId, prospectId),
        onSuccess: () => {
            queryClient.invalidateQueries(['campaign-prospects', campaignId]);
        },
    });

    const handleRemove = (prospect) => {
        const name = prospect.name || prospect.email;
        if (window.confirm(`Remove ${name} from this campaign?\n\nAny emails not yet sent to them will be cancelled. Emails already sent are unaffected.`)) {
            removeMutation.mutate(prospect.prospect_id);
        }
    };

    const displayProspects = prospects || [];

    // Filter by search and status
    const filteredProspects = displayProspects.filter(p => {
        const matchesSearch =
            (p.name || p.first_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.email || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.company || p.company_name || '').toLowerCase().includes(search.toLowerCase());

        const status = (p.status || 'ACTIVE').toUpperCase();
        const matchesStatus = statusFilter === 'ALL' ||
            (statusFilter === 'IN_PROGRESS' ? IN_PROGRESS_STATUSES.includes(status) :
             statusFilter === 'PAUSED' ? PAUSED_STATUSES.includes(status) :
             status === statusFilter);

        return matchesSearch && matchesStatus;
    });

    // Count by status
    const statusOf = p => (p.status || 'ACTIVE').toUpperCase();
    const statusCounts = {
        ALL: displayProspects.length,
        IN_PROGRESS: displayProspects.filter(p => IN_PROGRESS_STATUSES.includes(statusOf(p))).length,
        BOUNCED: displayProspects.filter(p => statusOf(p) === 'BOUNCED').length,
        REPLIED: displayProspects.filter(p => statusOf(p) === 'REPLIED').length,
        COMPLETED: displayProspects.filter(p => statusOf(p) === 'COMPLETED').length,
        PAUSED: displayProspects.filter(p => PAUSED_STATUSES.includes(statusOf(p))).length,
        UNSUBSCRIBED: displayProspects.filter(p => statusOf(p) === 'UNSUBSCRIBED').length,
    };

    // Edit handlers
    const startEdit = (prospect) => {
        setEditingId(prospect.prospect_id);
        setEditValues({
            first_name: prospect.first_name || '',
            last_name: prospect.last_name || '',
            designation: prospect.designation || '',
            company_name: prospect.company_name || prospect.company || '',
            email: prospect.email || '',
            poc_city: prospect.poc_city || '',
            poc_state: prospect.poc_state || '',
            poc_country: prospect.poc_country || '',
            notes: prospect.notes || '',
            _notes_list_id: prospect.notes_list_id,
            _original_notes: prospect.notes || '',
        });
    };

    const saveEdit = async () => {
        const { notes, _notes_list_id, _original_notes, ...prospectFields } = editValues;
        // Update prospect fields
        updateMutation.mutate({ prospectId: editingId, updates: prospectFields });
        // Update note separately if changed and list_id is available
        if (notes !== _original_notes && _notes_list_id) {
            try {
                await prospectsApi.updateProspectNote(_notes_list_id, editingId, notes);
            } catch (e) {
                console.warn('Note update failed:', e);
            }
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValues({});
        setFocusedField(null);
    };

    const focusZoomClass = (key, expandClass = '') =>
        focusedField === key
            ? `z-30 shadow-xl ring-2 ring-blue-300 border-blue-500 text-sm ${expandClass}`
            : 'hover:scale-[1.02] z-0';

    // Show loading until prospects are fetched
    if (isLoading) return <Loading text="Loading prospects..." size="md" />;

    return (
        <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="space-y-4"
        >
            {enrollReport && (
                <EnrollmentResultModal title="Contacts added to campaign" enrolled={enrollReport.enrolled}
                    rejected={enrollReport.rejected} rejectedCount={enrollReport.rejectedCount} limitNotice={enrollReport.limitNotice}
                    note={enrollReport.rejected.length ? 'These contacts were not added:' : null}
                    onClose={() => setEnrollReport(null)} />
            )}
            {/* Section Header */}
            <motion.div
                variants={itemVariants}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
                {/* Gradient subheader */}
                <div
                    className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center px-5 py-4 flex-wrap"
                    style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}
                        >
                            <Users className="w-4 h-4" style={{ color: '#2d6bbf' }} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-800">Enrolled Prospects</p>
                            <p className="text-xs text-gray-400">
                                {filteredProspects.length} of {displayProspects.length} shown
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 flex-1 justify-end min-w-0">
                        {/* Search */}
                        <div className="relative max-w-xs w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search by name, email, company…"
                                className="w-full h-9 pl-9 pr-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-all placeholder:text-gray-400"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Status Filter Pills */}
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { key: 'ALL', label: 'All' },
                                { key: 'IN_PROGRESS', label: 'In Progress' },
                                { key: 'BOUNCED', label: 'Bounced' },
                                { key: 'REPLIED', label: 'Replied' },
                                { key: 'COMPLETED', label: 'Completed' },
                                { key: 'PAUSED', label: 'Paused' },
                                { key: 'UNSUBSCRIBED', label: 'Unsubscribed' },
                            ].map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => setStatusFilter(key)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                                    style={statusFilter === key
                                        ? { background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)', color: '#fff' }
                                        : { background: 'rgba(0,0,0,0.04)', color: '#6b7280' }
                                    }
                                >
                                    {label}
                                    <span className="ml-1.5 opacity-70">{statusCounts[key] || 0}</span>
                                </button>
                            ))}
                        </div>

                        {/* Add Prospects Button */}
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-all"
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                            Add Prospects
                        </button>

                        {/* Export Button */}
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-all">
                            <Download className="w-3.5 h-3.5" />
                            Export
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Table */}
            <motion.div
                variants={itemVariants}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#2d6bbf', borderTopColor: 'transparent' }} />
                    </div>
                ) : filteredProspects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                            style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.1), rgba(115,200,210,0.1))' }}
                        >
                            <Users className="w-8 h-8" style={{ color: '#2d6bbf' }} />
                        </div>
                        <h3 className="text-base font-semibold text-gray-800">No prospects found</h3>
                        <p className="text-sm text-gray-400 mt-1 max-w-xs">
                            {search || statusFilter !== 'ALL'
                                ? 'Try adjusting your search or filters'
                                : 'Enroll prospects from the campaign wizard to see them here'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead style={{ background: 'linear-gradient(90deg, #1f4bba, #73C8D2)' }}>
                                    <tr>
                                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-white/90 uppercase tracking-wider">First Name</th>
                                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-white/90 uppercase tracking-wider">Last Name</th>
                                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-white/90 uppercase tracking-wider">Designation</th>
                                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-white/90 uppercase tracking-wider">Company</th>
                                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-white/90 uppercase tracking-wider">Email</th>
                                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-white/90 uppercase tracking-wider">City</th>
                                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-white/90 uppercase tracking-wider">State</th>
                                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-white/90 uppercase tracking-wider">Country</th>
                                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-white/90 uppercase tracking-wider">Sender</th>
                                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-white/90 uppercase tracking-wider">Status</th>
                                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-white/90 uppercase tracking-wider">Note</th>
                                        <th className="text-center px-5 py-3.5 text-[11px] font-bold text-white/90 uppercase tracking-wider w-24 sticky right-0" style={{ background: 'linear-gradient(90deg, #4ba0d8, #73C8D2)' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredProspects.map((p, i) => (
                                        <tr
                                            key={p.prospect_id || i}
                                            className={`hover:bg-slate-50/50 transition-colors group ${editingId === p.prospect_id ? 'bg-blue-50/50' : ''}`}
                                        >
                                            {editingId === p.prospect_id ? (
                                                // ── Edit Mode ──
                                                <>
                                                    <td className="px-6 py-3">
                                                        <input
                                                            value={editValues.first_name}
                                                            onChange={(e) => setEditValues(v => ({ ...v, first_name: e.target.value }))}
                                                            onFocus={() => setFocusedField('first_name')}
                                                            onBlur={() => setFocusedField(null)}
                                                            className={`w-full min-w-[90px] px-2 py-1.5 border border-blue-300 rounded text-[11px] focus:outline-none transition-all duration-150 origin-left ${focusZoomClass('first_name', '!w-[180px] !min-w-[180px]')}`}
                                                            placeholder="First"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <input
                                                            value={editValues.last_name}
                                                            onChange={(e) => setEditValues(v => ({ ...v, last_name: e.target.value }))}
                                                            onFocus={() => setFocusedField('last_name')}
                                                            onBlur={() => setFocusedField(null)}
                                                            className={`w-full min-w-[90px] px-2 py-1.5 border border-blue-300 rounded text-[11px] focus:outline-none transition-all duration-150 origin-left ${focusZoomClass('last_name', '!w-[180px] !min-w-[180px]')}`}
                                                            placeholder="Last"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <input
                                                            value={editValues.designation}
                                                            onChange={(e) => setEditValues(v => ({ ...v, designation: e.target.value }))}
                                                            onFocus={() => setFocusedField('designation')}
                                                            onBlur={() => setFocusedField(null)}
                                                            className={`w-full min-w-[130px] px-2 py-1.5 border border-blue-300 rounded text-[11px] focus:outline-none transition-all duration-150 origin-left ${focusZoomClass('designation', '!w-[260px] !min-w-[260px]')}`}
                                                            placeholder="Designation"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <input
                                                            value={editValues.company_name}
                                                            onChange={(e) => setEditValues(v => ({ ...v, company_name: e.target.value }))}
                                                            onFocus={() => setFocusedField('company_name')}
                                                            onBlur={() => setFocusedField(null)}
                                                            className={`w-full min-w-[150px] px-2 py-1.5 border border-blue-300 rounded text-[11px] focus:outline-none transition-all duration-150 origin-left ${focusZoomClass('company_name', '!w-[280px] !min-w-[280px]')}`}
                                                            placeholder="Company"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <input
                                                            value={editValues.email}
                                                            onChange={(e) => setEditValues(v => ({ ...v, email: e.target.value }))}
                                                            onFocus={() => setFocusedField('email')}
                                                            onBlur={() => setFocusedField(null)}
                                                            className={`w-full min-w-[240px] px-2 py-1.5 border border-blue-300 rounded text-[11px] focus:outline-none transition-all duration-150 origin-left ${focusZoomClass('email', '!w-[320px] !min-w-[320px]')}`}
                                                            placeholder="Email"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <input
                                                            value={editValues.poc_city}
                                                            onChange={(e) => setEditValues(v => ({ ...v, poc_city: e.target.value }))}
                                                            onFocus={() => setFocusedField('poc_city')}
                                                            onBlur={() => setFocusedField(null)}
                                                            className={`w-24 px-2 py-1.5 border border-blue-300 rounded text-[11px] focus:outline-none transition-all duration-150 origin-left ${focusZoomClass('poc_city', '!w-[180px]')}`}
                                                            placeholder="City"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <input
                                                            value={editValues.poc_state}
                                                            onChange={(e) => setEditValues(v => ({ ...v, poc_state: e.target.value }))}
                                                            onFocus={() => setFocusedField('poc_state')}
                                                            onBlur={() => setFocusedField(null)}
                                                            className={`w-16 px-2 py-1.5 border border-blue-300 rounded text-[11px] focus:outline-none transition-all duration-150 origin-left ${focusZoomClass('poc_state', '!w-[110px]')}`}
                                                            placeholder="State"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <input
                                                            value={editValues.poc_country}
                                                            onChange={(e) => setEditValues(v => ({ ...v, poc_country: e.target.value }))}
                                                            onFocus={() => setFocusedField('poc_country')}
                                                            onBlur={() => setFocusedField(null)}
                                                            className={`w-full min-w-[90px] px-2 py-1.5 border border-blue-300 rounded text-[11px] focus:outline-none transition-all duration-150 origin-left ${focusZoomClass('poc_country', '!w-[170px] !min-w-[170px]')}`}
                                                            placeholder="Country"
                                                        />
                                                    </td>
                                                    {/* Sender — read-only */}
                                                    <td className="px-6 py-3">
                                                        {p.assigned_inbox ? (
                                                            <span className="text-[11px] font-medium text-slate-700">{p.assigned_inbox}</span>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-400 italic">Not yet assigned</span>
                                                        )}
                                                    </td>
                                                    {/* Status — read-only */}
                                                    <td className="px-6 py-3">
                                                        <ProspectStatusBadge status={p.status} />
                                                    </td>
                                                    {/* Note — editable */}
                                                    <td className="px-6 py-3">
                                                        <div className="relative">
                                                            <textarea
                                                                value={editValues.notes}
                                                                onChange={(e) => {
                                                                    setEditValues(v => ({ ...v, notes: e.target.value }));
                                                                    // Auto-expand
                                                                    e.target.style.height = 'auto';
                                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                                }}
                                                                onFocus={(e) => {
                                                                    setFocusedField('notes');
                                                                    e.target.style.height = 'auto';
                                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                                }}
                                                                onBlur={() => setFocusedField(null)}
                                                                className={`w-full min-w-[160px] px-2 py-1.5 border border-blue-300 rounded-lg text-[11px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none leading-relaxed ${focusZoomClass('notes', '!w-[320px] !min-w-[320px]')}`}
                                                                style={{ minHeight: '36px', maxHeight: '120px' }}
                                                                rows={1}
                                                                placeholder="Add a note..."
                                                                maxLength={500}
                                                            />
                                                            {editValues.notes?.length > 0 && (
                                                                <span className="absolute -bottom-4 right-1 text-[10px] text-slate-400">
                                                                    {editValues.notes.length}/500
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-center sticky right-0 bg-blue-50 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                                                        <div className="flex gap-1 justify-center">
                                                            <button
                                                                onClick={saveEdit}
                                                                disabled={updateMutation.isPending}
                                                                className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                                                title="Save"
                                                            >
                                                                {updateMutation.isPending ? (
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
                                                // ── View Mode ──
                                                <>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-normal text-slate-600">
                                                            {p.first_name || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-normal text-slate-600">
                                                            {p.last_name || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm text-slate-600">
                                                            {p.designation || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm text-slate-600">
                                                            {p.company || p.company_name || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm text-slate-600">
                                                            {p.email || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm text-slate-600">
                                                            {p.poc_city || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm text-slate-600">
                                                            {p.poc_state || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm text-slate-600">
                                                            {p.poc_country || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {p.assigned_inbox ? (
                                                            <span className="text-sm font-medium text-slate-700">{p.assigned_inbox}</span>
                                                        ) : (
                                                            <span className="text-sm text-slate-400 italic">Not yet assigned</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <ProspectStatusBadge status={p.status} />
                                                    </td>
                                                    <td className="px-6 py-4 max-w-[200px]">
                                                        {(p.notes || p.validation_note || p.note) ? (
                                                            <span
                                                                className="text-sm text-slate-600 line-clamp-2 cursor-default"
                                                                title={p.notes || p.validation_note || p.note}
                                                            >
                                                                {p.notes || p.validation_note || p.note}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm text-slate-300 italic">No note</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center sticky right-0 bg-white group-hover:bg-slate-50 shadow-[-2px_0_4px_rgba(0,0,0,0.06)]">
                                                        <div className="flex gap-1 justify-center">
                                                            <button
                                                                onClick={() => startEdit(p)}
                                                                className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleRemove(p)}
                                                                disabled={removeMutation.isPending}
                                                                className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-40"
                                                                title="Remove from campaign"
                                                            >
                                                                <UserMinus className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <span className="text-sm text-slate-500">
                                Showing <strong className="text-slate-700">{filteredProspects.length}</strong> of <strong className="text-slate-700">{displayProspects.length}</strong> prospects
                            </span>
                            <div className="flex items-center gap-1">
                                <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </motion.div>

            {/* Add Prospects Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold text-gray-800">Add Prospects</h3>
                            <button
                                onClick={() => { setShowAddModal(false); setSelectedListId(''); }}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-sm text-gray-500 mb-3">
                            Pick a prospect list to enroll into this campaign. Eligible contacts (opted-in, valid email, not already enrolled) will start the sequence from step 1.
                        </p>

                        {listsLoading ? (
                            <Loading text="Loading lists..." size="sm" />
                        ) : (
                            <select
                                value={selectedListId}
                                onChange={(e) => setSelectedListId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 mb-4"
                            >
                                <option value="">Select a prospect list…</option>
                                {(prospectLists || []).map((list) => (
                                    <option key={list.list_id} value={list.list_id}>
                                        {list.list_name} ({list.prospect_count ?? '—'})
                                    </option>
                                ))}
                            </select>
                        )}

                        {enrollMutation.isError && (
                            <p className="text-sm text-red-600 mb-3">
                                {enrollMutation.error?.response?.data?.detail || 'Failed to add prospects.'}
                            </p>
                        )}

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => { setShowAddModal(false); setSelectedListId(''); }}
                                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => enrollMutation.mutate(selectedListId)}
                                disabled={!selectedListId || enrollMutation.isPending}
                                className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                            >
                                {enrollMutation.isPending ? 'Adding…' : 'Add to Campaign'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
