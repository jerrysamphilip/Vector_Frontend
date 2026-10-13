import { useState } from 'react';
import { Copy, Check, RefreshCcw, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

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
 * DNS records to publish for a sending domain (SPF / DKIM / DMARC guidance; nothing is
 * verified by showing them), the last checked statuses and a "Check status" button that runs
 * the existing diagnostics scan (POST /deliverability/domains/{domain}/scans).
 */
export default function DnsRecordsPanel({ domainName, records = [], statuses, dkimTokensAvailable, onRefresh, refreshing, canRefresh = true }) {
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
            <p className="text-xs text-gray-500">
                Add these records at your DNS provider for <span className="font-mono font-semibold text-gray-700">{domainName}</span>.
                DNS changes can take up to 48 hours to show; use “Check status” afterwards.
                {!dkimTokensAvailable && ' The DKIM tokens come from Amazon SES and are not available here yet.'}
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-3 py-2">Purpose</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Host / name</th><th className="px-3 py-2">Value</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {records.map((r, i) => (
                            <tr key={`${r.kind}-${i}`} className="align-top">
                                <td className="px-3 py-2">
                                    <p className="font-semibold text-gray-800">{r.kind.replace('_', ' ')}{!r.required && <span className="ml-1 font-normal text-gray-400">(optional)</span>}</p>
                                    {r.note && <p className="text-[11px] text-gray-500 mt-0.5 max-w-xs">{r.note}</p>}
                                </td>
                                <td className="px-3 py-2 font-mono text-gray-700">{r.type}</td>
                                <td className="px-3 py-2 font-mono text-gray-700 break-all"><span className="inline-flex items-start gap-1">{r.host}<CopyButton value={r.host} label={`${r.kind} host`} /></span></td>
                                <td className="px-3 py-2 font-mono text-gray-700 break-all"><span className="inline-flex items-start gap-1">{r.value}<CopyButton value={r.value} label={`${r.kind} value`} /></span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
