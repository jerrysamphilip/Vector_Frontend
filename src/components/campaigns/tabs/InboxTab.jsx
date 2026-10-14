import { AlertTriangle } from 'lucide-react';
import { useCampaignInbox } from './inbox/useCampaignInbox';
import ImapSetupGuide from './inbox/ImapSetupGuide';
import InboxTopBar from './inbox/InboxTopBar';
import ConversationList from './inbox/ConversationList';
import ThreadView from './inbox/ThreadView';

// Campaign inbox (campaign details "Inbox" tab and the /app/inbox page): conversations with prospects,
// the selected thread and replies; shows the IMAP setup guide when no inbox can receive replies.
// State and actions: inbox/useCampaignInbox; panes: inbox/.
export default function InboxTab({ campaignId, inboxIds = [], onTabChange, className = 'h-[600px]' }) {
    const inbox = useCampaignInbox({ campaignId, inboxIds });
    const { imapReady, setImapReady, conversations, loading, syncError } = inbox;


    // Show IMAP setup guide when not configured
    if (imapReady === false && conversations.length === 0 && !loading) {
        return (
            <div className={`flex flex-col ${className} rounded-2xl overflow-hidden border border-amber-200 bg-white`}
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                {/* Top bar */}
                <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-amber-100"
                    style={{ background: 'rgba(245,158,11,0.06)' }}>
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold text-amber-700">IMAP not configured — replies cannot be received</span>
                    <button
                        onClick={() => setImapReady(null)}
                        className="ml-auto text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100"
                    >
                        Dismiss
                    </button>
                </div>
                <ImapSetupGuide onGoToAccounts={onTabChange} />
            </div>
        );
    }

    return (
        <div className={`flex flex-col ${className} rounded-2xl overflow-hidden border border-gray-100 bg-white`}
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

            {/* ── Top bar ── */}
            <InboxTopBar inbox={inbox} />


            {syncError && (
                <div className="shrink-0 mx-4 mt-2 px-3 py-2 rounded-lg text-[11px] text-red-600 bg-red-50 border border-red-200 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                    <span>{syncError}</span>
                </div>
            )}

            {/* ── Main area ── */}
            <div className="flex flex-1 min-h-0">
                {/* Left: conversation list */}
                <ConversationList inbox={inbox} />

                {/* Right: thread */}
                <ThreadView inbox={inbox} />
            </div>
        </div>
    );
}
