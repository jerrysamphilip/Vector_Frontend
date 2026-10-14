import { Mail, RefreshCw, Search } from 'lucide-react';

// Inbox top bar: unread count, search, IMAP sync and refresh.
export default function InboxTopBar({ inbox }) {
    const {
        fetchConversations, fetchMessages, handleSyncNow, loading, searchQuery, selectedId, setSearchQuery, syncing,
        unreadCount
    } = inbox;
    return (
        <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" style={{ color: '#2d6bbf' }} />
                <span className="text-sm font-semibold text-gray-700">Inbox</span>
                {unreadCount > 0 && (
                    <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                        {unreadCount}
                    </span>
                )}
            </div>
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by name, email or subject…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-1.5 pl-9 pr-3 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-all"
                />
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <button
                    onClick={handleSyncNow}
                    disabled={syncing || loading}
                    title="Sync replies from mail provider"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40"
                    style={{ background: 'rgba(45,107,191,0.08)', color: '#2d6bbf' }}
                >
                    <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing…' : 'Sync'}
                </button>
                <button
                    onClick={() => { fetchConversations(); if (selectedId) fetchMessages(selectedId); }}
                    disabled={loading}
                    title="Refresh"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </div>
    );
}
