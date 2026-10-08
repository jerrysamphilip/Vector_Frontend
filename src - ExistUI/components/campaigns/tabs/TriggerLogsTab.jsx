import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle, Clock, Zap } from 'lucide-react';
import { campaignApi } from '../../../api/campaigns';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '../../layout/PageTransition';
import Loading from '../../common/Loading';

export default function TriggerLogsTab({ campaignId }) {
    const { data: auditLogs, isLoading } = useQuery({
        queryKey: ['campaign-audit', campaignId],
        queryFn: () => campaignApi.getAudit(campaignId),
    });

    const logs = auditLogs || [];

    if (isLoading) {
        return <Loading text="Loading logs..." size="md" />;
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
            {/* Section Header — matches Prospects/EmailAccounts section headers */}
            <div
                className="flex items-center justify-between px-5 py-4"
                style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}
                    >
                        <Activity className="w-4 h-4" style={{ color: '#2d6bbf' }} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">System Logs & Triggers</p>
                        <p className="text-xs text-gray-400">
                            {logs.length > 0 ? `${logs.length} event${logs.length !== 1 ? 's' : ''}` : 'No events yet'}
                        </p>
                    </div>
                </div>
            </div>

            {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                        style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.1), rgba(115,200,210,0.1))' }}
                    >
                        <Zap className="w-7 h-7" style={{ color: '#2d6bbf' }} />
                    </div>
                    <h4 className="font-semibold text-gray-800 mb-1">No Activity Yet</h4>
                    <p className="text-sm text-gray-400 max-w-sm">
                        Campaign events and system actions will appear here as the campaign runs.
                    </p>
                </div>
            ) : (
                <table className="w-full text-sm text-left">
                    <thead style={{ background: 'linear-gradient(90deg, #1f4bba, #73C8D2)' }}>
                        <tr>
                            {['Timestamp', 'Event', 'Details', 'Result'].map((col, i) => (
                                <th key={col} className={`px-5 py-3.5 ${i === 3 ? 'text-right' : ''}`}>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/90">{col}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {logs.map((log, idx) => (
                            <motion.tr
                                variants={itemVariants}
                                key={log.id || idx}
                                className="hover:bg-slate-50/80 transition-colors"
                            >
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                                        <Clock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                        {new Date(log.created_at || log.timestamp).toLocaleString()}
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <span className="font-semibold text-gray-800 text-sm">
                                        {log.event_type || log.action || 'Event'}
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-gray-500 text-xs max-w-md truncate">
                                    {log.details || log.old_value || log.new_value || '—'}
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <span
                                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border"
                                        style={{ background: 'rgba(16,185,129,0.08)', color: '#059669', borderColor: 'rgba(16,185,129,0.2)' }}
                                    >
                                        <CheckCircle className="w-3 h-3" /> Logged
                                    </span>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            )}
        </motion.div>
    );
}
