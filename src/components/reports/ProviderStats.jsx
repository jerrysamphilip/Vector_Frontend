import { Server, Monitor } from 'lucide-react';
import { Skeleton } from './reportWidgets';

// Reports: per-provider performance table and the mailbox stats card.

// ── Provider performance table ──────────────────────────────────
export const PROVIDER_ICON = p => ({ ses: '📧', gmail: '📬', outlook: '📮', smtp: '📡', sendgrid: '📨' }[p?.toLowerCase()] || '📭');

export function ProviderTable({ providers, loading }) {
    return (
        <div className="card-anim bg-white/80 rounded-2xl shadow-sm overflow-hidden" style={{ animationDelay: '540ms' }}>
            <div className="px-6 pt-6 pb-3 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}>
                    <Server className="w-3.5 h-3.5" style={{ color: '#2d6bbf' }} />
                </div>
                <div>
                    <p className="text-sm font-semibold text-gray-800">Email Providers</p>
                    <p className="text-xs text-gray-400">Sending performance by provider</p>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            {['Provider', 'Sent', 'Delivered', 'Open %', 'Reply %', 'Bounce %'].map(h => (
                                <th key={h} className={`px-5 py-3 text-xs font-semibold text-slate-500 ${h === 'Provider' ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [1, 2].map(i => (
                                <tr key={i} className={i % 2 !== 0 ? 'bg-gray-50/40' : ''}>
                                    {[1,2,3,4,5,6].map(j => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                                </tr>
                            ))
                        ) : providers?.length > 0 ? providers.map((p, i) => (
                            <tr key={p.provider} className={`transition-colors hover:bg-blue-50/30 ${i % 2 !== 0 ? 'bg-gray-50/40' : ''}`}>
                                <td className="px-5 py-3 font-medium text-gray-800 capitalize">
                                    <span className="mr-2">{PROVIDER_ICON(p.provider)}</span>{p.provider || 'Unknown'}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600">{p.sent_count?.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right text-gray-600">{p.delivered_count?.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right font-semibold" style={{ color: '#73C8D2' }}>{p.open_rate}%</td>
                                <td className="px-4 py-3 text-right font-semibold text-emerald-600">{p.reply_rate}%</td>
                                <td className="px-4 py-3 text-right font-semibold" style={{ color: '#FF9013' }}>{p.bounce_rate}%</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400 text-sm">No provider data for this period</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Mailbox stats mini card ─────────────────────────────────────
export function MailboxStatsCard({ stats, loading }) {
    const items = [
        { label: 'Total Connected', value: stats?.total_connected ?? 0, color: '#0046FF' },
        { label: 'In Use',          value: stats?.mailbox_in_use  ?? 0, color: '#2d6bbf' },
        { label: 'Disconnected',    value: stats?.disconnected    ?? 0, color: '#FF9013' },
        { label: 'No Warmup',       value: stats?.without_warmup  ?? 0, color: '#e6a830' },
    ];
    return (
        <div className="card-anim bg-white/80 rounded-2xl shadow-sm p-6" style={{ animationDelay: '580ms' }}>
            <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}>
                    <Monitor className="w-3.5 h-3.5" style={{ color: '#2d6bbf' }} />
                </div>
                <p className="text-sm font-semibold text-gray-800">Mailbox Stats</p>
            </div>
            <div className="space-y-4">
                {items.map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{item.label}</span>
                        {loading ? <Skeleton className="h-5 w-8" /> : (
                            <span className="text-base font-bold" style={{ color: item.color }}>{item.value}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
