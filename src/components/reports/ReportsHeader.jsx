import { User, ChevronDown, Download, RefreshCw } from 'lucide-react';
import { DATE_RANGES, formatDateLabel } from './reportWidgets';

// Reports header: title + date label, the user filter dropdown, date-range tabs, CSV / Word export, retry.
export default function ReportsHeader({ report }) {
    const {
        range, setRange, selectedUserId, setSelectedUserId, userDropdownOpen, setUserDropdownOpen, userDropdownRef,
        exportingGlobal, exportingDocx, isFetching, error, refetch, cachedTeamMembers, canFilterUsers, selectedUser,
        handleExportGlobal, handleExportDocx,
    } = report;

    return (
        <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">Analytics & Reports</h1>
                <p className="text-sm text-gray-400 mt-0.5">{formatDateLabel(range)}</p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
                {/* User filter dropdown — admins only */}
                {canFilterUsers && (
                    <div className="relative" ref={userDropdownRef}>
                        <button
                            onClick={() => setUserDropdownOpen(o => !o)}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all"
                            style={selectedUserId
                                ? { background: 'rgba(45,107,191,0.08)', color: '#2d6bbf', borderColor: 'rgba(45,107,191,0.25)' }
                                : { background: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }}>
                            <User className="w-3.5 h-3.5" />
                            {selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : 'All Users'}
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {userDropdownOpen && (
                            <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                                <button
                                    onClick={() => { setSelectedUserId(null); setUserDropdownOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-blue-50 ${!selectedUserId ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                                    All Users
                                </button>
                                <div className="border-t border-gray-100" />
                                {cachedTeamMembers?.map(u => (
                                    <button key={u.user_id}
                                        onClick={() => { setSelectedUserId(u.user_id); setUserDropdownOpen(false); }}
                                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-blue-50 ${selectedUserId === u.user_id ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                                        <p className="font-semibold">{u.first_name} {u.last_name}</p>
                                        <p className="text-gray-400">{u.role}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Date range tabs */}
                <div className="relative flex items-center bg-white border border-gray-100 rounded-xl p-1">
                    {DATE_RANGES.map(r => (
                        <button key={r.days} onClick={() => setRange(r.days)} disabled={isFetching}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                            style={range === r.days
                                ? { background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)', color: '#ffffff' }
                                : { color: '#9ca3af' }
                            }
                        >{r.label}</button>
                    ))}
                    {isFetching && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse"
                            style={{ background: '#0046FF' }} />
                    )}
                </div>

                {/* Export CSV */}
                <button onClick={handleExportGlobal} disabled={exportingGlobal}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-xl disabled:opacity-50 transition-all hover:opacity-90 shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                    <Download className="w-3.5 h-3.5" />
                    {exportingGlobal ? 'Exporting…' : 'Export CSV'}
                </button>

                {/* Export Word */}
                <button onClick={handleExportDocx} disabled={exportingDocx}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl disabled:opacity-50 transition-all hover:opacity-90 shadow-sm border"
                    style={{ background: '#fff', color: '#2d6bbf', borderColor: '#2d6bbf' }}>
                    <Download className="w-3.5 h-3.5" />
                    {exportingDocx ? 'Generating…' : 'Export Word'}
                </button>

                {error && (
                    <button onClick={() => refetch()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-xl"
                        style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>
                        <RefreshCw className="w-3.5 h-3.5" /> Retry
                    </button>
                )}
            </div>
        </div>
    );
}
