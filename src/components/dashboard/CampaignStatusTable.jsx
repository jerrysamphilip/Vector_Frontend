import { hasPermission } from '../../lib/authStorage';
import { Plus } from 'lucide-react';

// Dashboard: the top campaigns by emails sent, with open / reply rate and status.
export default function CampaignStatusTable({ dashboard }) {
    const {
        navigate, statusColors, topCampaigns
    } = dashboard;
    return (
        <div className="card-anim xl:col-span-2 bg-white/80 rounded-2xl shadow-sm overflow-hidden" style={{ animationDelay: '800ms' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                <div>
                    <p className="text-sm font-semibold text-gray-800">Campaign Status</p>
                    <p className="text-xs text-gray-400 mt-0.5">Overview of all campaigns</p>
                </div>
                {hasPermission('manage_campaigns') && (
                    <button
                        onClick={() => navigate('/app/campaigns/new')}
                        className="flex items-center gap-1.5 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-sm hover:opacity-90 transition-opacity"
                        style={{ background: 'linear-gradient(135deg, #0046FF, #73C8D2)' }}
                    >
                        <Plus size={13}/> New
                    </button>
                )}
            </div>
            <div className="overflow-x-auto"><table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="py-3 px-5 text-xs font-semibold text-slate-500/90 uppercase tracking-wider">Campaign</th>
                        <th className="py-3 px-5 text-xs font-semibold text-slate-500/90 uppercase tracking-wider text-center">Sent</th>
                        <th className="py-3 px-5 text-xs font-semibold text-slate-500/90 uppercase tracking-wider text-center">Open %</th>
                        <th className="py-3 px-5 text-xs font-semibold text-slate-500/90 uppercase tracking-wider text-center">Reply %</th>
                        <th className="py-3 px-5 text-xs font-semibold text-slate-500/90 uppercase tracking-wider text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {topCampaigns.length === 0 ? (
                        <tr>
                            <td colSpan="5" className="py-10 text-center text-gray-300 text-sm">No campaigns yet</td>
                        </tr>
                    ) : topCampaigns.map((c) => {
                        const oRate = c.sent_count > 0 ? ((c.opened_count / c.sent_count) * 100).toFixed(1) : '0.0';
                        const rRate = c.sent_count > 0 ? ((c.replied_count / c.sent_count) * 100).toFixed(1) : '0.0';
                        return (
                            <tr key={c.campaign_id}
                                className="hover:bg-gray-50/60 cursor-pointer transition-colors group"
                                onClick={() => navigate(`/app/campaigns/${c.campaign_id}`)}>
                                <td className="py-3.5 px-5">
                                    <span className="text-sm font-medium text-gray-700 transition-colors truncate block max-w-[180px] group-hover:text-[#0046FF]">{c.campaign_name}</span>
                                </td>
                                <td className="py-3.5 px-5 text-center text-sm font-semibold text-gray-700">{(c.sent_count || 0).toLocaleString()}</td>
                                <td className="py-3.5 px-5 text-center">
                                    <span className={`text-sm font-semibold ${parseFloat(oRate) >= 20 ? 'text-emerald-500' : parseFloat(oRate) > 0 ? 'text-amber-500' : 'text-gray-400'}`}>{oRate}%</span>
                                </td>
                                <td className="py-3.5 px-5 text-center">
                                    <span className={`text-sm font-semibold ${parseFloat(rRate) >= 5 ? 'text-emerald-500' : parseFloat(rRate) > 0 ? 'text-blue-500' : 'text-gray-400'}`}>{rRate}%</span>
                                </td>
                                <td className="py-3.5 px-5 text-right">
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColors[c.status] || 'bg-gray-100 text-gray-500'}`}>{c.status.toLowerCase()}</span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table></div>
        </div>
    );
}
