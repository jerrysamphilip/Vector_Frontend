import { Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react';

// Tenants console hero: title, tenant search, refresh and "New tenant".
export default function TenantsConsoleHeader({ admin }) {
    const {
        dashboard, queryClient, search, setSearch, setShowCreateModal
    } = admin;
    return (
        <div className="card-anim overflow-hidden rounded-[28px] bg-white/80 shadow-sm ring-1 ring-white/70" style={{ animationDelay: '0ms' }}>
            <div
                className="flex flex-col gap-6 px-5 py-6 sm:px-7 sm:py-7 xl:flex-row xl:items-end xl:justify-between"
                style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.12), rgba(115,200,210,0.14), rgba(255,255,255,0.92))' }}
            >
                <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2d6bbf] shadow-sm">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Platform Control Center
                    </div>
                    <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">{dashboard ? 'Platform Administration' : 'Tenants'}</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        {dashboard
                            ? 'Manage tenants, users, suspension state, and system-wide growth from one operational surface.'
                            : 'Every workspace on the platform: search, inspect, suspend or reactivate, and add tenants.'}
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative sm:min-w-[280px]">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search tenants..."
                            aria-label="Search tenants"
                            className="w-full rounded-2xl border border-slate-200 bg-white/90 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15"
                        />
                    </div>
                    <button
                        onClick={() => {
                            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                            queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
                            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
                            queryClient.invalidateQueries({ queryKey: ['admin-scheduler'] });
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-[#2d6bbf]"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                    >
                        <Plus className="h-4 w-4" />
                        Add Tenant
                    </button>
                </div>
            </div>
        </div>
    );
}
