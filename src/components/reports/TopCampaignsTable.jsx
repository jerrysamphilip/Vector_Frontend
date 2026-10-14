import { TrendingUp, Download } from 'lucide-react';
import { Skeleton } from './reportWidgets';

// Reports: top campaigns by engagement (with CSV export).

// ── Top campaigns table ─────────────────────────────────────────
export default function TopCampaignsTable({ campaigns, loading, onExport, exporting }) {
    const statusCls = s =>
        s === 'ACTIVE'    ? 'bg-emerald-50 text-emerald-700' :
        s === 'PAUSED'    ? 'bg-orange-50 text-orange-700'   :
        s === 'COMPLETED' ? 'bg-blue-50 text-blue-700'       :
        'bg-gray-100 text-gray-500';

    return (
        <div className="card-anim bg-white/80 rounded-2xl shadow-sm overflow-hidden" style={{ animationDelay: '620ms' }}>
            <div className="px-6 pt-6 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}>
                        <TrendingUp className="w-3.5 h-3.5" style={{ color: '#2d6bbf' }} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">Top Campaign Performance</p>
                        <p className="text-xs text-gray-400">Ranked by emails sent</p>
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
                            {['Campaign', 'Status', 'Sent', 'Opened', 'Replied', 'Open %', 'Reply %', 'Bounce %'].map(h => (
                                <th key={h} className={`px-5 py-3 text-xs font-semibold text-slate-500 ${h === 'Campaign' ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [1,2,3,4].map(i => (
                                <tr key={i} className={i % 2 !== 0 ? 'bg-gray-50/40' : ''}>
                                    {[1,2,3,4,5,6,7,8].map(j => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                                </tr>
                            ))
                        ) : campaigns?.length > 0 ? campaigns.map((c, i) => (
                            <tr key={c.campaign_id} className={`transition-colors hover:bg-blue-50/30 ${i % 2 !== 0 ? 'bg-gray-50/40' : ''}`}>
                                <td className="px-5 py-3.5 font-medium text-gray-800 max-w-[200px] truncate">{c.campaign_name}</td>
                                <td className="px-4 py-3.5 text-right">
                                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusCls(c.status)}`}>{c.status}</span>
                                </td>
                                <td className="px-4 py-3.5 text-right text-gray-600">{c.sent_count?.toLocaleString()}</td>
                                <td className="px-4 py-3.5 text-right text-gray-600">{c.opened_count?.toLocaleString()}</td>
                                <td className="px-4 py-3.5 text-right text-gray-600">{c.replied_count?.toLocaleString()}</td>
                                <td className="px-4 py-3.5 text-right font-semibold" style={{ color: '#73C8D2' }}>{c.open_rate}%</td>
                                <td className="px-4 py-3.5 text-right font-semibold text-emerald-600">{c.reply_rate}%</td>
                                <td className="px-4 py-3.5 text-right font-semibold" style={{ color: '#FF9013' }}>{c.bounce_rate}%</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={8} className="px-5 py-8 text-center text-gray-400 text-sm">No campaigns found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
