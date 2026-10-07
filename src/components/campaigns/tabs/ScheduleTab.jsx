import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignApi } from '../../../api/campaigns';
import { Calendar, Mail, Clock, Users, CheckCircle, Edit2, X, Save, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '../../layout/PageTransition';
import Loading from '../../common/Loading';
import KpiTile from '../../ui/KpiTile';

// ── Stat Card with sparkline ──────────────────────────────────────────────────
function StatCard(props) {
    return <KpiTile {...props} />;
}

/**
 * Format an ISO UTC string → local datetime-local input value (YYYY-MM-DDTHH:MM)
 */
function toDatetimeLocalValue(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d)) return '';
    // Pad to "YYYY-MM-DDTHH:MM"
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Schedule Timeline Tab
 *
 * Each date group (e.g. "Thursday, March 5") shows a single "Edit" button next to
 * the date heading. Clicking it opens a date/time picker that reschedules ALL
 * queued emails on that date + sequence step in one go.
 *
 * Data flow:
 *  - useQuery owns the data and has staleTime:0 so invalidation always refetches.
 *  - onSuccess calls invalidateQueries — React Query refetches and re-renders.
 *  - No initialData / enabled tricks that prevent refetching.
 */
export default function ScheduleTab({ campaignId }) {
    const queryClient = useQueryClient();

    // editingKey = "<date>_<stepNumber>" while the date-level picker is open
    const [editingKey, setEditingKey] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [adjustmentNotice, setAdjustmentNotice] = useState(null);

    // ── Data query ───────────────────────────────────────────────────────────
    // staleTime: 0  →  data is always stale so invalidateQueries triggers a refetch
    // refetchOnMount: 'always' → every mount fetches fresh data (same as Campaigns.jsx)
    const { data, isLoading, error } = useQuery({
        queryKey: ['campaign-schedule', campaignId],
        queryFn: () => campaignApi.getSchedule(campaignId),
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
    });

    // ── Mutation ─────────────────────────────────────────────────────────────
    const rescheduleDateMutation = useMutation({
        mutationFn: ({ date, stepNumber, newScheduledAt }) =>
            campaignApi.rescheduleDate(campaignId, date, stepNumber, newScheduledAt),
        onSuccess: (responseData, variables) => {
            setEditingKey(null);
            setEditValue('');
            // Invalidate → React Query refetches immediately (staleTime:0 ensures this)
            queryClient.invalidateQueries({ queryKey: ['campaign-schedule', campaignId], exact: false });
            if (responseData?.time_adjusted && responseData?.adjustment_reason) {
                setAdjustmentNotice({ date: variables.date, message: responseData.adjustment_reason });
                setTimeout(() => setAdjustmentNotice(null), 10000);
            } else {
                setAdjustmentNotice(null);
            }
        },
        onError: () => {
            // keep picker open so user can retry
        },
    });

    // ── Handlers ─────────────────────────────────────────────────────────────
    const openDateEdit = (date, stepNumber) => {
        setEditingKey(`${date}_${stepNumber}`);
        setAdjustmentNotice(null);
        // Default picker to 09:00 on the chosen date (safe sending hours start)
        const d = new Date(`${date}T09:00:00`);
        setEditValue(toDatetimeLocalValue(isNaN(d) ? new Date().toISOString() : d.toISOString()));
    };

    const cancelEdit = () => {
        setEditingKey(null);
        setEditValue('');
        setAdjustmentNotice(null);
    };

    const saveDateEdit = (date, stepNumber) => {
        if (!editValue) return;
        // datetime-local value is local time → convert to UTC ISO for the backend
        rescheduleDateMutation.mutate({
            date,
            stepNumber,
            newScheduledAt: new Date(editValue).toISOString(),
        });
    };

    // ── Derived state ─────────────────────────────────────────────────────────
    const schedule = data?.schedule || [];
    const totalSent = data?.total_sent || 0;
    const totalScheduled = data?.total_scheduled || 0;

    // ── Render guards ─────────────────────────────────────────────────────────
    if (isLoading) return <Loading text="Loading schedule..." size="md" />;

    if (error) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                <p className="text-rose-500">Failed to load schedule data</p>
            </div>
        );
    }

    if (schedule.length === 0) {
        return (
            <div
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
                <div
                    className="flex items-center gap-3 px-5 py-4"
                    style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}
                >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}>
                        <Calendar className="w-4 h-4" style={{ color: '#2d6bbf' }} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">Schedule Timeline</p>
                        <p className="text-xs text-gray-400">No schedule yet</p>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.1), rgba(115,200,210,0.1))' }}>
                        <Calendar className="w-7 h-7" style={{ color: '#2d6bbf' }} />
                    </div>
                    <h3 className="text-base font-semibold text-gray-800 mb-1">No Schedule Yet</h3>
                    <p className="text-sm text-gray-400 max-w-sm">
                        When prospects are enrolled and emails are scheduled, they'll appear here.
                    </p>
                </div>
            </div>
        );
    }

    // Group items by date
    const scheduleByDate = schedule.reduce((acc, item) => {
        if (!acc[item.date]) acc[item.date] = [];
        acc[item.date].push(item);
        return acc;
    }, {});
    const sortedDates = Object.keys(scheduleByDate).sort();

    return (
        <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-4">

            {/* ── Gradient Stat Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    variants={itemVariants}
                    label="Emails Sent"
                    value={totalSent}
                    sub="successfully delivered"
                    from="#2d6bbf" to="#1f56aa"
                    chart="bar"
                />
                <StatCard
                    variants={itemVariants}
                    label="Pending / Queued"
                    value={totalScheduled}
                    sub="awaiting their send window"
                    from="#F5F1DC" to="#e8e3c0"
                    dark
                    chart="wave"
                />
                <StatCard
                    variants={itemVariants}
                    label="Days Active"
                    value={sortedDates.length}
                    sub="unique sending days"
                    from="#73C8D2" to="#4db0bb"
                    chart="bar"
                />
            </div>

            {/* ── Timeline ── */}
            <div
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
                {/* Section header */}
                <div
                    className="flex items-center gap-3 px-5 py-4"
                    style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}
                >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}>
                        <Calendar className="w-4 h-4" style={{ color: '#2d6bbf' }} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">Schedule Timeline</p>
                        <p className="text-xs text-gray-400">{sortedDates.length} day{sortedDates.length !== 1 ? 's' : ''} scheduled</p>
                    </div>
                </div>

                <div className="p-6 relative">
                    <div className="absolute left-[46px] top-6 bottom-6 w-0.5" style={{ background: 'linear-gradient(to bottom, #2d6bbf, #73C8D2, #e2e8f0)' }} />

                    {sortedDates.map((date) => {
                        const dateItems = scheduleByDate[date];
                        const dateObj = new Date(date + 'T12:00:00'); // noon avoids DST/TZ flip
                        const isToday = dateObj.toDateString() === new Date().toDateString();
                        const isPast = dateObj < new Date(new Date().toDateString());
                        const hasQueued = dateItems.some(item => ['QUEUED', 'SCHEDULED', 'PAUSED_BY_CAMPAIGN'].includes(item.status));

                        return (
                            <motion.div
                                key={date}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="relative mb-8 last:mb-0"
                            >
                                <div className="flex items-start gap-4">

                                    {/* Circle date marker */}
                                    <div className={`
                                        relative z-10 w-12 h-12 rounded-full flex items-center justify-center
                                        shadow-md border-2 transition-all shrink-0
                                        ${isToday
                                            ? 'bg-blue-500 border-blue-600 text-white'
                                            : isPast
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                                : 'bg-white border-slate-200 text-slate-600'
                                        }
                                    `}>
                                        <div className="text-center leading-tight">
                                            <div className="text-xs font-bold">{dateObj.toLocaleDateString('en-US', { day: 'numeric' })}</div>
                                            <div className="text-[10px] opacity-80">{dateObj.toLocaleDateString('en-US', { month: 'short' })}</div>
                                        </div>
                                    </div>

                                    <div className="flex-1 pt-1">
                                        {/* Date heading row with Edit button */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-sm font-semibold text-slate-800">
                                                {dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                            </span>
                                            {isToday && (
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">Today</span>
                                            )}

                                            {/* Single Edit button per date — reschedules ALL queued emails on this day */}
                                            {hasQueued && (
                                                <button
                                                    onClick={() => {
                                                        const firstQueued = dateItems.find(i => ['QUEUED', 'SCHEDULED', 'PAUSED_BY_CAMPAIGN'].includes(i.status));
                                                        openDateEdit(date, firstQueued?.step_number ?? 1);
                                                    }}
                                                    className={`
                                                        flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                                                        border transition-colors
                                                        ${editingKey && editingKey.startsWith(date)
                                                            ? 'bg-blue-100 border-blue-400 text-blue-700'
                                                            : 'bg-white border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'
                                                        }
                                                    `}
                                                    title="Reschedule all queued emails on this day"
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                    Edit
                                                </button>
                                            )}
                                        </div>

                                        {/* Adjustment banner — shown when backend snapped the time */}
                                        {adjustmentNotice?.date === date && (
                                            <div className="mb-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="font-semibold mb-0.5">Schedule adjusted</p>
                                                    <p>{adjustmentNotice.message}</p>
                                                </div>
                                                <button onClick={() => setAdjustmentNotice(null)} className="ml-auto text-amber-400 hover:text-amber-600">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}

                                        {/* Date/time picker — shown while editing this date */}
                                        {editingKey && editingKey.startsWith(date) && (() => {
                                            const firstQueued = dateItems.find(i => i.status !== 'SENT');
                                            const stepNum = firstQueued?.step_number ?? 1;
                                            return (
                                                <div className="mb-3 flex flex-wrap items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200 shadow-sm">
                                                    <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                                                    <span className="text-xs text-blue-700 font-medium mr-1">
                                                        New date &amp; time for all queued emails on this day:
                                                    </span>
                                                    <input
                                                        type="datetime-local"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                    />
                                                    <button
                                                        onClick={() => saveDateEdit(date, stepNum)}
                                                        disabled={rescheduleDateMutation.isPending}
                                                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                                    >
                                                        {rescheduleDateMutation.isPending
                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                            : <Save className="w-3 h-3" />
                                                        }
                                                        Save All
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200 transition-colors"
                                                    >
                                                        <X className="w-3 h-3" />
                                                        Cancel
                                                    </button>
                                                    <p className="w-full text-[10px] text-slate-400 mt-0.5">
                                                        ⚠️ Times outside safe sending hours or on weekends/holidays will be automatically adjusted to the next valid business-hour slot.
                                                    </p>
                                                    {rescheduleDateMutation.isError && (
                                                        <p className="w-full mt-1 text-xs text-rose-500">
                                                            Failed to reschedule: {rescheduleDateMutation.error?.response?.data?.detail || 'Unknown error'}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Email step items for this date */}
                                        <div className="space-y-3">
                                            {dateItems.map((item, idx) => {
                                                const isSent = item.status === 'SENT';
                                                const isPaused = item.status === 'PAUSED_BY_CAMPAIGN';

                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`
                                                        rounded-lg border p-4 transition-all hover:shadow-md
                                                        ${isSent
                                                                ? 'bg-emerald-50 border-emerald-100'
                                                                : isPaused
                                                                    ? 'bg-amber-50 border-amber-100'
                                                                    : 'bg-blue-50 border-blue-100'
                                                            }
                                                    `}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-2 rounded-lg ${isSent ? 'bg-emerald-100' : isPaused ? 'bg-amber-100' : 'bg-blue-100'}`}>
                                                                    <Mail className={`w-4 h-4 ${isSent ? 'text-emerald-600' : isPaused ? 'text-amber-600' : 'text-blue-600'}`} />
                                                                </div>
                                                                <div>
                                                                    <span className="font-medium text-slate-800">Step {item.step_number} Email</span>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <Users className="w-3 h-3 text-slate-400" />
                                                                        <span className="text-xs text-slate-500">
                                                                            {item.prospect_count} prospect{item.prospect_count !== 1 ? 's' : ''}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <span className={`
                                                            px-3 py-1 rounded-full text-xs font-medium
                                                            ${isSent
                                                                    ? 'bg-emerald-200 text-emerald-700'
                                                                    : isPaused
                                                                        ? 'bg-amber-200 text-amber-700'
                                                                        : 'bg-blue-200 text-blue-700'
                                                                }
                                                        `}>
                                                                {isSent ? '✓ Sent' : isPaused ? '⏸ Paused' : '⏳ Queued'}
                                                            </span>
                                                        </div>

                                                        {/* Prospect chips */}
                                                        {item.prospects && item.prospects.length > 0 && (
                                                            <div className="mt-3 pt-3 border-t border-slate-200/50">
                                                                <div className="flex flex-wrap gap-2 items-center">
                                                                    {item.prospects.slice(0, 5).map((p, pIdx) => {
                                                                        const timestamp = p.sent_at || p.scheduled_at;
                                                                        const timeLabel = timestamp
                                                                            ? new Date(timestamp).toLocaleString([], {
                                                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                                            })
                                                                            : null;
                                                                        return (
                                                                            <span key={pIdx} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-white rounded border border-slate-200 text-slate-600">
                                                                                {p.name || p.email}
                                                                                {timeLabel && (
                                                                                    <span className="text-slate-400" title={p.sent_at ? 'Actually sent at' : 'Scheduled for'}>
                                                                                        · {p.sent_at ? '✓' : '⏳'} {timeLabel}
                                                                                    </span>
                                                                                )}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                    {item.prospect_count > 5 && (
                                                                        <span className="text-xs px-2 py-1 text-slate-400">
                                                                            +{item.prospect_count - 5} more
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
}
