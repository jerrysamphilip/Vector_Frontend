import { useEffect, useRef } from 'react';
import Loading from '../../../common/Loading';
import ConversationListItem from './ConversationListItem';
import { Mail } from 'lucide-react';

// Left pane: the campaign's conversations, paged by the server: the next page loads when the end of
// the list scrolls into view (or with "Load more"); loading / empty / error states.
export default function ConversationList({ inbox }) {
    const {
        filteredConversations, loading, hasNextPage, isFetchingNextPage, fetchNextPage, searchQuery, loadError, total,
    } = inbox;
    const sentinelRef = useRef(null);
    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || !hasNextPage || typeof IntersectionObserver === 'undefined') return undefined;
        const observer = new IntersectionObserver((entries) => {
            if (entries.some(e => e.isIntersecting) && !isFetchingNextPage) fetchNextPage();
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
    return (
        <div className="w-80 flex flex-col border-r border-gray-100 shrink-0" style={{ background: '#fafaf9' }}>
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <Loading text="Loading…" size="md" />
                    </div>
                ) : loadError && filteredConversations.length === 0 ? (
                    <div role="alert" className="px-6 py-10 text-center text-xs text-red-600">
                        Could not load conversations. They are retried automatically.
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 px-6 text-center">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf18, #73C8D218)' }}>
                            <Mail className="w-5 h-5" style={{ color: '#2d6bbf' }} />
                        </div>
                        <p className="text-sm font-medium text-gray-500">{searchQuery ? 'No matching conversations' : 'No emails yet'}</p>
                        <p className="text-xs mt-1 text-gray-400">
                            {searchQuery ? 'Try another name, email or subject.' : 'Send a campaign then click Sync to pull replies.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {filteredConversations.map(c => (
                            <ConversationListItem key={c.id} c={c} inbox={inbox} />
                        ))}
                        <div ref={sentinelRef} className="px-4 py-3 text-center text-[11px] text-gray-400">
                            {hasNextPage ? (
                                <button type="button" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}
                                    className="font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50">
                                    {isFetchingNextPage ? 'Loading…' : 'Load more'}
                                </button>
                            ) : (
                                <span>{total} conversation{total === 1 ? '' : 's'}</span>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
