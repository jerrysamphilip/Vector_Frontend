import { formatDateTime } from '../../lib/dates';
import { useState } from 'react';
import { Copy, Check, RefreshCcw, CheckCircle2, XCircle, AlertTriangle, Info, PlusCircle, PencilLine, HelpCircle } from 'lucide-react';

const STATUS_TONE = {
    PASS: ['text-emerald-700 bg-emerald-50', CheckCircle2],
    FAIL: ['text-red-700 bg-red-50', XCircle],
    WARNING: ['text-amber-700 bg-amber-50', AlertTriangle],
    PENDING: ['text-amber-700 bg-amber-50', AlertTriangle],
};

export function AuthStatus({ label, status }) {
    const [tone, Icon] = STATUS_TONE[status] || ['text-gray-500 bg-gray-100', Info];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${tone}`} data-testid={`status-${label.toLowerCase()}`}>
            <Icon className="w-3 h-3" />{label}: {status || 'UNKNOWN'}
        </span>
    );
}

// Live DNS comparison per record (S-25). Shown with an icon and a word, never by colour alone.
export const RECORD_STATUS = {
    OK: { label: 'OK', tone: 'text-emerald-700 bg-emerald-50', Icon: CheckCircle2, hint: 'Published as needed' },
    ADD: { label: 'Add', tone: 'text-amber-800 bg-amber-50', Icon: PlusCircle, hint: 'Not found in DNS: add this record' },
    UPDATE: { label: 'Update', tone: 'text-orange-800 bg-orange-50', Icon: PencilLine, hint: 'DNS has a different value: replace it with the value to publish' },
    UNKNOWN: { label: 'Unknown', tone: 'text-gray-600 bg-gray-100', Icon: HelpCircle, hint: 'DNS could not be checked, or the expected value is not known yet' },
};

export function RecordStatusBadge({ status }) {
    const { label, tone, Icon, hint } = RECORD_STATUS[status] || RECORD_STATUS.UNKNOWN;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${tone}`} title={hint}>
            <Icon className="w-3 h-3" aria-hidden="true" />{label}
        </span>
    );
}

/** API timestamps are UTC, often without a zone suffix. */
function formatCheckedAt(value) {
    return formatDateTime(value, { locale: 'en', fallback: null });
}

/** "2 OK · 1 to add · 1 to update" from live_summary (zero counts left out). */
export function liveSummaryText(summary) {
    if (!summary) return '';
    const parts = [['OK', 'OK'], ['ADD', 'to add'], ['UPDATE', 'to update'], ['UNKNOWN', 'unknown']]
        .filter(([k]) => summary[k] > 0).map(([k, word]) => `${summary[k]} ${word}`);
    return parts.join(' · ');
}

function CopyButton({ value, label }) {
    const [copied, setCopied] = useState(false);
    return (
        <button type="button" aria-label={`Copy ${label}`}
            onClick={async () => {
                try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
            }}
            className="p-1 text-gray-400 hover:text-indigo-600 rounded">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
    );
}

/**
 * DNS records to publish for a sending domain (SPF / DKIM / DMARC), the last checked statuses and a
 * "Check status" button that runs the existing diagnostics scan (POST /deliverability/domains/{domain}/scans).
 * With the live comparison (S-25) each record shows OK / Add / Update / Unknown, what DNS has now and the
 * value to publish (for SPF merged into the existing record), plus the summary and when DNS was checked.
 */
export default function DnsRecordsPanel({ domainName, records = [], statuses, dkimTokensAvailable, onRefresh, refreshing, canRefresh = true,
    liveSummary, liveCheckedAt }) {
    // With the live comparison (GET .../dns-records, live=true) each record has a status, the current and the
    // suggested value; right after adding a domain the records are guidance only.
    const live = records.some(r => r.status);
    const checkedAt = formatCheckedAt(liveCheckedAt);
    const summary = liveSummaryText(liveSummary);
    return (
        <div className="space-y-3" data-testid="dns-records-panel">
            <div className="flex items-center gap-2 flex-wrap">
                {statuses && ['spf', 'dkim', 'dmarc'].map(k => <AuthStatus key={k} label={k.toUpperCase()} status={statuses[`${k}_status`]} />)}
                {canRefresh && onRefresh && (
                    <button type="button" onClick={onRefresh} disabled={refreshing}
                        className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                        <RefreshCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Checking…' : 'Check status'}
                    </button>
                )}
            </div>
            {live && (summary || checkedAt) && (
                <p className="text-xs text-gray-600" data-testid="dns-live-summary">
                    {summary && <><span className="font-semibold text-gray-800">Live DNS:</span> {summary}</>}
                    {summary && checkedAt && ' · '}
                    {checkedAt && <>checked {checkedAt}</>}
                </p>
            )}
            <p className="text-xs text-gray-500">
                Add these records at your DNS provider for <span className="font-mono font-semibold text-gray-700">{domainName}</span>.
                DNS changes can take up to 48 hours to show; use “Check status” afterwards.
                {!dkimTokensAvailable && ' The DKIM tokens come from Amazon SES and are not available here yet.'}
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-3 py-2">Purpose</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Host / name</th>
                            {live ? <><th className="px-3 py-2">Status</th><th className="px-3 py-2">Current value</th><th className="px-3 py-2">Value to publish</th></>
                                : <th className="px-3 py-2">Value</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {records.map((r, i) => {
                            const publish = r.suggested_value ?? r.value;
                            const current = r.current_values?.length > 1 ? r.current_values : (r.current_value ? [r.current_value] : []);
                            return (
                                <tr key={`${r.kind}-${i}`} className="align-top">
                                    <td className="px-3 py-2">
                                        <p className="font-semibold text-gray-800">{r.kind.replace('_', ' ')}{!r.required && <span className="ml-1 font-normal text-gray-400">(optional)</span>}</p>
                                        {r.note && <p className="text-[11px] text-gray-500 mt-0.5 max-w-xs">{r.note}</p>}
                                    </td>
                                    <td className="px-3 py-2 font-mono text-gray-700">{r.type}</td>
                                    <td className="px-3 py-2 font-mono text-gray-700 break-all"><span className="inline-flex items-start gap-1">{r.host}<CopyButton value={r.host} label={`${r.kind} host`} /></span></td>
                                    {live ? (
                                        <>
                                            <td className="px-3 py-2"><RecordStatusBadge status={r.status} /></td>
                                            <td className="px-3 py-2 font-mono text-gray-600 break-all">
                                                {current.length ? current.map((v, j) => <p key={j}>{v}</p>) : <span className="font-sans text-gray-400">{r.status === 'UNKNOWN' ? 'Not checked' : 'None'}</span>}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-gray-700 break-all">
                                                {publish ? <span className="inline-flex items-start gap-1">{publish}<CopyButton value={publish} label={`${r.kind} value to publish`} /></span> : '—'}
                                            </td>
                                        </>
                                    ) : (
                                        <td className="px-3 py-2 font-mono text-gray-700 break-all"><span className="inline-flex items-start gap-1">{r.value}<CopyButton value={r.value} label={`${r.kind} value`} /></span></td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
