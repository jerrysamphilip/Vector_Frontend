import React from 'react';
import { BarChart2, Send, Eye, MessageSquare, AlertTriangle } from 'lucide-react';

export default function PerformanceTab({ metrics = {} }) {
    const totalSent = metrics?.sent_count || 0;
    const opened = metrics?.opened_count || 0;
    const replied = metrics?.replied_count || 0;
    const bounced = metrics?.bounced_count || 0;

    if (totalSent === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <BarChart2 className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No Performance Data Yet</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                    Performance metrics will appear here once emails have been sent and engagement is tracked.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                        <Send className="w-4 h-4" /> Sent
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{totalSent}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-blue-500 text-sm mb-2">
                        <Eye className="w-4 h-4" /> Opened
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{opened}</p>
                    <p className="text-xs text-slate-500">{totalSent > 0 ? ((opened / totalSent) * 100).toFixed(1) : 0}%</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-green-500 text-sm mb-2">
                        <MessageSquare className="w-4 h-4" /> Replied
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{replied}</p>
                    <p className="text-xs text-slate-500">{totalSent > 0 ? ((replied / totalSent) * 100).toFixed(1) : 0}%</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-amber-500 text-sm mb-2">
                        <AlertTriangle className="w-4 h-4" /> Bounced
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{bounced}</p>
                    <p className="text-xs text-slate-500">{totalSent > 0 ? ((bounced / totalSent) * 100).toFixed(1) : 0}%</p>
                </div>
            </div>
        </div>
    );
}
