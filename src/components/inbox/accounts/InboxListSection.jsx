import { AnimatePresence } from 'framer-motion';
import Loading from '../../common/Loading';
import { INBOX_FILTERS } from './useEmailAccounts';
import InboxRow from './InboxRow';
import { Mail, Plus, Search } from 'lucide-react';

// Mailbox search + filter bar and the inbox table (loading / error / empty states).
export default function InboxListSection({ accounts }) {
    const {
        connectMs365, error, filterKey, filteredInboxes, isLoading, openConnectionWizard, searchTerm,
        selectedInboxId, setDetailTab, setFilterKey, setInboxToDelete, setSearchTerm, setSelectedInboxId,
        updateMutation
    } = accounts;
    return (
        <div className="space-y-4">

            {/* Search + filter bar */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search by email or provider…"
                        className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-700 outline-none transition focus:border-[#0046FF]/40 focus:ring-2 focus:ring-[#0046FF]/10"
                    />
                </div>
                <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1">
                    {INBOX_FILTERS.map(f => (
                        <button key={f.key} onClick={() => setFilterKey(f.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                filterKey === f.key
                                    ? 'bg-white shadow-sm border border-gray-100 text-[#0046FF]'
                                    : 'text-gray-400 hover:text-gray-600'
                            }`}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table card */}
            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
                    Failed to load inboxes: {error.message}
                </div>
            ) : isLoading ? (
                <div className="flex items-center justify-center py-16"><Loading/></div>
            ) : filteredInboxes.length === 0 ? (
                <div className="card-anim flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/60 py-20 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                        <Mail size={24} className="text-gray-400"/>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-gray-700">No mailboxes match</p>
                    <p className="mt-1 text-xs text-gray-400">Try a different filter or connect a new inbox.</p>
                    <button
                        onClick={() => openConnectionWizard()}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
                        style={{ background: 'linear-gradient(135deg,#0046FF,#73C8D2)' }}>
                        <Plus size={14}/> Connect Mailbox
                    </button>
                </div>
            ) : (
                <div className="card-anim bg-white/80 rounded-2xl shadow-sm overflow-hidden" style={{ animationDelay: '120ms' }}>
                    <div className="overflow-x-auto">
                        {/* Table header */}
                        <div className="grid grid-cols-[minmax(210px,1fr)_160px_110px_180px_90px_130px] gap-3 items-center px-5 py-3 border-b border-gray-100 bg-gray-50/50 min-w-980px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Account</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Provider</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sent Today</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">Score</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Actions</span>
                        </div>

                        <AnimatePresence mode="popLayout">
                            {filteredInboxes.map(inbox => (
                                <InboxRow
                                    key={inbox.inbox_id}
                                    inbox={inbox}
                                    isSelected={selectedInboxId === inbox.inbox_id}
                                    onSelect={id => { setSelectedInboxId(id); setDetailTab('Overview'); }}
                                    onEdit={openConnectionWizard}
                                    onDelete={setInboxToDelete}
                                    onToggleWarmup={inbox => updateMutation.mutate({
                                        id: inbox.inbox_id,
                                        data: { warmup_enabled: !inbox.warmup_enabled },
                                    })}
                                    isUpdating={updateMutation.isPending}
                                    onConnectMs365={connectMs365}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </div>
    );
}
