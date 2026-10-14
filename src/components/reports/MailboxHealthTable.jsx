import { Inbox, Download } from 'lucide-react';
import { Skeleton } from './reportWidgets';

// Reports: mailbox health table (with deliverability CSV export).

// ── Mailbox health table ────────────────────────────────────────
export default function MailboxHealthTable({ mailboxHealth, loading, onExport, exporting }) {
    return (
        <div className="card-anim bg-white/80 rounded-2xl shadow-sm overflow-hidden" style={{ animationDelay: '660ms' }}>
            <div className="px-6 pt-6 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}>
                        <Inbox className="w-3.5 h-3.5" style={{ color: '#2d6bbf' }} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">Mailbox Health</p>
                        <p className="text-xs text-gray-400">Per-mailbox engagement metrics</p>
                    </div>
                </div>
                <button onClick={onExport} disabled={exporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-xl disabled:opacity-50 transition-all hover:opacity-90 shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                    <Download className="w-3.5 h-3.5" />
                    {exporting ? 'Exporting…' : 'Export CSV'}
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            {['Mailbox', 'Leads', 'Sent', 'Opens', 'Open %', 'Replies', 'Reply %', 'Bounce %'].map(h => (
                                <th key={h} className={`px-5 py-3 text-xs font-semibold text-slate-500 ${h === 'Mailbox' ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [1,2,3].map(i => (
                                <tr key={i} className={i % 2 !== 0 ? 'bg-gray-50/40' : ''}>
                                    {[1,2,3,4,5,6,7,8].map(j => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                                </tr>
                            ))
                        ) : mailboxHealth?.length > 0 ? mailboxHealth.map((m, i) => (
                            <tr key={m.mailbox} className={`transition-colors hover:bg-blue-50/30 ${i % 2 !== 0 ? 'bg-gray-50/40' : ''}`}>
                                <td className="px-5 py-3.5 font-medium text-gray-800 text-xs max-w-[180px] truncate">{m.mailbox}</td>
                                <td className="px-4 py-3.5 text-right text-gray-600">{m.lead_contacted}</td>
                                <td className="px-4 py-3.5 text-right text-gray-600">{m.email_sent}</td>
                                <td className="px-4 py-3.5 text-right text-gray-600">{m.opened}</td>
                                <td className="px-4 py-3.5 text-right font-semibold" style={{ color: '#73C8D2' }}>{m.opened_rate}%</td>
                                <td className="px-4 py-3.5 text-right text-gray-600">{m.replied}</td>
                                <td className="px-4 py-3.5 text-right font-semibold text-emerald-600">{m.replied_rate}%</td>
                                <td className="px-4 py-3.5 text-right font-semibold" style={{ color: '#FF9013' }}>{m.bounce_rate}%</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={8} className="px-5 py-8 text-center text-gray-400 text-sm">No mailbox data available</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
