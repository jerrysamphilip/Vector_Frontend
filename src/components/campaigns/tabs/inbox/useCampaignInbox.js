import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getStoredUser } from '../../../../lib/authStorage';
import { conversationsApi, inboxesApi } from '../../../../api/inboxes';
import { leadsApi } from '../../../../api/sales';
import { cleanInboxBody } from './inboxShared';

export const POLL_INTERVAL = 30000;
export const PAGE_SIZE = 30;
export const SEARCH_DEBOUNCE_MS = 300;

export const conversationKeys = {
    list: (campaignId, search, label) => ['conversations', campaignId || 'all', search || '', label || ''],
    thread: (id) => ['conversation', id],
};

// Next page number for the infinite list, from the server's paging (S-10)
export function nextPageParam(lastPage) {
    if (!lastPage) return undefined;
    if (lastPage.has_more !== undefined) return lastPage.has_more ? lastPage.page + 1 : undefined;
    return lastPage.page * lastPage.page_size < lastPage.total ? lastPage.page + 1 : undefined;
}

// All loaded pages as one list (a conversation that moved between pages while polling is shown once)
export function flattenPages(data) {
    const seen = new Set();
    const items = [];
    for (const page of data?.pages || []) {
        for (const c of page.items || []) {
            if (seen.has(c.id)) continue;
            seen.add(c.id);
            items.push(c);
        }
    }
    return items;
}

function useDebounced(value, ms) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return debounced;
}

// State and actions of a campaign's inbox (or the unified inbox without campaignId): conversations
// searched and paged by the server (infinite scroll, polled every 30 s), the selected thread, reply
// (optimistic), IMAP sync of the campaign's inboxes, IMAP readiness and "create lead" from a reply.
export function useCampaignInbox({ campaignId, inboxIds = [] }) {
    const queryClient = useQueryClient();
    const [selectedId, setSelectedId]       = useState(null);
    const [replyText, setReplyText]         = useState('');
    const [leadBusy, setLeadBusy]           = useState(null);
    const [leadError, setLeadError]         = useState(null);
    const [syncing, setSyncing]             = useState(false);
    const [syncError, setSyncError]         = useState(null);
    const [searchQuery, setSearchQuery]     = useState('');
    const [labelFilter, setLabelFilter]     = useState('');
    // null = checking, true = at least one IMAP inbox exists, false = none configured
    const [imapReady, setImapReady]         = useState(null);
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);
    const search = useDebounced(searchQuery.trim(), SEARCH_DEBOUNCE_MS);

    const createLead = async (messageId) => {
        setLeadBusy(messageId); setLeadError(null);
        try {
            const lead = await leadsApi.fromMessage(messageId);
            navigate(`/app/leads/${lead.lead_id}`);
        } catch (err) {
            const detail = err?.response?.data?.detail;
            const info = err?.response?.data?.detail_data;
            if (err?.response?.status === 409 && info?.lead_id) navigate(`/app/leads/${info.lead_id}`);
            else setLeadError(typeof detail === 'string' ? detail : 'Could not create the lead');
        } finally { setLeadBusy(null); }
    };

    // Check if any inbox has IMAP configured
    useEffect(() => {
        // GET /inboxes is admin-only; other roles would just collect a 403
        if (!['SUPER_ADMIN', 'ADMIN'].includes(getStoredUser()?.role)) { setImapReady(true); return; }
        inboxesApi.list()
            .then(data => {
                const all = data.items || data || [];
                setImapReady(all.some(i => i.imap_host));
            })
            .catch(() => setImapReady(true)); // don't block UI on check failure
    }, []);

    const listKey = conversationKeys.list(campaignId, search, labelFilter);
    const list = useInfiniteQuery({
        queryKey: listKey,
        queryFn: ({ pageParam }) => conversationsApi.list({
            campaign_id: campaignId || undefined, search: search || undefined, label: labelFilter || undefined,
            page: pageParam, page_size: PAGE_SIZE,
        }),
        initialPageParam: 1,
        getNextPageParam: nextPageParam,
        refetchInterval: POLL_INTERVAL,
    });
    const conversations = useMemo(() => flattenPages(list.data), [list.data]);
    const total = list.data?.pages?.[0]?.total ?? conversations.length;

    // Select the first conversation once the list has loaded
    useEffect(() => {
        if (!selectedId && conversations.length > 0) setSelectedId(conversations[0].id);
    }, [conversations, selectedId]);

    const thread = useQuery({
        queryKey: conversationKeys.thread(selectedId),
        queryFn: () => conversationsApi.get(selectedId),
        enabled: Boolean(selectedId),
        refetchInterval: POLL_INTERVAL,
    });
    const messages = useMemo(() => {
        const data = thread.data;
        return data?.messages || data?.items || (Array.isArray(data) ? data : []);
    }, [thread.data]);

    // Opening a thread marks it read on the server; mirror that in the loaded list
    useEffect(() => {
        if (!thread.data || !selectedId) return;
        queryClient.setQueryData(listKey, (old) => old && ({
            ...old,
            pages: old.pages.map(p => ({ ...p, items: (p.items || []).map(c => c.id === selectedId ? { ...c, is_unread: false } : c) })),
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [thread.data, selectedId]);

    const normalizedMessages = useMemo(() => (messages || []).map(m => {
        const rawBody = m.body_text || m.html_body || m.body || '';
        return { ...m, cleaned_body: cleanInboxBody(rawBody), display_time: m.sent_at || m.scheduled_at || null };
    }), [messages]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' }); }, [messages]);

    const reply = useMutation({
        mutationFn: ({ id, text }) => conversationsApi.reply(id, text),
        onMutate: async ({ id, text }) => {
            const key = conversationKeys.thread(id);
            await queryClient.cancelQueries({ queryKey: key });
            const previous = queryClient.getQueryData(key);
            const optimistic = {
                message_id: `local-${Date.now()}`, direction: 'OUTBOUND',
                body_text: text, status: 'QUEUED', sent_at: new Date().toISOString(),
            };
            queryClient.setQueryData(key, (old) => old ? { ...old, messages: [...(old.messages || []), optimistic] } : old);
            return { previous, key };
        },
        onError: (_err, { text }, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(ctx.key, ctx.previous);
            setReplyText(text);
        },
        onSettled: (_data, _err, { id }) => {
            queryClient.invalidateQueries({ queryKey: conversationKeys.thread(id) });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
    });

    const handleSend = async (e) => {
        e.preventDefault();
        const trimmed = replyText.trim();
        if (!trimmed || reply.isPending || !selectedId) return;
        setReplyText('');
        try {
            await reply.mutateAsync({ id: selectedId, text: trimmed });
        } catch (err) {
            console.error('Error sending reply:', err);
        }
    };

    const fetchConversations = () => list.refetch();
    const fetchMessages = () => thread.refetch();

    const handleSyncNow = async () => {
        setSyncing(true);
        setSyncError(null);
        try {
            let idsToSync = [...inboxIds];
            if (!idsToSync.length) {
                const data = await inboxesApi.list();
                const all = data.items || data || [];
                idsToSync = all.filter(i => i.imap_host).map(i => i.inbox_id || i.id).filter(Boolean);
            }
            if (!idsToSync.length) {
                // No inbox has imap_host — show the guide
                setImapReady(false);
                return;
            }
            const results = await Promise.allSettled(
                idsToSync.map(id => inboxesApi.sync(id, 30))
            );
            const failed = results
                .filter(r => r.status === 'rejected')
                .map(r => r.reason?.response?.data?.detail || r.reason?.message || 'Unknown error');
            if (failed.length) {
                const msg = failed[0];
                // If the error is about missing IMAP credentials, show the guide
                if (msg.toLowerCase().includes('imap is not configured') || msg.toLowerCase().includes('imap_host')) {
                    setImapReady(false);
                } else {
                    setSyncError(`Sync error: ${msg}`);
                }
            }
            await list.refetch();
            setImapReady(true);
        } catch (err) {
            const msg = err?.response?.data?.detail || err.message;
            if (msg?.toLowerCase().includes('imap')) {
                setImapReady(false);
            } else {
                setSyncError(`Sync failed: ${msg}`);
            }
        } finally {
            setSyncing(false);
        }
    };

    const activeConversation = conversations.find(c => c.id === selectedId);
    const unreadCount = conversations.filter(c => c.is_unread).length;

    return {
        conversations, selectedId, setSelectedId, replyText, setReplyText, leadBusy, leadError, createLead,
        loading: list.isLoading, refreshing: thread.isFetching && !thread.isLoading, sending: reply.isPending,
        syncing, syncError, searchQuery, setSearchQuery, labelFilter, setLabelFilter, imapReady, setImapReady,
        messagesEndRef, normalizedMessages, fetchConversations, fetchMessages, handleSend, handleSyncNow,
        // The server already applied the search: what is loaded is what matches
        filteredConversations: conversations, activeConversation, unreadCount, total,
        loadError: list.isError, hasNextPage: Boolean(list.hasNextPage), isFetchingNextPage: list.isFetchingNextPage,
        fetchNextPage: () => list.fetchNextPage(),
    };
}
