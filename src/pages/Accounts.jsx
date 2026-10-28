import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Building2, ChevronLeft, ChevronRight, Loader2, Wand2, X, Columns3, Filter, Download, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { errorMessage } from '../api/contacts';
import { companiesApi } from '../api/accounts';
import { useAuth } from '../auth/AuthProvider';
import LoadError from '../components/ui/LoadError';
import { withVersion } from '../lib/staleVersion';
import {
    Modal, Field, inputClass, ErrorNote, PrimaryButton, SecondaryButton, BRAND_GRADIENT, CustomFieldInput, useCrmMeta,
} from '../components/contacts/shared';
import CompanyCell, { formatRevenue } from '../components/accounts/CompanyCell';
import ColumnChooser from '../components/accounts/ColumnChooser';
import CompanyFilters from '../components/accounts/CompanyFilters';
import BackfillDialog from '../components/accounts/BackfillDialog';
import CompanyPropertiesModal from '../components/accounts/CompanyPropertiesModal';
import { CompanyViewsMenu, SaveCompanyViewModal, VIEWS_KEY } from '../components/accounts/CompanyViews';
import {
    availableColumns, exportColumns, filterFields, readColumns, storeColumns,
} from '../components/accounts/companyColumns';

export { formatRevenue };

const PAGE_SIZE = 25;
const EMPTY_FILTER = { op: 'AND', conditions: [] };

export function AccountFormModal({ account, properties = [], onClose, onSaved }) {
    const [form, setForm] = useState({
        name: account?.name || '', domain: account?.domain || '', website: account?.website || '',
        phone: account?.phone || '', industry: account?.industry || '', emp_band: account?.emp_band || '',
        street: account?.street || '', city: account?.city || '', state: account?.state || '',
        postal_code: account?.postal_code || '', country: account?.country || '',
        annual_revenue: account?.annual_revenue ?? '', lifecycle_stage: account?.lifecycle_stage || '',
        description: account?.description || '',
    });
    const [custom, setCustom] = useState(() => ({ ...(account?.custom_fields || {}) }));
    const [version] = useState(() => account?.row_version); // as loaded when the form opened (T-3)
    const { meta } = useCrmMeta();
    const [error, setError] = useState(null);
    const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
    const save = useMutation({
        mutationFn: () => {
            const payload = { ...form, annual_revenue: form.annual_revenue === '' || form.annual_revenue == null ? null : String(form.annual_revenue), lifecycle_stage: form.lifecycle_stage || null };
            if (properties.length) payload.custom_fields = Object.fromEntries(properties.map(p => [p.field_key, custom[p.field_key] ?? null]));
            return account ? companiesApi.update(account.account_id, withVersion(payload, version)) : companiesApi.create(payload);
        },
        onSuccess: onSaved,
        onError: err => setError(errorMessage(err)),
    });

    return (
        <Modal title={account ? 'Edit company' : 'New company'} subtitle={account ? 'Renaming updates the company name on its contacts' : 'A company your contacts work at'}
            onClose={onClose} width="max-w-xl"
            footer={<>
                <SecondaryButton onClick={onClose} className="flex-1">Cancel</SecondaryButton>
                <PrimaryButton onClick={() => save.mutate()} loading={save.isPending} disabled={!form.name.trim()} className="flex-1">
                    {account ? 'Save' : 'Create company'}
                </PrimaryButton>
            </>}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Name *" className="sm:col-span-2"><input className={inputClass} value={form.name} onChange={set('name')} autoFocus /></Field>
                <Field label="Domain"><input className={inputClass} value={form.domain} onChange={set('domain')} placeholder="acme.com" /></Field>
                <Field label="Website"><input type="url" className={inputClass} value={form.website} onChange={set('website')} placeholder="https://" /></Field>
                <Field label="Phone"><input type="tel" className={inputClass} value={form.phone} onChange={set('phone')} /></Field>
                <Field label="Industry"><input className={inputClass} value={form.industry} onChange={set('industry')} /></Field>
                <Field label="Employees"><input className={inputClass} value={form.emp_band} onChange={set('emp_band')} placeholder="51-200" /></Field>
                <Field label="Annual revenue (USD)"><input inputMode="decimal" className={inputClass} value={form.annual_revenue} onChange={set('annual_revenue')} placeholder="2500000" /></Field>
                <Field label="Lifecycle stage">
                    <select className={inputClass} value={form.lifecycle_stage} onChange={set('lifecycle_stage')}>
                        <option value="">Not set</option>
                        {(meta?.lifecycle_stages || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </Field>
                <Field label="Street" className="sm:col-span-2"><input className={inputClass} value={form.street} onChange={set('street')} /></Field>
                <Field label="City"><input className={inputClass} value={form.city} onChange={set('city')} /></Field>
                <Field label="State"><input className={inputClass} value={form.state} onChange={set('state')} /></Field>
                <Field label="Postal code"><input className={inputClass} value={form.postal_code} onChange={set('postal_code')} /></Field>
                <Field label="Country"><input className={inputClass} value={form.country} onChange={set('country')} /></Field>
                <Field label="About" className="sm:col-span-2">
                    <textarea rows={3} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400" value={form.description} onChange={set('description')} />
                </Field>
                {properties.map(p => (
                    <Field key={p.field_key} label={`${p.label}${p.required ? ' *' : ''}`}>
                        <CustomFieldInput field={p} value={custom[p.field_key]} onChange={v => setCustom(c => ({ ...c, [p.field_key]: v }))} />
                    </Field>
                ))}
            </div>
            <div className="mt-3"><ErrorNote message={error} /></div>
        </Modal>
    );
}

function useDebounced(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

const toolButton = 'h-9 px-3 flex items-center gap-1.5 text-sm font-medium rounded-xl border border-slate-200 text-slate-600 bg-white';
const headerButton = 'flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 whitespace-nowrap disabled:opacity-60';

export default function Accounts() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = useAuth();
    const canManage = hasPermission('manage_prospects');
    const { meta, stageLabel } = useCrmMeta();
    const [search, setSearch] = useState('');
    const q = useDebounced(search);
    const [owner, setOwner] = useState('');
    const [status, setStatus] = useState('active');
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState({ by: 'name', order: 'asc' });
    const [filters, setFilters] = useState(EMPTY_FILTER);
    const [columns, setColumnsState] = useState(readColumns);
    const [view, setView] = useState(null);
    const [panel, setPanel] = useState(null); // 'filters' | 'columns' | 'export'
    const [dialog, setDialog] = useState(null); // 'new' | 'backfill' | 'properties' | 'save-view'
    const [notice, setNotice] = useState(null);

    useEffect(() => { setPage(1); }, [q]);
    const setColumns = (cols) => { setColumnsState(cols); storeColumns(cols); };
    const togglePanel = (name) => setPanel(p => (p === name ? null : name));

    const params = { q, owner, status, sort_by: sort.by, sort_order: sort.order, page, page_size: PAGE_SIZE, filters };
    const { data, isLoading, isFetching, error: loadError, refetch } = useQuery({
        queryKey: ['accounts', params], queryFn: () => companiesApi.list(params), placeholderData: keepPreviousData,
    });

    const properties = useMemo(() => data?.custom_properties || [], [data]);
    const available = useMemo(() => availableColumns(properties), [properties]);
    const shown = columns.map(key => available.find(c => c.key === key)).filter(Boolean);
    const fields = useMemo(() => filterFields(properties, meta?.lifecycle_stages), [properties, meta]);
    const nFilters = filters.conditions.length;
    const archived = status === 'archived';

    const restore = useMutation({
        mutationFn: companiesApi.restore,
        onSuccess: () => { setNotice('Company restored.'); queryClient.invalidateQueries({ queryKey: ['accounts'] }); },
        onError: err => setNotice(errorMessage(err)),
    });
    const refreshAll = () => {
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
    };

    const applyView = (v) => {
        setView(v);
        setFilters(v?.filters?.conditions ? v.filters : EMPTY_FILTER);
        if (v?.columns?.length) setColumns(v.columns.includes('name') ? v.columns : ['name', ...v.columns]);
        if (v?.sort?.by) setSort({ by: v.sort.by, order: v.sort.order === 'desc' ? 'desc' : 'asc' });
        setPage(1);
    };
    const exportView = (format) => {
        setPanel(null);
        companiesApi.exportFile({ format, columns: exportColumns(columns), q, owner, status, filters })
            .catch(err => setNotice(errorMessage(err)));
    };

    const items = data?.items || [];
    const total = data?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const sortHeader = (col) => (
        col.sort ? (
            <button onClick={() => setSort(s => ({ by: col.sort, order: s.by === col.sort && s.order === 'asc' ? 'desc' : 'asc' }))}
                className={`uppercase tracking-wide whitespace-nowrap ${sort.by === col.sort ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                {col.label}{sort.by === col.sort ? (sort.order === 'asc' ? ' ↑' : ' ↓') : ''}
            </button>
        ) : <span className="uppercase tracking-wide text-slate-400 whitespace-nowrap">{col.label}</span>
    );

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900">Companies</h1>
                    <p className="text-sm text-gray-400 mt-1">Companies your contacts work at</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {canManage && (
                        <button onClick={() => setDialog('backfill')}
                            title="Create companies from contacts' email domains and company names, and link contacts that have none"
                            className={headerButton}>
                            <Wand2 className="w-4 h-4" /> Link contacts by company
                        </button>
                    )}
                    {data?.can_export && (
                        <div className="relative">
                            <button onClick={() => togglePanel('export')} className={headerButton} aria-expanded={panel === 'export'}><Download className="w-4 h-4" /> Export</button>
                            {panel === 'export' && (
                                <div className="absolute right-0 top-12 z-30 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-1" role="menu">
                                    {['csv', 'xlsx'].map(fmt => (
                                        <button key={fmt} role="menuitem" className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50" onClick={() => exportView(fmt)}>
                                            This view as {fmt.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {canManage && (
                        <button onClick={() => setDialog('properties')} className={headerButton}><SlidersHorizontal className="w-4 h-4" /> Properties</button>
                    )}
                    <button onClick={() => setDialog('new')}
                        className="flex items-center gap-2 text-white h-9 px-4 rounded-lg text-sm font-semibold hover:opacity-90 hover:scale-[1.02] whitespace-nowrap"
                        style={{ background: BRAND_GRADIENT }}>
                        <Plus className="w-4 h-4" /> New company
                    </button>
                </div>
            </div>

            {notice && (
                <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-800">
                    {notice}<button onClick={() => setNotice(null)} aria-label="Dismiss"><X className="w-4 h-4" /></button>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 overflow-visible" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="px-5 py-4 flex items-center gap-3 flex-wrap rounded-t-2xl" style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}>
                    <CompanyViewsMenu current={view} onApply={applyView} onSave={() => setDialog('save-view')} />
                    {canManage && (
                        <div className="flex bg-white rounded-xl border border-slate-200 p-0.5">
                            {[['', 'All companies'], ['me', 'My companies'], ['unassigned', 'Unassigned']].map(([value, label]) => (
                                <button key={label} onClick={() => { setOwner(value); setPage(1); }}
                                    className={`px-3 h-8 text-sm font-medium rounded-lg ${owner === value ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</button>
                            ))}
                        </div>
                    )}
                    {canManage && (
                        <div className="flex bg-white rounded-xl border border-slate-200 p-0.5" role="group" aria-label="Status">
                            {[['active', 'Active'], ['archived', 'Archived']].map(([value, label]) => (
                                <button key={value} onClick={() => { setStatus(value); setPage(1); }} aria-pressed={status === value}
                                    className={`px-3 h-8 text-sm font-medium rounded-lg ${status === value ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</button>
                            ))}
                        </div>
                    )}
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, domain or industry…"
                            className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" />
                    </div>
                    <button onClick={() => togglePanel('filters')} aria-expanded={panel === 'filters'} className={toolButton}>
                        <Filter className="w-4 h-4" /> Filters{nFilters ? ` (${nFilters})` : ''}
                    </button>
                    <div className="relative">
                        <button onClick={() => togglePanel('columns')} aria-expanded={panel === 'columns'} className={toolButton}><Columns3 className="w-4 h-4" /> Columns</button>
                        {panel === 'columns' && <ColumnChooser columns={columns} setColumns={setColumns} available={available} onClose={() => setPanel(null)} />}
                    </div>
                    <span className="ml-auto text-sm text-slate-500 flex items-center gap-2">
                        {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{total.toLocaleString()} compan{total !== 1 ? 'ies' : 'y'}
                    </span>
                </div>
                {panel === 'filters' && (
                    <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                        <CompanyFilters value={filters} fields={fields} onChange={f => { setFilters(f); setPage(1); }} />
                        {nFilters > 0 && <button onClick={() => { setFilters(EMPTY_FILTER); setPage(1); }} className="mt-2 text-xs font-semibold text-slate-500 hover:text-slate-700">Clear filters</button>}
                    </div>
                )}

                {isLoading ? (
                    <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                ) : loadError && !data ? (
                    <LoadError error={loadError} onRetry={refetch} title="Couldn't load companies" />
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center mb-5">
                            <Building2 className="w-9 h-9 text-indigo-400" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 mb-1">{archived ? 'No archived companies' : q || nFilters ? 'No companies match' : 'No companies yet'}</h3>
                        <p className="text-sm text-slate-500 max-w-xs">
                            {archived ? 'Deleted companies stay here for 90 days.' : q || nFilters ? 'Try a different search or change the filters.' : 'Companies are created automatically from contacts’ email domains, or add one yourself.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-left">
                                    {shown.map((col, i) => <th key={col.key} className={`${i === 0 ? 'pl-5 pr-3' : 'px-3'} py-3`}>{sortHeader(col)}</th>)}
                                    {archived && <th className="px-3 pr-5 py-3 text-slate-400 uppercase tracking-wide">Deleted</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {items.map(a => (
                                    <tr key={a.account_id} onClick={archived ? undefined : () => navigate(`/app/accounts/${a.account_id}`)}
                                        className={archived ? '' : 'cursor-pointer hover:bg-slate-50/70'}>
                                        {shown.map((col, i) => (
                                            <td key={col.key} className={`${i === 0 ? 'pl-5 pr-3' : 'px-3'} py-3 text-sm text-slate-600`}>
                                                <CompanyCell column={col} account={a} stageLabel={stageLabel} />
                                            </td>
                                        ))}
                                        {archived && (
                                            <td className="px-3 pr-5 py-3 text-sm whitespace-nowrap">
                                                <button onClick={() => restore.mutate(a.account_id)} disabled={restore.isPending}
                                                    className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1">
                                                    <RotateCcw className="w-3.5 h-3.5" /> Restore
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {total > PAGE_SIZE && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                        <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
                        <div className="flex gap-1">
                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
                            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                )}
            </div>

            {dialog === 'new' && (
                <AccountFormModal properties={properties} onClose={() => setDialog(null)}
                    onSaved={account => {
                        setDialog(null);
                        queryClient.invalidateQueries({ queryKey: ['accounts'] });
                        navigate(`/app/accounts/${account.account_id}`);
                    }} />
            )}
            {dialog === 'backfill' && <BackfillDialog onClose={() => setDialog(null)} onChanged={refreshAll} />}
            {dialog === 'properties' && <CompanyPropertiesModal onClose={() => setDialog(null)} onChanged={() => queryClient.invalidateQueries({ queryKey: ['accounts'] })} />}
            {dialog === 'save-view' && (
                <SaveCompanyViewModal view={view} canShare={canManage} onClose={() => setDialog(null)}
                    state={{ filters, columns, sort }}
                    onSaved={v => { setDialog(null); setView(v); queryClient.invalidateQueries({ queryKey: VIEWS_KEY }); }} />
            )}
        </div>
    );
}
