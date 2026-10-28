import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { subjectVariantsApi } from '../../api/subjectVariants';
import { useConfirm } from '../ui/ConfirmDialog';

// Per-variant results of a step's subject A/B test (BR-SF-18): sent, unique opened /
// clicked, replied, rates, the winner by open rate (after the minimum sample size) and
// the promote-winner action. Renders nothing for a step without variants.
const STATUS_STYLE = {
    winner: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    promoted: 'bg-amber-50 text-amber-700 border-amber-100',
    tie: 'bg-slate-50 text-slate-600 border-slate-200',
    insufficient_data: 'bg-slate-50 text-slate-600 border-slate-200',
    not_running: 'bg-slate-50 text-slate-500 border-slate-200',
};

export default function SubjectVariantsStats({ campaignId, step }) {
    const queryClient = useQueryClient();
    const confirm = useConfirm();
    const [showHistory, setShowHistory] = useState(false);
    const [error, setError] = useState(null);

    const { data } = useQuery({
        queryKey: ['subject-variant-stats', campaignId, step],
        queryFn: () => subjectVariantsApi.stats(campaignId, step),
        enabled: !!campaignId && !!step,
    });

    const { data: history } = useQuery({
        queryKey: ['subject-variant-messages', campaignId, step],
        queryFn: () => subjectVariantsApi.messages(campaignId, step, { limit: 50 }),
        enabled: showHistory,
    });

    const promoteMutation = useMutation({
        mutationFn: (label) => subjectVariantsApi.promote(campaignId, step, label),
        onSuccess: () => {
            setError(null);
            queryClient.invalidateQueries({ queryKey: ['subject-variant-stats', campaignId, step] });
            queryClient.invalidateQueries({ queryKey: ['subject-variants', campaignId, step] });
            queryClient.invalidateQueries({ queryKey: ['subject-variant-messages', campaignId, step] });
        },
        onError: (e) => setError(e?.response?.data?.detail || e?.message || 'Promotion failed'),
    });

    const variants = data?.variants || [];
    if (!variants.length) return null;
    const winner = data.winner || {};

    const promote = async (v) => {
        const ok = await confirm({
            title: `Promote variant ${v.label}?`,
            message: `"${v.subject}" — all remaining unsent emails of step ${step} will use this subject. Emails already sent are not changed, and the test is closed.`,
            confirmLabel: 'Promote',
        });
        if (ok) promoteMutation.mutate(v.label);
    };

    return (
        <div className="border-t border-slate-100 p-4" data-testid={`variant-stats-step-${step}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-indigo-500" />
                    <h5 className="text-sm font-semibold text-slate-800">Subject A/B test</h5>
                </div>
                <span className={`text-xs px-2 py-1 rounded-md border ${STATUS_STYLE[winner.status] || STATUS_STYLE.not_running}`} data-testid="variant-winner-status">
                    {winner.status === 'winner' || winner.status === 'promoted' ? <Trophy className="inline w-3 h-3 mr-1" /> : null}
                    {winner.reason}
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[11px] uppercase text-slate-400">
                            <th className="py-1 pr-3">Variant</th>
                            <th className="py-1 pr-3">Subject</th>
                            <th className="py-1 pr-3 text-right">Sent</th>
                            <th className="py-1 pr-3 text-right">Scheduled</th>
                            <th className="py-1 pr-3 text-right">Opened</th>
                            <th className="py-1 pr-3 text-right">Clicked</th>
                            <th className="py-1 pr-3 text-right">Replied</th>
                            <th className="py-1"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {variants.map((v) => {
                            const isLeader = winner.label === v.label;
                            return (
                                <tr key={v.label} className={`border-t border-slate-100 ${isLeader ? 'bg-emerald-50/40' : ''}`} data-testid={`variant-stat-${v.label}`}>
                                    <td className="py-2 pr-3 font-bold text-indigo-600">
                                        {v.label}{isLeader && <Trophy className="inline w-3.5 h-3.5 ml-1 text-amber-500" aria-label="winner" />}
                                    </td>
                                    <td className="py-2 pr-3 max-w-xs truncate text-slate-700" title={v.subject}>{v.subject}</td>
                                    <td className="py-2 pr-3 text-right">{v.sent}</td>
                                    <td className="py-2 pr-3 text-right text-slate-500">{v.scheduled}</td>
                                    <td className="py-2 pr-3 text-right">{v.opened} <span className="text-slate-400">({v.open_rate}%)</span></td>
                                    <td className="py-2 pr-3 text-right">{v.clicked} <span className="text-slate-400">({v.click_rate}%)</span></td>
                                    <td className="py-2 pr-3 text-right">{v.replied} <span className="text-slate-400">({v.reply_rate}%)</span></td>
                                    <td className="py-2 text-right">
                                        {winner.status === 'winner' && isLeader && (
                                            <button
                                                onClick={() => promote(v)}
                                                disabled={promoteMutation.isPending}
                                                className="text-xs px-2.5 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
                                            >
                                                {promoteMutation.isPending ? 'Promoting...' : 'Promote winner'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
                Opened and clicked count unique prospects; open and reply rates are over sent, click rate over opened.
                A winner is named by open rate once every variant has at least {data.min_sends_per_variant} sends.
            </p>
            {error && <p className="mt-2 text-xs text-red-600" role="alert">{String(error)}</p>}

            <button
                onClick={() => setShowHistory(!showHistory)}
                className="mt-3 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
                {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showHistory ? 'Hide emails' : 'Show emails by variant'}
            </button>
            {showHistory && (
                <div className="mt-2 overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-xs" data-testid="variant-history">
                        <thead>
                            <tr className="text-left uppercase text-slate-400">
                                <th className="py-1 pr-3">Prospect</th>
                                <th className="py-1 pr-3">Variant</th>
                                <th className="py-1 pr-3">Subject</th>
                                <th className="py-1 pr-3">Status</th>
                                <th className="py-1">When</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(history?.items || []).map((m) => (
                                <tr key={m.message_id} className="border-t border-slate-100">
                                    <td className="py-1 pr-3">{m.name || m.to_email}</td>
                                    <td className="py-1 pr-3 font-semibold text-indigo-600">{m.subject_variant || '-'}</td>
                                    <td className="py-1 pr-3 max-w-xs truncate" title={m.subject}>{m.subject}</td>
                                    <td className="py-1 pr-3">{m.status}</td>
                                    <td className="py-1 text-slate-500">
                                        {(m.sent_at || m.scheduled_at) ? new Date(m.sent_at || m.scheduled_at).toLocaleString() : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {history && history.total > (history.items || []).length && (
                        <p className="mt-1 text-[11px] text-slate-400">Showing {history.items.length} of {history.total}</p>
                    )}
                </div>
            )}
        </div>
    );
}
