import {
    Send, MailOpen, MessageSquare, AlertTriangle, TrendingUp,
    VolumeX, ThumbsUp, Loader2
} from 'lucide-react';

export const ALL_COLUMNS = [
    { key: 'inProgress', label: 'In Progress', icon: Loader2, always: false },
    { key: 'sent', label: 'Sent', icon: Send, always: false },
    { key: 'opened', label: 'Opened', icon: MailOpen, always: false },
    { key: 'replied', label: 'Replied', icon: MessageSquare, always: false },
    { key: 'bounced', label: 'Bounced', icon: AlertTriangle, always: false },
    { key: 'senderBounced', label: 'Sender Bounced', icon: TrendingUp, always: false },
    { key: 'positive', label: 'Positive', icon: ThumbsUp, always: false },
    { key: 'repliedNoOOO', label: 'Replied w/o OOO', icon: VolumeX, always: false },
];

export const DEFAULT_VISIBLE = ['inProgress', 'sent', 'opened', 'replied', 'bounced', 'senderBounced', 'positive', 'repliedNoOOO'];
export const LS_KEY = 'campaigns_visible_columns';

export function loadVisibleCols() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) return JSON.parse(raw);
    } catch (_) { }
    return DEFAULT_VISIBLE;
}
