import { Building2, Eye, PauseCircle, PlayCircle } from 'lucide-react';
import { Skeleton, SectionCard, StatusBadge, formatDate } from './adminShared';
import LoadError from '../ui/LoadError';

// Tenant roster table: status, users, campaigns, created date; view details, suspend / reactivate.
export default function TenantRosterCard({ admin }) {
    const {
        changeStatus, setSelectedTenant, statusMutation, tenants, tenantsLoading, tenantsError, refetchTenants
    } = admin;
    return (
        <SectionCard
            title="Tenant Roster"
            subtitle={`${tenants?.length ?? 0} visible tenants`}
            icon={Building2}
            delay="400ms"
            action={
                <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                    Live tenant status
                </div>
            }
        >
            <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            {['Tenant', 'Status', 'Users', 'Campaigns', 'Created', 'Actions'].map((header) => (
                                <th key={header} className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500/90">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {tenantsLoading ? (
                            Array.from({ length: 4 }).map((_, index) => (
                                <tr key={index}>
                                    {Array.from({ length: 6 }).map((__, cellIndex) => (
                                        <td key={cellIndex} className="px-5 py-4">
                                            <Skeleton className="h-4 w-full" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : tenantsError ? (
                            <tr>
                                <td colSpan={6}>
                                    <LoadError error={tenantsError} onRetry={refetchTenants} title="Couldn't load tenants" compact />
                                </td>
                            </tr>
                        ) : tenants?.length ? (
                            tenants.map((tenant, index) => (
                                <tr key={tenant.tenant_id} className={`transition-colors hover:bg-blue-50/40 ${index % 2 ? 'bg-slate-50/45' : 'bg-white'}`}>
                                    <td className="px-5 py-4">
                                        <p className="text-sm font-semibold text-slate-800">{tenant.tenant_name}</p>
                                        <p className="mt-1 text-[11px] font-mono text-slate-400">{tenant.tenant_id.slice(0, 8)}…</p>
                                    </td>
                                    <td className="px-5 py-4"><StatusBadge status={tenant.status} /></td>
                                    <td className="px-5 py-4 text-sm font-semibold text-[#2d6bbf]">{tenant.user_count}</td>
                                    <td className="px-5 py-4 text-sm font-semibold text-slate-700">{tenant.campaign_count}</td>
                                    <td className="px-5 py-4 text-sm text-slate-500">{formatDate(tenant.created_at)}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setSelectedTenant(tenant.tenant_id)}
                                                className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-[#2d6bbf] transition hover:bg-blue-100"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                View
                                            </button>
                                            {tenant.status === 'ACTIVE' ? (
                                                <button
                                                    onClick={() => changeStatus(tenant, 'SUSPENDED')}
                                                    disabled={statusMutation.isPending}
                                                    className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                                                >
                                                    <PauseCircle className="h-3.5 w-3.5" />
                                                    Suspend
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => changeStatus(tenant, 'ACTIVE')}
                                                    disabled={statusMutation.isPending}
                                                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                                                >
                                                    <PlayCircle className="h-3.5 w-3.5" />
                                                    Activate
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-5 py-16 text-center text-sm text-slate-400">
                                    No tenants found for the current search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </SectionCard>
    );
}
