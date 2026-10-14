import MessageBubble from './MessageBubble';
import ReplyComposer from './ReplyComposer';
import { Mail, MoreVertical, RefreshCw } from 'lucide-react';
import { Avatar } from './inboxShared';

// Right pane: the selected conversation's messages and the reply composer.
export default function ThreadView({ inbox }) {
    const {
        activeConversation, fetchMessages, messagesEndRef, normalizedMessages, refreshing, selectedId
    } = inbox;
    return (
        <div className="flex-1 flex flex-col bg-white min-w-0">
            {selectedId ? (
                <>
                    <div className="shrink-0 h-16 px-5 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar name={activeConversation?.prospect_name} email={activeConversation?.prospect_email} size={38} />
                            <div>
                                <p className="text-sm font-semibold text-gray-900 leading-tight">
                                    {activeConversation?.prospect_name || activeConversation?.prospect_email}
                                </p>
                                <p className="text-xs text-gray-400">{activeConversation?.prospect_email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => selectedId && fetchMessages(selectedId)} disabled={refreshing}
                                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40">
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            </button>
                            <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4"
                        style={{ background: 'linear-gradient(180deg, #fafaf9 0%, #f6f4ee 100%)' }}>
                        {normalizedMessages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <Mail className="w-8 h-8 mb-2 opacity-40" />
                                <p className="text-sm">No messages in this thread yet</p>
                            </div>
                        ) : normalizedMessages.map((m, idx) => (
                            <MessageBubble key={m.message_id || idx} m={m} inbox={inbox} />
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <ReplyComposer inbox={inbox} />
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-4"
                    style={{ background: 'linear-gradient(135deg, #fafaf9, #f6f4ee)' }}>
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf18, #73C8D218)' }}>
                        <Mail className="w-9 h-9" style={{ color: '#2d6bbf' }} />
                    </div>
                    <div className="text-center">
                        <p className="text-base font-semibold text-gray-600">Select a conversation</p>
                        <p className="text-sm text-gray-400 mt-1">Choose an email thread to view the full conversation</p>
                    </div>
                </div>
            )}
        </div>
    );
}
