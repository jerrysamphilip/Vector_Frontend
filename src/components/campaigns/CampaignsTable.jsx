import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Pause, Trash2, Mail, ExternalLink, Loader2,
    Send, MailOpen, MessageSquare, AlertTriangle, TrendingUp,
    VolumeX, ThumbsUp, Settings2, X, Check
} from 'lucide-react';
import StatusBadge from './StatusBadge';


// ── column registry ─────────────────────────────────────────────────────────
const ALL_COLUMNS = [
    { key: 'inProgress', label: 'In Progress', icon: Loader2, always: false },
    { key: 'sent', label: 'Sent', icon: Send, always: false },
    { key: 'opened', label: 'Opened', icon: MailOpen, always: false },
    { key: 'replied', label: 'Replied', icon: MessageSquare, always: false },
    { key: 'bounced', label: 'Bounced', icon: AlertTriangle, always: false },
    { key: 'senderBounced', label: 'Sender Bounced', icon: TrendingUp, always: false },
    { key: 'positive', label: 'Positive', icon: ThumbsUp, always: false },
    { key: 'repliedNoOOO', label: 'Replied w/o OOO', icon: VolumeX, always: false },
];

const DEFAULT_VISIBLE = ['inProgress', 'sent', 'opened', 'replied', 'bounced', 'senderBounced', 'positive', 'repliedNoOOO'];
const LS_KEY = 'campaigns_visible_columns';

function loadVisibleCols() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) return JSON.parse(raw);
    } catch (_) { }
    return DEFAULT_VISIBLE;
}

// ── Gradient <th> ─────────────────────────────────────────────────────────────
function GradientTh({ children, className = '' }) {
    return (
        <th className={`py-3.5 px-4 ${className}`}>
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/90">
                {children}
            </span>
        </th>
    );
}

// ── mini bar for sent-progress ────────────────────────────────────────────────
function MiniBar({ pct, gradient }) {
    return (
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden max-w-[90px]">
            <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(pct, 100)}%`, background: gradient }} />
        </div>
    );
}

// ── Column Picker panel ───────────────────────────────────────────────────────
export function ColumnPicker({ visible, onChange, onClose }) {
    const ref = useRef();
    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [onClose]);

    function toggle(key) {
        const next = visible.includes(key) ? visible.filter(k => k !== key) : [...visible, key];
        onChange(next);
    }

    return (
        <div ref={ref}
            className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100"
                style={{ background: 'linear-gradient(90deg, #1f4bba, #73C8D2)' }}>
                <span className="text-xs font-bold uppercase tracking-wider text-white/90">Customise Columns</span>
                <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
            {/* Column rows */}
            <div className="py-2">
                {ALL_COLUMNS.map(col => {
                    const Icon = col.icon;
                    const on = visible.includes(col.key);
                    return (
                        <button key={col.key}
                            onClick={() => toggle(col.key)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all flex-shrink-0
                                ${on ? 'border-transparent' : 'border-slate-300 bg-white'}`}
                                style={on ? { background: 'linear-gradient(135deg, #1f4bba, #73C8D2)' } : {}}>
                                {on && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-sm text-slate-700 font-medium">{col.label}</span>
                        </button>
                    );
                })}
            </div>
            {/* Reset */}
            <div className="border-t border-slate-100 px-4 py-2.5">
                <button onClick={() => onChange(DEFAULT_VISIBLE)}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                    Reset to defaults
                </button>
            </div>
        </div>
    );
}

// ── Main table component ─────────────────────────────────────────────────────
export default function CampaignsTable({
    campaigns, isLoading, onAction, performingActionId,
    selectedIds = [], onToggleSelect, onToggleAll,
    visibleCols = []
}) {
    const navigate = useNavigate();

    const allSelected = campaigns.length > 0 && selectedIds.length === campaigns.length;

    const show = (key) => visibleCols.includes(key);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />
                ))}
            </div>
        );
    }

    if (campaigns.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0046FF] to-[#73C8D2] flex items-center justify-center mb-4 shadow-lg">
                    <Mail className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-slate-900 font-semibold text-lg">No campaigns yet</h3>
                <p className="text-slate-400 text-sm mt-1 max-w-sm">
                    Create your first campaign to start reaching out to prospects.
                </p>
            </div>
        );
    }

    return (
        <>
        <div className="relative">

            <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm custom-scrollbar" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                <table className="w-full text-left border-collapse min-w-max">
                    <thead className="sticky top-0 z-30 shadow-sm" style={{ background: '#1f4bba' }}>
                        <tr>
                            <th className="py-3.5 px-4 w-[50px] min-w-[50px] sticky left-0 z-20" style={{ background: '#1f4bba' }}>
                                <input type="checkbox"
                                    className="w-4 h-4 rounded border-white/40 bg-white/20 text-white cursor-pointer"
                                    checked={allSelected} onChange={onToggleAll} />
                            </th>
                            <th className="py-3.5 px-4 w-[280px] min-w-[280px] max-w-[280px] sticky left-[50px] z-20" style={{ background: '#1f4bba' }}>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-white/90">Campaign</span>
                            </th>
                            <th className="py-3.5 px-4 w-[140px] min-w-[140px] sticky left-[330px] z-20 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]" style={{ background: '#1f4bba' }}>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-white/90">Status</span>
                            </th>
                            {show('inProgress') && <GradientTh className="min-w-[100px]">In Progress</GradientTh>}
                            {show('sent') && <GradientTh className="min-w-[100px]">Sent</GradientTh>}
                            {show('opened') && <GradientTh>Opened</GradientTh>}
                            {show('replied') && <GradientTh>Replied</GradientTh>}
                            {show('bounced') && <GradientTh>Bounced</GradientTh>}
                            {show('senderBounced') && <GradientTh>Sender Bounced</GradientTh>}
                            {show('positive') && <GradientTh>Positive</GradientTh>}
                            {show('repliedNoOOO') && <GradientTh>Replied w/o OOO</GradientTh>}
                            <th className="py-3.5 px-4 w-[100px] min-w-[100px] text-right sticky right-0 z-20 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.15)]" style={{ background: '#1f4bba' }}>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-white/90">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        <AnimatePresence>
                            {campaigns.map((campaign, rowIdx) => {
                                const isSelected = selectedIds.includes(campaign.campaign_id);

                                // Raw metric values (all defaulting to 0 safely)
                                const inProgress = campaign.in_progress_count || 0;
                                const sent = campaign.sent_count || 0;
                                const opened = campaign.opened_count || 0;
                                const replied = campaign.replied_count || 0;
                                const bounced = campaign.bounced_count || 0;
                                const senderBounced = campaign.sender_bounced_count || 0;
                                const positive = campaign.positive_replied_count || 0;
                                const ooo = campaign.ooo_count || 0;
                                const prospects = campaign.prospect_count || sent || 1;

                                const delivered = Math.max(sent - bounced, 0);
                                const base = delivered || 1;

                                // Computed rates
                                const openRate = ((opened / base) * 100).toFixed(1);
                                const replyRate = ((replied / base) * 100).toFixed(1);
                                const bounceRate = ((bounced / (sent || 1)) * 100).toFixed(1);
                                const senderBounceRate = ((senderBounced / (sent || 1)) * 100).toFixed(1);
                                const positiveRate = ((positive / base) * 100).toFixed(1);
                                const repliedNoOOO = Math.max(replied - ooo, 0);
                                const repliedNoOOORate = ((repliedNoOOO / base) * 100).toFixed(1);

                                // Amber warning: hard bounce rate > 3%
                                const hardBounceWarning = parseFloat(bounceRate) > 3;

                                const iconGradient = campaign.status === 'ACTIVE' ? 'from-emerald-400 to-teal-500'
                                    : campaign.status === 'PAUSED' ? 'from-amber-400 to-orange-400'
                                        : campaign.status === 'COMPLETED' ? 'from-blue-400 to-indigo-500'
                                            : 'from-slate-300 to-slate-400';

                                return (
                                    <motion.tr
                                        key={campaign.campaign_id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.18, delay: rowIdx * 0.03, ease: 'easeOut' }}
                                        exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
                                        onClick={() => {
                                            if (campaign.status === 'DRAFT') {
                                                navigate(`/app/campaigns/new?edit=${campaign.campaign_id}`);
                                            } else {
                                                navigate(`/app/campaigns/${campaign.campaign_id}`);
                                            }
                                        }}
                                        className={`cursor-pointer group transition-all duration-150 ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50/80'}`}
                                    >
                                        {/* Checkbox */}
                                        <td className={`py-4 px-4 w-[50px] min-w-[50px] sticky left-0 z-10 transition-colors ${isSelected ? 'bg-indigo-50/90 group-hover:bg-indigo-100/90' : 'bg-white group-hover:bg-slate-50/100'}`} onClick={e => e.stopPropagation()}>
                                            <input type="checkbox"
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                checked={isSelected}
                                                onChange={() => onToggleSelect(campaign.campaign_id)} />
                                        </td>

                                        {/* Campaign Name */}
                                        <td className={`px-4 py-4 w-[280px] min-w-[280px] max-w-[280px] sticky left-[50px] z-10 transition-colors ${isSelected ? 'bg-indigo-50/90 group-hover:bg-indigo-100/90' : 'bg-white group-hover:bg-slate-50/100'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${iconGradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                                    <Mail className="w-4 h-4 text-white" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p
                                                        title={campaign.campaign_name}
                                                        className="text-sm font-semibold text-slate-800 group-hover:text-[#0046FF] transition-colors truncate"
                                                    >
                                                        {campaign.campaign_name}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        By {campaign.creator_name ? campaign.creator_name.split(' ')[0] : 'Admin'}
                                                        {campaign.prospect_count > 0 && (
                                                            <span className="ml-2 text-slate-300 ">· {campaign.prospect_count.toLocaleString()} prospects</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className={`py-4 px-4 w-[140px] min-w-[140px] sticky left-[330px] z-10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] transition-colors ${isSelected ? 'bg-indigo-50/90 group-hover:bg-indigo-100/90' : 'bg-white group-hover:bg-slate-50/100'}`}>
                                            <StatusBadge status={campaign.status} />
                                        </td>

                                        {/* ── In Progress — still being actively sequenced (ACTIVE/OPENED) ── */}
                                        {show('inProgress') && (
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <Loader2 className="w-3 h-3 text-amber-500 opacity-80" />
                                                        <span className="text-sm font-semibold text-slate-700">{inProgress.toLocaleString()}</span>
                                                    </div>
                                                    <MiniBar pct={(inProgress / prospects) * 100} gradient="linear-gradient(90deg,#f59e0b,#fbbf24)" />
                                                </div>
                                            </td>
                                        )}

                                        {/* ── Sent ── */}
                                        {show('sent') && (
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <Send className="w-3 h-3 text-[#0046FF] opacity-70" />
                                                        <span className="text-sm font-semibold text-slate-700">{sent.toLocaleString()}</span>
                                                    </div>
                                                    <MiniBar pct={(sent / prospects) * 100} gradient="linear-gradient(90deg,#0046FF,#73C8D2)" />
                                                </div>
                                            </td>
                                        )}

                                        {/* ── Opened ── */}
                                        {show('opened') && (
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-baseline gap-1.5">
                                                        <MailOpen className="w-3 h-3 text-[#73C8D2] opacity-80" />
                                                        <span className={`text-sm font-semibold ${parseFloat(openRate) > 30 ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                            {openRate}%
                                                        </span>
                                                        <span className="text-xs text-slate-400">({opened})</span>
                                                    </div>
                                                    <MiniBar pct={parseFloat(openRate)} gradient="linear-gradient(90deg,#73C8D2,#5BB4BE)" />
                                                </div>
                                            </td>
                                        )}

                                        {/* ── Replied ── */}
                                        {show('replied') && (
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-baseline gap-1.5">
                                                        <MessageSquare className="w-3 h-3 text-[#8b5cf6] opacity-80" />
                                                        <span className={`text-sm font-semibold ${parseFloat(replyRate) > 10 ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                            {replyRate}%
                                                        </span>
                                                        <span className="text-xs text-slate-400">({replied})</span>
                                                    </div>
                                                    <MiniBar pct={parseFloat(replyRate) * 5} gradient="linear-gradient(90deg,#8b5cf6,#6d28d9)" />
                                                </div>
                                            </td>
                                        )}

                                        {/* ── Bounced (hard) ── amber warning if >3% */}
                                        {show('bounced') && (
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        {hardBounceWarning ? (
                                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                                        ) : (
                                                            <AlertTriangle className="w-3 h-3 text-slate-300 opacity-70" />
                                                        )}
                                                        <span className={`text-sm font-semibold ${hardBounceWarning ? 'text-amber-600' : 'text-slate-700'}`}>
                                                            {bounceRate}%
                                                        </span>
                                                        <span className="text-xs text-slate-400">({bounced})</span>
                                                    </div>
                                                    {hardBounceWarning && (
                                                        <span className="text-[10px] font-semibold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md w-fit">
                                                            List quality issue
                                                        </span>
                                                    )}
                                                    {!hardBounceWarning && (
                                                        <MiniBar pct={parseFloat(bounceRate) * 10} gradient="linear-gradient(90deg,#f59e0b,#d97706)" />
                                                    )}
                                                </div>
                                            </td>
                                        )}

                                        {/* ── Sender Bounced (infra/SMTP 4xx) ── */}
                                        {show('senderBounced') && (
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-baseline gap-1.5">
                                                        <TrendingUp className="w-3 h-3 text-rose-400 opacity-80" />
                                                        <span className={`text-sm font-semibold ${parseFloat(senderBounceRate) > 2 ? 'text-rose-600' : 'text-slate-700'}`}>
                                                            {senderBounceRate}%
                                                        </span>
                                                        <span className="text-xs text-slate-400">({senderBounced})</span>
                                                    </div>
                                                    {parseFloat(senderBounceRate) > 2 && (
                                                        <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md w-fit">
                                                            Infra issue
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        )}

                                        {/* ── Positive Replies (AI-intent) ── */}
                                        {show('positive') && (
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-baseline gap-1.5">
                                                        <ThumbsUp className="w-3 h-3 text-emerald-500 opacity-80" />
                                                        <span className={`text-sm font-semibold ${positive > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                            {positiveRate}%
                                                        </span>
                                                        <span className="text-xs text-slate-400">({positive})</span>
                                                    </div>
                                                    <MiniBar pct={parseFloat(positiveRate) * 5} gradient="linear-gradient(90deg,#10b981,#059669)" />
                                                </div>
                                            </td>
                                        )}

                                        {/* ── Replied w/o OOO ── */}
                                        {show('repliedNoOOO') && (
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-baseline gap-1.5">
                                                        <VolumeX className="w-3 h-3 text-indigo-400 opacity-80" />
                                                        <span className={`text-sm font-semibold ${parseFloat(repliedNoOOORate) > 5 ? 'text-indigo-600' : 'text-slate-700'}`}>
                                                            {repliedNoOOORate}%
                                                        </span>
                                                        <span className="text-xs text-slate-400">({repliedNoOOO})</span>
                                                    </div>
                                                    {ooo > 0 && (
                                                        <span className="text-[10px] text-slate-400 italic">{ooo} OOO filtered</span>
                                                    )}
                                                </div>
                                            </td>
                                        )}

                                        {/* Actions */}
                                        <td className={`py-4 px-4 w-[100px] min-w-[100px] text-right sticky right-0 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)] transition-colors ${isSelected ? 'bg-indigo-50/90 group-hover:bg-indigo-100/90' : 'bg-white group-hover:bg-slate-50/100'}`}>
                                            <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                                                {performingActionId === campaign.campaign_id ? (
                                                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                                                ) : (
                                                    <>
                                                        {(campaign.status === 'ACTIVE' || campaign.status === 'PAUSED') && (
                                                            <button
                                                                onClick={e => onAction(campaign.status === 'ACTIVE' ? 'pause' : 'resume', campaign, e)}
                                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                title={campaign.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                                                            >
                                                                {campaign.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={e => onAction('delete', campaign, e)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/app/campaigns/${campaign.campaign_id}`)}
                                                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"
                                                            title="View"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </div>

        </>
    );
}
