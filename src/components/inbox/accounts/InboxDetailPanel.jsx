import Loading from '../../common/Loading';
import InboxOverviewTab from './InboxOverviewTab';
import InboxSettingsTab from './InboxSettingsTab';
import InboxActivityTab from './InboxActivityTab';
import ConnectionPanel from './ConnectionPanel';
import { ShieldCheck, X } from 'lucide-react';
import { TABS } from './shared';
import { ResumeButton } from './PausedMailbox';
import { isPaused } from './useEmailAccounts';

// Right-hand panel: the selected inbox's Overview / Connection / Settings / Activity tabs.
export default function InboxDetailPanel({ accounts }) {
    const {
        detailLoading, detailTab, inboxes, openConnectionWizard, selectedInboxId, selectedInboxSummary,
        setDetailTab, setSelectedInboxId, resumeMutation,
    } = accounts;
    const listed = (inboxes || []).find(i => i.inbox_id === selectedInboxId);
    return (
        <div className="min-w-0">
            <div className="card-anim sticky top-6 rounded-2xl bg-white/80 shadow-sm overflow-hidden" style={{ animationDelay: '160ms' }}>

                {/* Panel header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50"
                     style={{ background: 'linear-gradient(135deg,rgba(0,70,255,0.04),rgba(115,200,210,0.06),#fff)' }}>
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={16} style={{ color: '#0046FF' }}/>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">
                                {selectedInboxSummary ? 'Inbox Detail' : 'Warmup Control'}
                            </p>
                            <p className="text-xs text-gray-400">
                                {selectedInboxSummary ? selectedInboxSummary.email_address : 'Select a mailbox to inspect'}
                            </p>
                        </div>
                    </div>
                    {selectedInboxId && (
                        <button onClick={() => setSelectedInboxId(null)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
                            <X size={14}/>
                        </button>
                    )}
                </div>

                {listed && isPaused(listed) && (
                    <div role="status" className="flex items-start justify-between gap-3 border-b border-amber-100 bg-amber-50 px-5 py-3">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-amber-800">Sending is paused</p>
                            <p className="text-[11px] text-amber-700 break-words">{listed.paused_reason || 'Paused by a user'}</p>
                        </div>
                        {resumeMutation && (
                            <ResumeButton onResume={() => resumeMutation.mutate(listed.inbox_id)}
                                busy={resumeMutation.isPending} />
                        )}
                    </div>
                )}

                {/* Empty state */}
                {!selectedInboxId ? (
                    <div className="flex min-h-[520px] flex-col items-center justify-center px-6 py-12 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
                             style={{ background: 'linear-gradient(135deg,#eff3ff,#e0f7fa)' }}>
                            <ShieldCheck size={28} style={{ color: '#0046FF' }}/>
                        </div>
                        <h4 className="mt-5 text-base font-semibold text-gray-900">Select a mailbox</h4>
                        <p className="mt-2 max-w-[240px] text-xs text-gray-400">
                            Click any inbox row to see its reputation, connection settings (sending &amp; receiving), warmup activity and settings.
                        </p>
                    </div>
                ) : detailLoading ? (
                    <div className="flex min-h-[520px] items-center justify-center"><Loading/></div>
                ) : !selectedInboxSummary ? (
                    <div className="p-6 text-sm text-red-500">Failed to load inbox detail.</div>
                ) : (
                    <>
                        {/* Tabs */}
                        <div className="flex border-b border-gray-100 px-4">
                            {TABS.map(tab => (
                                <button key={tab} onClick={() => setDetailTab(tab)}
                                    className={`px-3 py-3 text-xs font-semibold transition-all border-b-2 -mb-px ${
                                        detailTab === tab
                                            ? 'border-[#0046FF] text-[#0046FF]'
                                            : 'border-transparent text-gray-400 hover:text-gray-600'
                                    }`}>
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="max-h-[calc(100vh-300px)] overflow-y-auto">

                            {/* Overview */}
                            {detailTab === 'Overview' && (
                                <InboxOverviewTab accounts={accounts} />
                            )}

                            {/* Connection */}
                            {detailTab === 'Connection' && (
                                <ConnectionPanel
                                    inbox={inboxes.find(i => i.inbox_id === selectedInboxId)}
                                    onEdit={openConnectionWizard}/>
                            )}

                            {/* Settings */}
                            {detailTab === 'Settings' && (
                                <InboxSettingsTab accounts={accounts} />
                            )}

                            {/* Activity */}
                            {detailTab === 'Activity' && (
                                <InboxActivityTab accounts={accounts} />
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
