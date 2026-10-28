import { PauseCircle, ShieldAlert, ServerCrash } from 'lucide-react';
import { parseApiDate, toApiIso } from '../../lib/dates';

// Dashboard alert center: which alerts were seen (localStorage), timestamps and the icon / colours per alert.

export const DASHBOARD_SEEN_ALERTS_KEY = 'dashboard_seen_alert_ids_v2';

export function readSeenAlertIds() {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(DASHBOARD_SEEN_ALERTS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function writeSeenAlertIds(alertIds) {
    if (typeof window === 'undefined') return;
    try {
        const uniqueIds = [...new Set(alertIds)].slice(-200);
        window.localStorage.setItem(DASHBOARD_SEEN_ALERTS_KEY, JSON.stringify(uniqueIds));
    } catch {
        // Ignore storage failures and keep the dashboard usable.
    }
}

export function formatAlertTime(dateValue) {
    const date = parseApiDate(dateValue);
    if (!date) return 'Just now';
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

// An API timestamp as an ISO string with its zone (naive values are UTC; src/lib/dates.js)
export function normalizeApiTimestamp(dateValue) {
    if (!dateValue || typeof dateValue !== 'string') return dateValue;
    return toApiIso(dateValue) ?? dateValue;
}

export function getAlertVisual(alert) {
    const severity = (alert.severity || 'INFO').toUpperCase();

    if (alert.source === 'EMAIL') {
        return {
            Icon: PauseCircle,
            badge: 'Email',
            border: severity === 'CRITICAL' ? 'border-red-200' : 'border-amber-200',
            iconBg: severity === 'CRITICAL' ? 'bg-red-100' : 'bg-amber-100',
            iconColor: severity === 'CRITICAL' ? 'text-red-600' : 'text-amber-600',
            badgeClass: severity === 'CRITICAL' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700',
        };
    }

    if (alert.source === 'CAMPAIGN') {
        return {
            Icon: PauseCircle,
            badge: 'Campaign',
            border: 'border-blue-200',
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-700',
            badgeClass: 'bg-blue-50 text-blue-700',
        };
    }

    if (alert.source === 'SYNC') {
        return {
            Icon: ServerCrash,
            badge: 'Sync',
            border: 'border-orange-200',
            iconBg: 'bg-orange-100',
            iconColor: 'text-orange-600',
            badgeClass: 'bg-orange-50 text-orange-700',
        };
    }

    return {
        Icon: ShieldAlert,
        badge: 'Domain',
        border: severity === 'CRITICAL' ? 'border-red-200' : 'border-amber-200',
        iconBg: severity === 'CRITICAL' ? 'bg-red-100' : 'bg-amber-100',
        iconColor: severity === 'CRITICAL' ? 'text-red-600' : 'text-amber-700',
        badgeClass: severity === 'CRITICAL' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700',
    };
}
