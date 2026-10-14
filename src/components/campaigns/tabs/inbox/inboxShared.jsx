import { ArrowDownLeft, ArrowUpRight, AlertTriangle } from 'lucide-react';

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

export function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function getConvType(conv) {
    const dir = conv.last_message_direction;
    const subj = (conv.subject || '').toLowerCase();
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
