import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldCheck, Users, X } from 'lucide-react';
import { platformAdminApi } from '../../api/platformAdmin';
import DialogPanel from '../ui/DialogPanel';
import { Skeleton, SectionCard, StatusBadge, RoleBadge, StatPill, formatDate } from './adminShared';

// Platform admin: one tenant's details, users and usage.

export default function TenantDetailModal({ tenantId, onClose }) {
    const { data, isLoading } = useQuery({
        queryKey: ['admin-tenant-detail', tenantId],
        queryFn: () => platformAdminApi.getTenantDetail(tenantId),
        enabled: !!tenantId,
    });
    const titleId = useId();

    if (!tenantId) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[70] flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={onClose} />
                <DialogPanel as={motion.div} onClose={onClose} labelledBy={titleId}
                    aria-label={isLoading ? 'Tenant detail' : undefined}
                    className="relative flex max-h-[84vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl outline-none"
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 12 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                    <div
                        className="flex items-start justify-between px-7 py-6 text-white"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                    >
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Tenant Detail
                            </div>
                            {isLoading ? (
                                <div className="mt-4 h-10 w-52 animate-pulse rounded-xl bg-white/25" />
                            ) : (
                                <h2
                                    id={titleId}
                                    className="mt-4 text-3xl font-bold tracking-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]"
                                    style={{ color: '#ffffff' }}
                                >
                                    {data?.tenant_name || 'Tenant'}
                                </h2>
                            )}
                            <p className="mt-1 text-sm text-white/90">Team, status, and account activity in one place.</p>
                        </div>
                        <button type="button" onClick={onClose} aria-label="Close tenant detail" className="rounded-2xl bg-white/10 p-2.5 text-white/85 transition hover:bg-white/20">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-7">
                        {isLoading ? (
                            <div className="grid gap-4 md:grid-cols-3">
                                <Skeleton className="h-24" />
                                <Skeleton className="h-24" />
                                <Skeleton className="h-24" />
                            </div>
                        ) : data ? (
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-4">
                                    <StatPill label="Status" value={<StatusBadge status={data.status} />} />
                                    <StatPill label="Users" value={data.users?.length || 0} />
                                    <StatPill label="Campaigns" value={data.campaign_count || 0} />
                                    <StatPill label="Created" value={formatDate(data.created_at)} />
                                </div>

                                <SectionCard
                                    title="Tenant Team"
                                    subtitle={`${data.users?.length || 0} team members`}
                                    icon={Users}
                                >
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[680px] text-left">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    {['Name', 'Email', 'Role', 'Status'].map((header) => (
                                                        <th key={header} className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500/90">
                                                            {header}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {data.users?.map((user, index) => (
                                                    <tr key={user.user_id} className={index % 2 ? 'bg-slate-50/50' : 'bg-white'}>
                                                        <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                                                            {user.first_name} {user.last_name}
                                                        </td>
                                                        <td className="px-5 py-4 text-sm text-slate-500">{user.email}</td>
                                                        <td className="px-5 py-4"><RoleBadge role={user.role} /></td>
                                                        <td className="px-5 py-4"><StatusBadge status={user.status} /></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </SectionCard>
                            </div>
                        ) : null}
                    </div>
                </DialogPanel>
            </motion.div>
        </AnimatePresence>
    );
}
