import { ArrowDownLeft, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { calendarDaysAgo, formatDate, formatTime, parseApiDate } from '../../../../lib/dates';

// Campaign inbox (tabs/InboxTab.jsx): message body clean-up, avatars, dates, conversation types, IMAP providers.

// ── HTML → plain text ────────────────────────────────────────────
export function stripHtml(html = '') {
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

export function cleanInboxBody(text = '') {
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
export const AVATAR_COLORS = [
    ['#2d6bbf', '#1f56aa'], ['#FF9013', '#cc6f00'], ['#73C8D2', '#4db0bb'],
    ['#7c3aed', '#5b21b6'], ['#059669', '#047857'], ['#dc2626', '#b91c1c'],
];
export function getAvatarGradient(str = '') {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
export function getInitials(name = '', email = '') {
    if (name) {
        const parts = name.trim().split(' ');
        return parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
    }
    return (email[0] || '?').toUpperCase();
}
export function Avatar({ name, email, size = 36 }) {
    const [from, to] = getAvatarGradient(name || email);
    return (
        <div className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
            style={{ width: size, height: size, background: `linear-gradient(135deg, ${from}, ${to})`, fontSize: size * 0.36 }}>
            {getInitials(name, email)}
        </div>
    );
}

// The list's date column, in the viewer's zone: the time today ("1:54 PM EDT"), then Yesterday, the weekday
// within a week, else the date. Days are local calendar days.
export function fmtDate(iso) {
    const d = parseApiDate(iso);
    if (!d) return '';
    const days = calendarDaysAgo(d);
    if (days <= 0) return formatTime(d);
    if (days === 1) return 'Yesterday';
    if (days < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return formatDate(d, { year: false });
}

// A thread message that is a system notice (the "Delivery Failed" bounce note), not a reply from the contact.
// is_system comes from the API; the subject check covers notes cached from before the field existed.
export function isSystemNotice(m) {
    if (!m || m.direction !== 'INBOUND') return false;
    if (m.is_system) return true;
    const subj = (m.subject || '').toLowerCase();
    return subj.startsWith('delivery failed') || subj.startsWith('undeliverable');
}

export function getConvType(conv) {
    const dir = conv.last_message_direction;
    const subj = (conv.subject || '').toLowerCase();
    if (dir === 'INBOUND' && conv.last_message_is_system) return 'bounce';
    if (dir === 'INBOUND' && (subj.includes('delivery failed') || subj.includes('undeliverable'))) return 'bounce';
    if (dir === 'INBOUND') return 'reply';
    return 'sent';
}

export const CONV_TYPE_META = {
    reply:  { label: 'Reply',   Icon: ArrowDownLeft,  color: '#059669', bg: 'rgba(5,150,105,0.09)'  },
    bounce: { label: 'Bounced', Icon: AlertTriangle,   color: '#dc2626', bg: 'rgba(220,38,38,0.09)'  },
    sent:   { label: 'Sent',    Icon: ArrowUpRight,    color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
};

// ── IMAP provider quick-reference ─────────────────────────────────
export const IMAP_PROVIDERS = [
    { name: 'Zoho Mail (India)',       host: 'imap.zoho.in',       port: 993, note: 'Use an App Password — Settings → Security → App Passwords' },
    { name: 'Zoho Mail (Global)',      host: 'imap.zoho.com',      port: 993, note: 'Use an App Password — Settings → Security → App Passwords' },
    { name: 'Gmail',                   host: 'imap.gmail.com',     port: 993, note: 'Enable IMAP in Gmail settings; use a Google App Password (not your regular password)' },
    { name: 'Rediffmail',              host: 'imap.rediffmail.com', port: 993, note: 'Enable IMAP access in Rediffmail settings first' },
    { name: 'Outlook / Hotmail',       host: 'outlook.office365.com', port: 993, note: 'Use your Outlook password or App Password if MFA is on' },
];
