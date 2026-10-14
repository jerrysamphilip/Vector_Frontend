import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredUser } from '../../../../lib/authStorage';
import { conversationsApi, inboxesApi } from '../../../../api/inboxes';
import { leadsApi } from '../../../../api/sales';
import { cleanInboxBody } from './inboxShared';

export const POLL_INTERVAL = 30000;

// State and actions of a campaign's inbox: conversations (polled every 30 s), the selected thread, reply
// (optimistic), IMAP sync of the campaign's inboxes, IMAP readiness and "create lead" from a reply.
export function useCampaignInbox({ campaignId, inboxIds = [] }) {
    const [conversations, setConversations] = useState([]);
    const [selectedId, setSelectedId]       = useState(null);
    const [messages, setMessages]           = useState([]);
    const [replyText, setReplyText]         = useState('');
    const [leadBusy, setLeadBusy]           = useState(null);
    const [leadError, setLeadError]         = useState(null);
    const navigate = useNavigate();
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
    const [loading, setLoading]             = useState(true);
    const [refreshing, setRefreshing]       = useState(false);
    const [sending, setSending]             = useState(false);
    const [syncing, setSyncing]             = useState(false);
    const [syncError, setSyncError]         = useState(null);
    const [searchQuery, setSearchQuery]     = useState('');
    // null = checking, true = at least one IMAP inbox exists, false = none configured
    const [imapReady, setImapReady]         = useState(null);

    const messagesEndRef = useRef(null);
    const selectedIdRef  = useRef(selectedId);
    const pollTimerRef   = useRef(null);

    useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

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

    const normalizedMessages = useMemo(() => (messages || []).map(m => {
        const rawBody = m.body_text || m.html_body || m.body || '';
        return { ...m, cleaned_body: cleanInboxBody(rawBody), display_time: m.sent_at || m.scheduled_at || null };
    }), [messages]);

    const fetchConversations = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await conversationsApi.list({ campaign_id: campaignId, page_size: 100 });
            const items = data.items || data || [];
            setConversations(items);
            if (items.length > 0 && !selectedIdRef.current) setSelectedId(items[0].id);
        } catch (err) {
            console.error('[Inbox] fetch error:', err?.response?.data || err.message);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [campaignId]);

    const fetchMessages = useCallback(async (id, silent = false) => {
        if (!silent) setRefreshing(true);
        try {
            const data = await conversationsApi.get(id);
            const msgs = data.messages || data.items || (Array.isArray(data) ? data : []);
            setMessages(msgs);
        } catch (err) {
            console.error('[Inbox] messages error:', err?.response?.data || err.message);
            if (!silent) setMessages([]);
        } finally {
            if (!silent) setRefreshing(false);
        }
    }, []);

    // Load on campaign / selection change (fetchConversations only changes with campaignId; fetchMessages never)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchConversations(); }, [campaignId]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { if (selectedId) fetchMessages(selectedId); else setMessages([]); }, [selectedId]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    useEffect(() => {
        pollTimerRef.current = setInterval(() => {
            fetchConversations(true);
            if (selectedIdRef.current) fetchMessages(selectedIdRef.current, true);
        }, POLL_INTERVAL);
        return () => clearInterval(pollTimerRef.current);
    }, [fetchConversations, fetchMessages]);

    const handleSend = async (e) => {
        e.preventDefault();
        const trimmed = replyText.trim();
        if (!trimmed || sending || !selectedId) return;
        const optimisticId = `local-${Date.now()}`;
        setSending(true);
        setReplyText('');
        setMessages(prev => [...prev, {
            message_id: optimisticId, direction: 'OUTBOUND',
            body_text: trimmed, status: 'QUEUED', sent_at: new Date().toISOString(),
        }]);
        try {
            const data = await conversationsApi.reply(selectedId, trimmed);
            const persisted = data?.message;
            if (persisted) setMessages(prev => prev.map(m => m.message_id === optimisticId ? persisted : m));
            setTimeout(() => fetchMessages(selectedId), 300);
        } catch (err) {
            console.error('Error sending reply:', err);
            setMessages(prev => prev.filter(m => m.message_id !== optimisticId));
            setReplyText(trimmed);
        } finally {
            setSending(false);
        }
    };

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
            await fetchConversations();
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

    const filteredConversations = conversations.filter(c =>
        (c.prospect_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.prospect_email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeConversation = conversations.find(c => c.id === selectedId);
    const unreadCount = conversations.filter(c => c.is_unread).length;

    return {
        conversations, selectedId, setSelectedId, replyText, setReplyText, leadBusy, leadError, createLead,
        loading, refreshing, sending, syncing, syncError, searchQuery, setSearchQuery, imapReady, setImapReady,
        messagesEndRef, normalizedMessages, fetchConversations, fetchMessages, handleSend, handleSyncNow,
        filteredConversations, activeConversation, unreadCount,
    };
}
