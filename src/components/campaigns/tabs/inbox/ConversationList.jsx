import Loading from '../../../common/Loading';
import ConversationListItem from './ConversationListItem';
import { Mail } from 'lucide-react';

// Left pane: the campaign's conversations (loading / empty states).
export default function ConversationList({ inbox }) {
    const {
        filteredConversations, loading
    } = inbox;
    return (
        <div className="w-80 flex flex-col border-r border-gray-100 shrink-0" style={{ background: '#fafaf9' }}>
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <Loading text="Loading…" size="md" />
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 px-6 text-center">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf18, #73C8D218)' }}>
                            <Mail className="w-5 h-5" style={{ color: '#2d6bbf' }} />
                        </div>
                        <p className="text-sm font-medium text-gray-500">No emails yet</p>
                        <p className="text-xs mt-1 text-gray-400">Send a campaign then click Sync to pull replies.</p>
                    </div>
                ) : (
                    filteredConversations.map(c => (
                        <ConversationListItem key={c.id} c={c} inbox={inbox} />
                    ))
                )}
            </div>
        </div>
    );
}
