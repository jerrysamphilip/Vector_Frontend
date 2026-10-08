import React from 'react';
import { Mail, AlertTriangle, CheckCircle2, Pencil, Trash2, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

const ProviderBadge = ({ provider }) => {
    const styles = {
        Google: 'text-blue-700 bg-blue-50 border-blue-100',
        Outlook: 'text-indigo-700 bg-indigo-50 border-indigo-100',
        SMTP: 'text-slate-700 bg-slate-50 border-slate-100',
    };
    const style = styles[provider] || styles.SMTP;

    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${style}`}>
            {provider}
        </span>
    );
};

export default function InboxCard({ inbox, onEdit, onDelete }) {
    if (!inbox) return null;

    const isWarming = inbox.warmup_enabled && inbox.current_daily_limit < inbox.daily_limit;
    const effectiveLimit = inbox.current_daily_limit || inbox.daily_limit;
    const sentToday = inbox.today_sent || 0;
    const usagePercent = Math.min((sentToday / effectiveLimit) * 100, 100);

    // Status Logic
    const isDisconnected = inbox.status === 'Needs Attention' || inbox.status === 'Disconnected';
    const statusColor = isDisconnected ? 'bg-rose-500' : 'bg-emerald-500';
    const statusGlow = isDisconnected ? 'shadow-rose-500/20' : 'shadow-emerald-500/20';

    return (
        <motion.div
            whileHover={{ y: -2 }}
            className="group bg-slate-50 rounded-xl border-2 border-slate-200 hover:border-blue-400 transition-all duration-300 overflow-hidden flex flex-col"
        >
            {/* Provider Strip */}
            <div className={`h-1 w-full ${inbox.provider === 'Google' ? 'bg-blue-500' : inbox.provider === 'Outlook' ? 'bg-indigo-500' : 'bg-slate-400'}`} />

            <div className="p-5 flex flex-col h-full">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 text-slate-400">
                                <Mail className="w-5 h-5" />
                            </div>
                            {/* Health Pulse */}
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusColor} ${statusGlow} shadow-md`}>
                                {!isDisconnected && <div className={`absolute inset-0 rounded-full ${statusColor} animate-ping opacity-75`} />}
                            </div>
                        </div>
                        <div className="min-w-0">
                            <ProviderBadge provider={inbox.provider} />
                            <h3 className="text-sm font-bold text-slate-800 mt-1 truncate max-w-[160px]" title={inbox.email_address}>
                                {inbox.email_address}
                            </h3>
                        </div>
                    </div>

                    {/* Quick Actions (Opacity hover) */}
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(inbox)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDelete(inbox)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Usage Bar */}
                <div className="mt-auto space-y-2">
                    <div className="flex justify-between text-xs font-medium text-slate-500">
                        <div className="flex items-center gap-1.5">
                            {isWarming && (
                                <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                    <Flame className="w-3 h-3" /> Warming
                                </span>
                            )}
                            <span>Daily Capacity</span>
                        </div>
                        <span className={usagePercent > 90 ? 'text-rose-600' : 'text-slate-700'}>
                            {sentToday} <span className="text-slate-400">/ {effectiveLimit}</span>
                        </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${usagePercent}%` }}
                            className={`h-full rounded-full ${usagePercent > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        />
                    </div>
                </div>

                {/* Footer Metadata */}
                <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                    {inbox.imap_host ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="w-3 h-3" /> IMAP Active
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-amber-500">
                            <AlertTriangle className="w-3 h-3" /> SMTP Only
                        </span>
                    )}
                    <span>Sync: Just now</span>
                </div>
            </div>
        </motion.div>
    );
}
