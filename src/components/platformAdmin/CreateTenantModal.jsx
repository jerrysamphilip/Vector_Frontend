import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Building2, CheckCircle2, Copy, X } from 'lucide-react';
import { platformAdminApi } from '../../api/platformAdmin';
import { useDialog } from '../common/useDialog';
import { errorText } from '../../lib/apiErrors';

// Platform admin: create a tenant with its first admin. The admin gets a set-password link by email
// (never a password); the API returns the link here once only on local development without email.

export default function CreateTenantModal({ onClose, onCreated }) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({ tenant_name: '', admin_first_name: '', admin_last_name: '', admin_email: '' });
    const [magicLink, setMagicLink] = useState(null);
    const [copied, setCopied] = useState(false);

    const mutation = useMutation({
        mutationFn: (data) => platformAdminApi.createTenant(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
            if (data.magic_login_link) {
                setMagicLink(data.magic_login_link);
            } else {
                onCreated?.();
                onClose();
            }
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate(form);
    };
    // Escape / backdrop do not dismiss the one-time activation link
    const { titleId, dialogProps } = useDialog({ onClose, closeOnEscape: !magicLink });

    const handleCopy = () => {
        navigator.clipboard.writeText(magicLink).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[80] flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={!magicLink ? onClose : undefined} />
                <motion.div
                    {...dialogProps}
                    className="relative w-full max-w-lg max-h-[90vh] max-h-[90dvh] overflow-x-hidden overflow-y-auto rounded-[28px] bg-white shadow-2xl outline-none"
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 12 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between px-7 py-6 text-white"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                                <Building2 className="h-3.5 w-3.5" />
                                New Tenant
                            </div>
                            <h2
                                id={titleId}
                                className="mt-3 text-2xl font-bold tracking-tight"
                                style={{ color: '#ffffff' }}
                            >
                                Create Tenant
                            </h2>
                            <p className="mt-1 text-sm text-white/85">Set up a new workspace and its Super Admin.</p>
                        </div>
                        <button type="button" onClick={onClose} aria-label="Close" className="rounded-2xl bg-white/10 p-2.5 text-white/85 transition hover:bg-white/20">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-7">
                        {magicLink ? (
                            /* ── Success: show magic link ── */
                            <div className="space-y-5">
                                <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                                    <div>
                                        <p className="text-sm font-semibold text-emerald-800">Tenant created successfully</p>
                                        <p className="mt-0.5 text-xs text-emerald-700">
                                            Email delivery failed (local development) — share this set-password link with the admin. It is shown only once.
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Activation Link</p>
                                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                        <p className="flex-1 truncate font-mono text-xs text-slate-700">{magicLink}</p>
                                        <button
                                            type="button"
                                            onClick={handleCopy}
                                            aria-label={copied ? 'Activation link copied' : 'Copy activation link'}
                                            title="Copy activation link"
                                            className="shrink-0 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-[#2d6bbf] shadow-sm transition hover:bg-blue-50"
                                        >
                                            {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { onCreated?.(); onClose(); }}
                                    className="w-full rounded-2xl py-3 text-sm font-semibold text-white transition hover:opacity-90"
                                    style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            /* ── Create form ── */
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {mutation.isError && (
                                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                        {errorText(mutation.error, 'Failed to create tenant.')}
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="ct-tenant-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Organization / Tenant Name
                                    </label>
                                    <input
                                        id="ct-tenant-name"
                                        required
                                        value={form.tenant_name}
                                        onChange={e => setForm(f => ({ ...f, tenant_name: e.target.value }))}
                                        placeholder="e.g. Acme Corp"
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="ct-first-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            First Name
                                        </label>
                                        <input
                                        id="ct-first-name"
                                            required
                                            value={form.admin_first_name}
                                            onChange={e => setForm(f => ({ ...f, admin_first_name: e.target.value }))}
                                            placeholder="John"
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="ct-last-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            Last Name
                                        </label>
                                        <input
                                        id="ct-last-name"
                                            required
                                            value={form.admin_last_name}
                                            onChange={e => setForm(f => ({ ...f, admin_last_name: e.target.value }))}
                                            placeholder="Doe"
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="ct-admin-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Admin Email
                                    </label>
                                    <input
                                        id="ct-admin-email"
                                        required
                                        type="email"
                                        value={form.admin_email}
                                        onChange={e => setForm(f => ({ ...f, admin_email: e.target.value }))}
                                        placeholder="admin@acme.com"
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={mutation.isPending}
                                        className="flex-1 rounded-2xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                                        style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                                    >
                                        {mutation.isPending ? 'Creating…' : 'Create Tenant'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
