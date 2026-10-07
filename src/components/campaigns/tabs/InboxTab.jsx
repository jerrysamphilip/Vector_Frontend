import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    Search, Send, RefreshCw, Mail, User,
    Check, CheckCheck, Clock, MoreVertical,
    ArrowDownLeft, ArrowUpRight, AlertTriangle,
    Settings, ChevronRight, Info, Wifi, FileText, Target,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient as api } from '../../../api/http';
import { leadsApi, templatesApi } from '../../../api/sales';
import Loading from '../../common/Loading';

/** Pick a library template; it is filled in for this contact and dropped into the reply (BR-SF-10). */
function TemplatePicker({ prospectId, onPick }) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState(null);
    const [q, setQ] = useState('');
    const [busy, setBusy] = useState(null);
    useEffect(() => {
        if (open && items === null) templatesApi.list().then(r => setItems(r.items)).catch(() => setItems([]));
    }, [open, items]);
    const pick = async (t) => {
        setBusy(t.template_id);
        try {
            const r = await templatesApi.render(t.template_id, prospectId, true);
            onPick(stripHtml(r.body));
            setOpen(false);
        } finally { setBusy(null); }
    };
    const shown = (items || []).filter(t => !q || `${t.name} ${t.subject}`.toLowerCase().includes(q.toLowerCase()));
    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen(o => !o)} title="Insert a template"
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
                <FileText className="w-4 h-4" /> Templates
            </button>
            {open && (
                <div className="absolute bottom-10 left-0 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-20 p-2">
                    <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search templates…"
                        className="w-full h-8 px-2.5 mb-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400" />
                    <div className="max-h-64 overflow-y-auto">
                        {items === null && <p className="text-xs text-gray-400 p-2">Loading…</p>}
                        {items && !shown.length && <p className="text-xs text-gray-400 p-2">No templates. Add some under Sales → Templates.</p>}
                        {shown.map(t => (
                            <button type="button" key={t.template_id} onClick={() => pick(t)} disabled={!!busy}
                                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                                <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                                <p className="text-[11px] text-gray-400 truncate">{t.category ? `${t.category} · ` : ''}{t.subject}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── HTML → plain text ────────────────────────────────────────────
function stripHtml(html = '') {
    if (!html) return '';
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

function cleanInboxBody(text = '') {
    if (!text) return '';
    const isHtml = /<[a-z][\s\S]*>/i.test(text);
    let body = isHtml ? stripHtml(text) : String(text);
    body = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\0/g, '');
    body = body.replace(/^https?:\/\/\S*awstrack\S*$/gim, '');
    body = body.replace(/^https?:\/\/\S*urldefense\S*$/gim, '');
    body = body.replace(/^\[https?:\/\/[^\]]+\]$/gim, '');
    body = body.replace(/<https?:\/\/\S+>/gim, '');
    body = body.replace(/\[cid:[^\]]+\]/gim, '');
    const quoteMarkers = [
        /^\s*From:\s.+$/im,
        /^\s*On\s.+wrote:\s*$/im,
        /^\s*-{2,}\s*On\s.+wrote\s*-{2,}\s*$/im,
        /^\s*-----Original Message-----\s*$/im,
        /^\s*_{10,}\s*$/im,
        /^\s*Sent:\s.+$/im,
        /^\s*Subject:\s.+$/im,
    ];
    for (const marker of quoteMarkers) {
        const match = body.match(marker);
        if (match?.index > 0) { body = body.slice(0, match.index); break; }
    }
    body = body.replace(/^\s*(please\s+)?unsubscribe.*$/gim, '');
    body = body.replace(/^\s*to\s+unsubscribe.*$/gim, '');
    body = body.replace(/^.*if you do not wish to receive such business communication emails.*$/gim, '');
    body = body.replace(/^.*reply\s+["']?\s*unsubscribe\s*["']?.*$/gim, '');
    body = body.replace(/^.*unsubscribe<https?:\/\/\S+>.*$/gim, '');
    body = body.replace(/^.*\/api\/tracking\/unsubscribe\/.*$/gim, '');
    body = body.replace(/^\s*book time to meet with me.*$/gim, '');
    body = body.replace(/^\s*(regards|best regards|best|thanks),?\s*$/gim, '');
    body = body.replace(/^\s*(head\s*[-–]\s*.+|t:\s*.+|a:\s*.+)\s*$/gim, '');
    body = body.replace(/^\s*https?:\/\/\S+\s*$/gim, '');
    body = body.replace(/\n{3,}/g, '\n\n').trim();
    return body;
}

// ── Avatar ────────────────────────────────────────────────────────
const AVATAR_COLORS = [
    ['#2d6bbf', '#1f56aa'], ['#FF9013', '#cc6f00'], ['#73C8D2', '#4db0bb'],
    ['#7c3aed', '#5b21b6'], ['#059669', '#047857'], ['#dc2626', '#b91c1c'],
];
function getAvatarGradient(str = '') {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function getInitials(name = '', email = '') {
    if (name) {
        const parts = name.trim().split(' ');
        return parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
    }
    return (email[0] || '?').toUpperCase();
}
function Avatar({ name, email, size = 36 }) {
    const [from, to] = getAvatarGradient(name || email);
    return (
        <div className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
            style={{ width: size, height: size, background: `linear-gradient(135deg, ${from}, ${to})`, fontSize: size * 0.36 }}>
            {getInitials(name, email)}
        </div>
    );
}

function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getConvType(conv) {
    const dir = conv.last_message_direction;
    const subj = (conv.subject || '').toLowerCase();
    if (dir === 'INBOUND' && (subj.includes('delivery failed') || subj.includes('undeliverable'))) return 'bounce';
    if (dir === 'INBOUND') return 'reply';
    return 'sent';
}

const CONV_TYPE_META = {
    reply:  { label: 'Reply',   Icon: ArrowDownLeft,  color: '#059669', bg: 'rgba(5,150,105,0.09)'  },
    bounce: { label: 'Bounced', Icon: AlertTriangle,   color: '#dc2626', bg: 'rgba(220,38,38,0.09)'  },
    sent:   { label: 'Sent',    Icon: ArrowUpRight,    color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
};

// ── IMAP provider quick-reference ─────────────────────────────────
const IMAP_PROVIDERS = [
    { name: 'Zoho Mail (India)',       host: 'imap.zoho.in',       port: 993, note: 'Use an App Password — Settings → Security → App Passwords' },
    { name: 'Zoho Mail (Global)',      host: 'imap.zoho.com',      port: 993, note: 'Use an App Password — Settings → Security → App Passwords' },
    { name: 'Gmail',                   host: 'imap.gmail.com',     port: 993, note: 'Enable IMAP in Gmail settings; use a Google App Password (not your regular password)' },
    { name: 'Rediffmail',              host: 'imap.rediffmail.com', port: 993, note: 'Enable IMAP access in Rediffmail settings first' },
    { name: 'Outlook / Hotmail',       host: 'outlook.office365.com', port: 993, note: 'Use your Outlook password or App Password if MFA is on' },
];

// ── IMAP setup guide shown when no IMAP is configured ─────────────
function ImapSetupGuide({ onGoToAccounts }) {
    const [open, setOpen] = useState(null);

    return (
        <div className="flex flex-col items-center justify-start p-6 h-full overflow-y-auto"
            style={{ background: 'linear-gradient(180deg, #fafaf9 0%, #f6f4ee 100%)' }}>

            {/* Hero */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mt-6"
                style={{ background: 'rgba(245,158,11,0.1)' }}>
                <Wifi className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">IMAP Not Configured</h2>
            <p className="text-sm text-gray-500 text-center max-w-md mb-6">
                To receive and display replied emails in this inbox, your sending account needs
                IMAP credentials. Without them the system cannot pull replies from your mailbox.
            </p>

            {/* Steps */}
            <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-100 p-5 mb-5"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">How to fix it</p>
                {[
                    { n: 1, text: 'Click "Go to Sending Accounts" below (or switch to the Sending Accounts tab).' },
                    { n: 2, text: 'Click the Edit (pencil) icon on the inbox used for this campaign.' },
                    { n: 3, text: 'Fill in IMAP Host, IMAP Username, and IMAP Password, then Save.' },
                    { n: 4, text: 'Come back to Inbox and click Sync — replied emails will appear.' },
                ].map(({ n, text }) => (
                    <div key={n} className="flex items-start gap-3 mb-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white mt-0.5"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>{n}</div>
                        <p className="text-sm text-gray-600">{text}</p>
                    </div>
                ))}
            </div>

            {/* CTA */}
            {onGoToAccounts && (
                <button
                    onClick={() => onGoToAccounts('Sending Accounts')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white mb-6 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                    style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                    <Settings className="w-4 h-4" />
                    Go to Sending Accounts
                    <ChevronRight className="w-4 h-4" />
                </button>
            )}

            {/* Provider quick-ref */}
            <div className="w-full max-w-lg">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    IMAP settings by provider
                </p>
                <div className="space-y-2">
                    {IMAP_PROVIDERS.map((p) => (
                        <button key={p.host}
                            onClick={() => setOpen(open === p.host ? null : p.host)}
                            className="w-full text-left bg-white rounded-xl border border-gray-100 px-4 py-3 transition-all hover:border-blue-200"
                            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-700">{p.name}</span>
                                <span className="text-[11px] font-mono text-gray-400">{p.host}</span>
                            </div>
                            {open === p.host && (
                                <div className="mt-3 space-y-1.5 text-xs text-gray-600 border-t border-gray-100 pt-3">
                                    <div className="flex gap-2"><span className="font-semibold w-20 shrink-0">IMAP Host</span><code className="bg-gray-50 px-2 py-0.5 rounded">{p.host}</code></div>
                                    <div className="flex gap-2"><span className="font-semibold w-20 shrink-0">Port</span><code className="bg-gray-50 px-2 py-0.5 rounded">{p.port} (SSL)</code></div>
                                    <div className="flex gap-2"><span className="font-semibold w-20 shrink-0">Username</span><span>Your full email address</span></div>
                                    <div className="flex gap-2 mt-1">
                                        <Info className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
                                        <span className="text-amber-700">{p.note}</span>
                                    </div>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

const POLL_INTERVAL = 30000;

// ════════════════════════════════════════════════════════════════
// Main InboxTab
// ════════════════════════════════════════════════════════════════
export default function InboxTab({ campaignId, inboxIds = [], onTabChange, className = 'h-[600px]' }) {
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
            if (err?.response?.status === 409 && detail?.lead_id) navigate(`/app/leads/${detail.lead_id}`);
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
        api.get('/inboxes')
            .then(res => {
                const all = res.data.items || res.data || [];
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
            const res = await api.get('/conversations', { params: { campaign_id: campaignId, page_size: 100 } });
            const items = res.data.items || res.data || [];
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
            const res = await api.get(`/conversations/${id}`);
            const msgs = res.data.messages || res.data.items || (Array.isArray(res.data) ? res.data : []);
            setMessages(msgs);
        } catch (err) {
            console.error('[Inbox] messages error:', err?.response?.data || err.message);
            if (!silent) setMessages([]);
        } finally {
            if (!silent) setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchConversations(); }, [campaignId]);
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
            const res = await api.post(`/conversations/${selectedId}/reply`, { body_text: trimmed });
            const persisted = res?.data?.message;
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
                const res = await api.get('/inboxes');
                const all = res.data.items || res.data || [];
                idsToSync = all.filter(i => i.imap_host).map(i => i.inbox_id || i.id).filter(Boolean);
            }
            if (!idsToSync.length) {
                // No inbox has imap_host — show the guide
                setImapReady(false);
                return;
            }
            const results = await Promise.allSettled(
                idsToSync.map(id => api.post(`/inboxes/${id}/sync`, { days: 30 }))
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

    // Show IMAP setup guide when not configured
    if (imapReady === false) {
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

            {syncError && (
                <div className="shrink-0 mx-4 mt-2 px-3 py-2 rounded-lg text-[11px] text-red-600 bg-red-50 border border-red-200 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                    <span>{syncError}</span>
                </div>
            )}

            {/* ── Main area ── */}
            <div className="flex flex-1 min-h-0">
                {/* Left: conversation list */}
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
                            filteredConversations.map(c => {
                                const isActive = selectedId === c.id;
                                const convType = getConvType(c);
                                const meta = CONV_TYPE_META[convType];
                                const TypeIcon = meta.Icon;
                                return (
                                    <button
                                        key={c.id}
                                        onClick={() => setSelectedId(c.id)}
                                        className="w-full text-left px-4 py-3 transition-all relative"
                                        style={{
                                            background: isActive
                                                ? 'linear-gradient(90deg, rgba(45,107,191,0.08), rgba(115,200,210,0.06))'
                                                : 'transparent',
                                            borderLeft: isActive ? '3px solid #2d6bbf' : '3px solid transparent',
                                        }}
                                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.025)'; }}
                                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="relative">
                                                <Avatar name={c.prospect_name} email={c.prospect_email} size={36} />
                                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white"
                                                    style={{ background: meta.bg }}>
                                                    <TypeIcon className="w-2 h-2" style={{ color: meta.color }} />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <span className={`text-xs font-semibold truncate ${c.is_unread ? 'text-gray-900' : 'text-gray-600'}`}>
                                                        {c.prospect_name || c.prospect_email}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2 shrink-0">
                                                        {fmtDate(c.last_message_at)}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-500 truncate">{c.subject}</p>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                                                        style={{ background: meta.bg, color: meta.color }}>
                                                        {meta.label}
                                                    </span>
                                                    {c.last_message_snippet && (
                                                        <p className="text-[11px] text-gray-400 truncate italic flex-1">
                                                            {c.last_message_snippet}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {c.is_unread && (
                                                <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: '#2d6bbf' }} />
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right: thread */}
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
                                ) : normalizedMessages.map((m, idx) => {
                                    const isOut = m.direction === 'OUTBOUND';
                                    const isBounce = !isOut && (m.subject || '').toLowerCase().includes('delivery failed');
                                    return (
                                        <div key={m.message_id || idx}
                                            className={`flex ${isOut ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                                            {!isOut && (
                                                <Avatar name={isBounce ? 'System' : activeConversation?.prospect_name}
                                                    email={isBounce ? 'bounce' : activeConversation?.prospect_email} size={28} />
                                            )}
                                            <div className={`flex flex-col gap-1 max-w-[72%] ${isOut ? 'items-end' : 'items-start'}`}>
                                                {isBounce && <span className="text-[10px] font-semibold text-red-500 px-1">Delivery Failed</span>}
                                                <div className="px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed"
                                                    style={{
                                                        overflowWrap: 'anywhere',
                                                        ...(isOut ? {
                                                            background: 'linear-gradient(135deg, #2d6bbf, #4a9fd4)',
                                                            color: '#fff', borderBottomRightRadius: 4,
                                                            boxShadow: '0 2px 8px rgba(45,107,191,0.25)',
                                                        } : isBounce ? {
                                                            background: '#fef2f2', color: '#b91c1c',
                                                            border: '1px solid #fecaca', borderBottomLeftRadius: 4,
                                                        } : {
                                                            background: '#fff', color: '#374151',
                                                            border: '1px solid #e5e7eb', borderBottomLeftRadius: 4,
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                                        }),
                                                    }}>
                                                    {m.cleaned_body || '(No content)'}
                                                </div>
                                                <div className="flex items-center gap-1 px-1">
                                                    {m.display_time && (
                                                        <span className="text-[10px] text-gray-400">
                                                            {new Date(m.display_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                    {isOut && (
                                                        m.status === 'QUEUED' ? (
                                                            <Clock className="w-3 h-3" style={{ color: '#9ca3af' }} title="Queued to send" />
                                                        ) : m.delivered_at ? (
                                                            <CheckCheck className="w-3 h-3" style={{ color: '#059669' }} title={`Delivered ${new Date(m.delivered_at).toLocaleString()}`} />
                                                        ) : (
                                                            <Check className="w-3 h-3" style={{ color: '#2d6bbf' }} title="Sent — delivery not yet confirmed" />
                                                        )
                                                    )}
                                                    {!isOut && !isBounce && m.message_id && (
                                                        <button type="button" onClick={() => createLead(m.message_id)} disabled={leadBusy === m.message_id}
                                                            className="ml-1 flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                                                            title="Turn this reply into a lead">
                                                            <Target className="w-3 h-3" /> {leadBusy === m.message_id ? 'Creating…' : 'Create lead'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {isOut && (
                                                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                                                    style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                                                    <User className="w-3.5 h-3.5 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="shrink-0 p-4 border-t border-gray-100 bg-white">
                                {leadError && <p className="text-xs text-red-600 mb-2">{leadError}</p>}
                                <form onSubmit={handleSend}>
                                    <div className="relative rounded-2xl border border-gray-200 bg-gray-50 focus-within:border-blue-400 focus-within:bg-white transition-all">
                                        <textarea
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                            placeholder="Type your reply… (Enter to send, Shift+Enter for new line)"
                                            className="w-full bg-transparent px-4 pt-3 pb-12 text-sm text-gray-700 placeholder-gray-400 focus:outline-none resize-none min-h-[90px] max-h-[220px]"
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                                        />
                                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                                            <div className="flex items-center gap-1">
                                                <TemplatePicker prospectId={activeConversation?.prospect_id}
                                                    onPick={text => setReplyText(prev => (prev.trim() ? `${prev}\n\n${text}` : text))} />
                                            </div>
                                            <button type="submit" disabled={!replyText.trim() || sending}
                                                className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                                                style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                                                {sending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                                Send
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
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
            </div>
        </div>
    );
}
