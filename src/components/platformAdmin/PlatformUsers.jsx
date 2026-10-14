import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Search, Users } from 'lucide-react';
import { platformAdminApi } from '../../api/platformAdmin';
import { Skeleton, SectionCard, StatusBadge, RoleBadge, formatDate, errDetail } from './adminShared';

/** Read-only list of every tenant user (/api/admin/users, first 200 matches). */
export default function PlatformUsers() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const { data: users, isLoading, isError, error } = useQuery({
        queryKey: ['admin-users', search],
        queryFn: () => platformAdminApi.listAllUsers(search ? { search } : {}),
        staleTime: 30_000,
    });

    return (
        <div className="mx-auto max-w-[1480px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
            <div className="card-anim overflow-hidden rounded-[28px] bg-white/80 shadow-sm ring-1 ring-white/70">
                <div
                    className="flex flex-col gap-6 px-5 py-6 sm:px-7 sm:py-7 xl:flex-row xl:items-end xl:justify-between"
                    style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.12), rgba(115,200,210,0.14), rgba(255,255,255,0.92))' }}
                >
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2d6bbf] shadow-sm">
                            <Users className="h-3.5 w-3.5" />
                            All tenants
                        </div>
                        <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Users</h1>
                        <p className="mt-2 text-sm text-slate-500">Every tenant user across the platform (read-only).</p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative sm:min-w-[280px]">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search users..."
                                aria-label="Search users by name or email"
                                className="w-full rounded-2xl border border-slate-200 bg-white/90 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-[#2d6bbf]"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            <SectionCard
                title="User Directory"
                subtitle={`${users?.length ?? 0} users${users?.length === 200 ? ' (first 200 shown: refine the search)' : ''}`}
                icon={Users}
                delay="80ms"
            >
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                {['Name', 'Email', 'Tenant', 'Role', 'Status', 'Last login'].map((header) => (
                                    <th key={header} className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500/90">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                Array.from({ length: 4 }).map((_, index) => (
                                    <tr key={index}>
                                        {Array.from({ length: 6 }).map((__, cellIndex) => (
                                            <td key={cellIndex} className="px-5 py-4"><Skeleton className="h-4 w-full" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : isError ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-16 text-center text-sm text-rose-600">
                                        {errDetail(error, 'Could not load users.')}
                                    </td>
                                </tr>
                            ) : users?.length ? (
                                users.map((user, index) => (
                                    <tr key={user.user_id} className={index % 2 ? 'bg-slate-50/45' : 'bg-white'}>
                                        <td className="px-5 py-4 text-sm font-semibold text-slate-800">{`${user.first_name} ${user.last_name}`.trim() || '—'}</td>
                                        <td className="px-5 py-4 text-sm text-slate-500">{user.email}</td>
                                        <td className="px-5 py-4 text-sm text-slate-700">{user.tenant_name || '—'}</td>
                                        <td className="px-5 py-4"><RoleBadge role={user.role} /></td>
                                        <td className="px-5 py-4"><StatusBadge status={user.status} /></td>
                                        <td className="px-5 py-4 text-sm text-slate-500">{formatDate(user.last_login_at)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-5 py-16 text-center text-sm text-slate-400">
                                        No users found for the current search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </div>
    );
}
