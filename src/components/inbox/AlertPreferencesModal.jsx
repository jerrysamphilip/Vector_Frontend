import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Mail, Settings2, X } from 'lucide-react';

const LABELS = {
    DOMAIN_REPUTATION: 'Domain Reputation Alerts',
    INBOX_PAUSED: 'Inbox Paused Alerts',
    INBOX_SYNC_STALE: 'Inbox Sync Stale Alerts',
    CAMPAIGN_PAUSED: 'Campaign Paused Alerts',
};

function toKey(pref) {
    return `${pref.scope_type}:${pref.scope_id || ''}:${pref.alert_type}`;
}

function prefOrDefault(pref) {
    return {
        enabled: pref?.enabled ?? true,
        email_enabled: pref?.email_enabled ?? false,
        cooldown_minutes: pref?.cooldown_minutes ?? 360,
    };
}

export default function AlertPreferencesModal({
    isOpen,
    onClose,
    data,
    onSave,
    isSaving = false,
}) {
    const [draft, setDraft] = useState({});

    useEffect(() => {
        if (!isOpen || !data) return;
        const next = {};
        (data.tenant_preferences || []).forEach((pref) => {
            next[toKey(pref)] = prefOrDefault(pref);
        });
        (data.inbox_preferences || []).forEach((group) => {
            (group.preferences || []).forEach((pref) => {
                next[toKey(pref)] = prefOrDefault(pref);
            });
        });
        setDraft(next);
    }, [isOpen, data]);

    const hasRows = useMemo(() => {
        const tenantCount = (data?.tenant_preferences || []).length;
        const inboxCount = (data?.inbox_preferences || []).length;
        return tenantCount > 0 || inboxCount > 0;
    }, [data]);

    const setField = (pref, field, value) => {
        const key = toKey(pref);
        setDraft((prev) => ({
            ...prev,
            [key]: {
                ...prefOrDefault(prev[key]),
                [field]: value,
            },
        }));
    };

    const getRow = (pref) => prefOrDefault(draft[toKey(pref)]);

    const submit = () => {
        const payload = [];
        (data?.tenant_preferences || []).forEach((pref) => {
            const row = getRow(pref);
            payload.push({
                scope_type: pref.scope_type,
                scope_id: pref.scope_id,
                alert_type: pref.alert_type,
                enabled: row.enabled,
                email_enabled: row.email_enabled,
                cooldown_minutes: row.cooldown_minutes,
            });
        });
        (data?.inbox_preferences || []).forEach((group) => {
            (group.preferences || []).forEach((pref) => {
                const row = getRow(pref);
                payload.push({
                    scope_type: pref.scope_type,
                    scope_id: pref.scope_id,
                    alert_type: pref.alert_type,
                    enabled: row.enabled,
                    email_enabled: row.email_enabled,
                    cooldown_minutes: row.cooldown_minutes,
                });
            });
        });
        onSave(payload);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.96, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.96, opacity: 0 }}
                        className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Alert Preferences</p>
                                <p className="text-xs text-gray-400">
                                    Configure which alerts are shown and which send email notifications.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {!hasRows ? (
                            <div className="px-6 py-12 text-center text-sm text-gray-400">
                                No alert preferences available yet.
                            </div>
                        ) : (
                            <div className="max-h-[70vh] overflow-y-auto">
                                <div className="px-5 py-4">
                                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        <Settings2 size={13} /> Tenant-level Alerts
                                    </p>
                                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                                        <table className="min-w-full text-left">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Alert Type</th>
                                                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Show in Dashboard</th>
                                                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Send Email</th>
                                                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Cooldown (min)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {(data?.tenant_preferences || []).map((pref) => {
                                                    const row = getRow(pref);
                                                    return (
                                                        <tr key={toKey(pref)}>
                                                            <td className="px-3 py-2 text-xs font-medium text-gray-800">
                                                                {LABELS[pref.alert_type] || pref.alert_type}
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={row.enabled}
                                                                    onChange={(e) => setField(pref, 'enabled', e.target.checked)}
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={row.email_enabled}
                                                                    onChange={(e) => setField(pref, 'email_enabled', e.target.checked)}
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    value={row.cooldown_minutes}
                                                                    onChange={(e) => setField(pref, 'cooldown_minutes', Number(e.target.value || 1))}
                                                                    className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 outline-none focus:border-[#0046FF]/50"
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="px-5 pb-5">
                                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        <Mail size={13} /> Per-Inbox Overrides
                                    </p>
                                    {(data?.inbox_preferences || []).map((group) => (
                                        <div key={group.inbox_id} className="mb-3 rounded-xl border border-gray-100">
                                            <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                                                {group.email_address}
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-left">
                                                    <thead className="bg-white">
                                                        <tr>
                                                            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Alert Type</th>
                                                            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Show</th>
                                                            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Email</th>
                                                            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Cooldown</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 bg-white">
                                                        {(group.preferences || []).map((pref) => {
                                                            const row = getRow(pref);
                                                            return (
                                                                <tr key={toKey(pref)}>
                                                                    <td className="px-3 py-2 text-xs font-medium text-gray-800">
                                                                        {LABELS[pref.alert_type] || pref.alert_type}
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={row.enabled}
                                                                            onChange={(e) => setField(pref, 'enabled', e.target.checked)}
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={row.email_enabled}
                                                                            onChange={(e) => setField(pref, 'email_enabled', e.target.checked)}
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            value={row.cooldown_minutes}
                                                                            onChange={(e) => setField(pref, 'cooldown_minutes', Number(e.target.value || 1))}
                                                                            className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 outline-none focus:border-[#0046FF]/50"
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4">
                            <button
                                onClick={onClose}
                                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submit}
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 rounded-xl bg-[#0046FF] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                            >
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                                Save Preferences
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
