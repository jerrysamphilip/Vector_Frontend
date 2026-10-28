import { AlertTriangle, Check, CheckCheck, Clock, XCircle } from 'lucide-react';
import { formatDateTime, toApiIso } from '../../../../lib/dates';

// Reply labels (S-09), delivery ticks from final_status and the per-email activity timeline (S-10).

export const REPLY_LABEL_META = {
    POSITIVE:      { label: 'Positive',      color: '#047857', bg: 'rgba(5,150,105,0.10)' },
    NEUTRAL:       { label: 'Neutral',       color: '#4b5563', bg: 'rgba(107,114,128,0.10)' },
    NEGATIVE:      { label: 'Not interested', color: '#b45309', bg: 'rgba(217,119,6,0.10)' },
    OUT_OF_OFFICE: { label: 'Out of office', color: '#6d28d9', bg: 'rgba(124,58,237,0.10)' },
    UNSUBSCRIBE:   { label: 'Unsubscribe',   color: '#b91c1c', bg: 'rgba(220,38,38,0.10)' },
};

export function ReplyLabelBadge({ label, needsReview = false, className = '' }) {
    const meta = REPLY_LABEL_META[label];
    if (!meta && !needsReview) return null;
    const text = meta ? meta.label : 'Review';
    const title = needsReview ? 'Possible unsubscribe request: review before contacting again' : `Reply classified as ${text}`;
    return (
        <span title={title} data-testid="reply-label"
            className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${className}`}
            style={{ background: (meta || REPLY_LABEL_META.UNSUBSCRIBE).bg, color: (meta || REPLY_LABEL_META.UNSUBSCRIBE).color }}>
            {needsReview && <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />}
            {text}{needsReview && meta ? ' ?' : ''}
        </span>
    );
}

// queued / sent / delivered / bounced / failed / unconfirmed, from status + final_status (BR-DF-04)
export function deliveryState({ status, final_status: finalStatus, delivered_at: deliveredAt } = {}) {
    const final = (finalStatus || '').toUpperCase();
    const st = (status || '').toUpperCase();
    if (['BOUNCED', 'COMPLAINED', 'REJECTED'].includes(final) || st === 'BOUNCED') return 'bounced';
    if (final === 'FAILED' || st === 'FAILED') return 'failed';
    if (final === 'DELIVERED' || deliveredAt) return 'delivered';
    if (['QUEUED', 'SCHEDULED', 'SENDING'].includes(st)) return 'queued';
    if (final === 'UNCONFIRMED') return 'unconfirmed';
    return 'sent';
}

const TICKS = {
    queued:      { Icon: Clock,      color: '#9ca3af', title: 'Queued to send' },
    sent:        { Icon: Check,      color: '#2d6bbf', title: 'Sent, delivery not yet confirmed' },
    unconfirmed: { Icon: Check,      color: '#9ca3af', title: 'Sent, the provider never confirmed delivery' },
    delivered:   { Icon: CheckCheck, color: '#059669', title: 'Delivered' },
    bounced:     { Icon: XCircle,    color: '#dc2626', title: 'Bounced' },
    failed:      { Icon: AlertTriangle, color: '#dc2626', title: 'Failed to send' },
};

export function DeliveryTick({ message, size = 'w-3 h-3' }) {
    const state = deliveryState(message);
    const { Icon, color, title } = TICKS[state];
    return (
        <span title={title} aria-label={title} data-testid={`tick-${state}`} className="inline-flex">
            <Icon className={size} style={{ color }} aria-hidden="true" />
        </span>
    );
}

const STEP_LABELS = {
    SENT: 'Sent', DELIVERED: 'Delivered', OPENED: 'Opened', CLICKED: 'Clicked', BOUNCED: 'Bounced',
    COMPLAINED: 'Marked as spam', UNSUBSCRIBED: 'Unsubscribed', REPLIED: 'Replied',
};

// "Oct 26, 1:54 PM EDT" in the viewer's zone
function fmtStepTime(iso) {
    return formatDateTime(iso, { year: false, fallback: '' });
}

export function ActivityTimeline({ activity = [] }) {
    if (!activity.length) return null;
    return (
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[10px] text-gray-400" aria-label="Email activity">
            {activity.map((step, i) => (
                <li key={`${step.type}-${i}`} className="flex items-center gap-1">
                    {i > 0 && <span aria-hidden="true">·</span>}
                    <span className={step.type === 'BOUNCED' || step.type === 'COMPLAINED' ? 'text-red-500' : ''}>
                        {STEP_LABELS[step.type] || step.type}
                    </span>
                    {step.at && <time dateTime={toApiIso(step.at) || step.at}>{fmtStepTime(step.at)}</time>}
                    {step.reply_label && <ReplyLabelBadge label={step.reply_label} />}
                </li>
            ))}
        </ol>
    );
}
