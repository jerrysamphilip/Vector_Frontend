import { Users } from 'lucide-react';

// Reports: per-user performance (org-wide view only).

// ── Team Performance Table ───────────────────────────────────────
export default function TeamPerformanceTable({ users, loading }) {
    const roleColors = {
        PLATFORM_ADMIN: { bg: 'rgba(99,102,241,0.1)',   color: '#4f46e5' },
        SUPER_ADMIN:    { bg: 'rgba(45,107,191,0.1)',    color: '#2d6bbf' },
        ADMIN:          { bg: 'rgba(115,200,210,0.12)',  color: '#4db0bb' },
        MANAGER:        { bg: 'rgba(245,158,11,0.1)',    color: '#d97706' },
        AGENT:          { bg: 'rgba(16,185,129,0.1)',    color: '#059669' },
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100"
                style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.15), rgba(115,200,210,0.15))' }}>
                    <Users className="w-4 h-4" style={{ color: '#2d6bbf' }} />
                </div>
                <div>
                    <p className="text-sm font-semibold text-gray-800">Team Performance</p>
                    <p className="text-xs text-gray-400">Per-user breakdown for the selected period</p>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr style={{ background: 'rgba(45,107,191,0.04)' }}>
                            {['Team Member', 'Role', 'Campaigns', 'Sent', 'Opened', 'Replied', 'Open Rate', 'Reply Rate', 'Bounce Rate'].map(h => (
                                <th key={h} className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i}>
                                {Array.from({ length: 9 }).map((_, j) => (
                                    <td key={j} className="px-4 py-3.5">
                                        <div className="h-3.5 bg-gray-100 rounded animate-pulse" style={{ width: j === 0 ? 120 : 48 }} />
                                    </td>
                                ))}
                            </tr>
                        )) : users?.length > 0 ? users.map((u, i) => {
                            const rc = roleColors[u.role] || roleColors.AGENT;
                            return (
                                <tr key={u.user_id} className={`transition-colors hover:bg-blue-50/30 ${i % 2 !== 0 ? 'bg-gray-50/40' : ''}`}>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                                                style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                                                {u.first_name?.[0]}{u.last_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800">{u.first_name} {u.last_name}</p>
                                                <p className="text-gray-400">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                                            style={{ background: rc.bg, color: rc.color }}>{u.role}</span>
                                    </td>
                                    <td className="px-4 py-3.5 text-gray-700 font-medium">{u.campaigns_created}</td>
                                    <td className="px-4 py-3.5 text-gray-700">{u.total_sent.toLocaleString()}</td>
                                    <td className="px-4 py-3.5 text-gray-700">{u.total_opened.toLocaleString()}</td>
                                    <td className="px-4 py-3.5 text-gray-700">{u.total_replied.toLocaleString()}</td>
                                    <td className="px-4 py-3.5 font-semibold" style={{ color: '#2d6bbf' }}>{u.open_rate}%</td>
                                    <td className="px-4 py-3.5 font-semibold text-emerald-600">{u.reply_rate}%</td>
                                    <td className="px-4 py-3.5 font-semibold" style={{ color: '#FF9013' }}>{u.bounce_rate}%</td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={9} className="px-5 py-8 text-center text-gray-400">No team data available</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
