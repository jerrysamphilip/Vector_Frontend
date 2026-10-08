import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Play, Save, Trash2, X, Table2, BarChart2 } from 'lucide-react';
import { errorMessage } from '../../api/contacts';
import { customReportsApi, money } from '../../api/sales';
import { ErrorNote, PrimaryButton, SecondaryButton } from '../contacts/shared';
import { HBar, Seg, card, cardShadow, selectSm } from './shared';

const blank = { object: 'deals', group_by: 'stage', group_by_2: '', measure: 'count', filters: [], date_field: '', date_from: '', date_to: '', chart: 'bar' };

function clean(def) {
    return {
        ...def, group_by_2: def.group_by_2 || null, date_field: def.date_field || null,
        date_from: def.date_from || null, date_to: def.date_to || null,
        filters: def.filters.filter(f => f.field && (['is_empty', 'is_not_empty'].includes(f.operator) || f.value)),
    };
}

function Result({ result, chart }) {
    if (!result) return null;
    const fmt = (v) => (v == null ? '—' : result.money ? money(v) : Number(v).toLocaleString());
    if (!result.rows.length) return <p className="text-sm text-slate-400 py-8 text-center">No records match.</p>;
    if (result.columns) {
        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50/80 text-xs font-semibold text-left text-slate-400 uppercase">
                        <th className="pl-4 py-2.5" />{result.columns.map(c => <th key={c.key} className="px-3 py-2.5 text-right whitespace-nowrap">{c.label}</th>)}
                        {result.total != null && <th className="px-4 py-2.5 text-right">Total</th>}</tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {result.rows.map(r => (
                            <tr key={r.key}><td className="pl-4 py-2 font-medium text-slate-700">{r.label}</td>
                                {result.columns.map(c => <td key={c.key} className="px-3 py-2 text-right tabular-nums">{r.values[c.key] != null ? fmt(r.values[c.key]) : '—'}</td>)}
                                {result.total != null && <td className="px-4 py-2 text-right tabular-nums font-semibold">{fmt(r.value)}</td>}</tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }
    const max = Math.max(...result.rows.map(r => r.value || 0), 0);
    return (
        <div>
            {chart === 'table' ? (
                <table className="w-full text-sm"><tbody className="divide-y divide-slate-50">
                    {result.rows.map(r => <tr key={r.key ?? r.label}><td className="py-2 text-slate-700">{r.label}</td><td className="py-2 text-right tabular-nums font-semibold">{fmt(r.value)}</td></tr>)}
                </tbody></table>
            ) : result.rows.map(r => <HBar key={r.key ?? r.label} label={r.label} value={r.value || 0} max={max} display={fmt(r.value)} />)}
            {result.total != null && <p className="text-sm text-slate-600 text-right mt-3 pt-3 border-t border-slate-100">Total <span className="font-bold text-slate-900 ml-2">{fmt(result.total)}</span></p>}
        </div>
    );
}

/** Build, save and share reports on leads, deals, contacts, activities and tasks (BR-SF-14). */
export default function CustomReports() {
    const qc = useQueryClient();
    const { data: meta } = useQuery({ queryKey: ['custom-report-meta'], queryFn: customReportsApi.meta, staleTime: 300000 });
    const { data: saved = [] } = useQuery({ queryKey: ['custom-reports'], queryFn: customReportsApi.list });
    const [active, setActive] = useState(null); // saved report being viewed / edited
    const [def, setDef] = useState(blank);
    const [name, setName] = useState('');
    const [shared, setShared] = useState(true);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const spec = meta?.objects?.[def.object];
    const set = (patch) => setDef(d => ({ ...d, ...patch }));

    const run = useMutation({ mutationFn: () => customReportsApi.run(clean(def)), onSuccess: r => { setResult(r); setError(null); }, onError: e => setError(errorMessage(e)) });
    const save = useMutation({
        mutationFn: () => (active?.can_edit ? customReportsApi.update(active.report_id, { name, shared, definition: clean(def) })
            : customReportsApi.create({ name, shared, definition: clean(def) })),
        onSuccess: r => { setActive(r); setError(null); qc.invalidateQueries({ queryKey: ['custom-reports'] }); },
        onError: e => setError(errorMessage(e)),
    });
    const remove = useMutation({ mutationFn: id => customReportsApi.remove(id), onSuccess: () => { newReport(); qc.invalidateQueries({ queryKey: ['custom-reports'] }); } });

    const open = async (r) => {
        setActive(r); setName(r.name); setShared(r.shared);
        setDef({ ...blank, ...r.definition, group_by_2: r.definition.group_by_2 || '', date_field: r.definition.date_field || '',
            date_from: r.definition.date_from || '', date_to: r.definition.date_to || '' });
        try { const full = await customReportsApi.get(r.report_id); setResult(full.result); setError(null); } catch (e) { setError(errorMessage(e)); }
    };
    function newReport() { setActive(null); setName(''); setShared(true); setDef(blank); setResult(null); setError(null); }
    useEffect(() => { if (meta && spec && !spec.fields[def.group_by]) set({ group_by: Object.keys(spec.fields)[0], group_by_2: '', measure: 'count', filters: [], date_field: '' }); }, [def.object, meta]); // eslint-disable-line react-hooks/exhaustive-deps
    const fieldOptions = useMemo(() => Object.entries(spec?.fields || {}), [spec]);

    if (!meta) return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>;
    const canBuild = meta.can_build;

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr] gap-5">
            <div className={`${card} p-3 h-fit`} style={cardShadow}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-2 py-1">Saved reports</p>
                {canBuild && <button onClick={newReport} className="w-full text-left px-2 py-2 rounded-lg text-sm font-semibold text-indigo-600 hover:bg-indigo-50 flex items-center gap-1.5"><Plus className="w-4 h-4" /> New report</button>}
                {saved.map(r => (
                    <button key={r.report_id} onClick={() => open(r)}
                        className={`w-full text-left px-2 py-2 rounded-lg text-sm ${active?.report_id === r.report_id ? 'bg-indigo-50 text-indigo-800' : 'text-slate-700 hover:bg-slate-50'}`}>
                        <span className="block truncate font-medium">{r.name}</span>
                        <span className="block text-[11px] text-slate-400 truncate">{r.owner_name || ''}{r.shared ? ' · shared' : ' · private'}</span>
                    </button>
                ))}
                {!saved.length && <p className="text-xs text-slate-400 px-2 py-2">None yet.</p>}
            </div>

            <div className="space-y-4 min-w-0">
                {canBuild ? (
                    <div className={`${card} p-5 space-y-3`} style={cardShadow}>
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-sm text-slate-500">Show</span>
                            <select className={selectSm} value={def.measure} onChange={e => set({ measure: e.target.value })} aria-label="Measure">
                                {Object.entries(spec?.measures || {}).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                            </select>
                            <span className="text-sm text-slate-500">of</span>
                            <select className={selectSm} value={def.object} onChange={e => set({ object: e.target.value })} aria-label="Object">
                                {Object.entries(meta.objects).map(([k, o]) => <option key={k} value={k}>{o.label}</option>)}
                            </select>
                            <span className="text-sm text-slate-500">by</span>
                            <select className={selectSm} value={def.group_by} onChange={e => set({ group_by: e.target.value })} aria-label="Group by">
                                {fieldOptions.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                            </select>
                            <span className="text-sm text-slate-500">and</span>
                            <select className={selectSm} value={def.group_by_2} onChange={e => set({ group_by_2: e.target.value })} aria-label="Then by">
                                <option value="">(nothing: a list)</option>
                                {fieldOptions.filter(([k]) => k !== def.group_by).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <select className={selectSm} value={def.date_field} onChange={e => set({ date_field: e.target.value })} aria-label="Date field">
                                <option value="">Any date</option>
                                {Object.entries(spec?.dates || {}).map(([k, l]) => <option key={k} value={k}>{l} between</option>)}
                            </select>
                            {def.date_field && <>
                                <input type="date" className={selectSm} value={def.date_from} onChange={e => set({ date_from: e.target.value })} aria-label="From" />
                                <span className="text-sm text-slate-400">and</span>
                                <input type="date" className={selectSm} value={def.date_to} onChange={e => set({ date_to: e.target.value })} aria-label="To" />
                            </>}
                        </div>
                        {def.filters.map((f, i) => (
                            <div key={i} className="flex flex-wrap gap-2 items-center">
                                <span className="text-sm text-slate-500 w-10">{i === 0 ? 'Where' : 'and'}</span>
                                <select className={selectSm} value={f.field} onChange={e => set({ filters: def.filters.map((x, j) => (j === i ? { ...x, field: e.target.value } : x)) })}>
                                    {fieldOptions.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                </select>
                                <select className={selectSm} value={f.operator} onChange={e => set({ filters: def.filters.map((x, j) => (j === i ? { ...x, operator: e.target.value } : x)) })}>
                                    {Object.entries(meta.operators).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                </select>
                                {!['is_empty', 'is_not_empty'].includes(f.operator) && (
                                    <input className={`${selectSm} w-48`} value={f.value} placeholder={f.field === 'owner' ? '"me" or a user id' : 'Value'}
                                        onChange={e => set({ filters: def.filters.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} />
                                )}
                                <button onClick={() => set({ filters: def.filters.filter((_, j) => j !== i) })} className="p-1 text-slate-400 hover:text-red-500" aria-label="Remove filter"><X className="w-4 h-4" /></button>
                            </div>
                        ))}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button onClick={() => set({ filters: [...def.filters, { field: fieldOptions[0]?.[0], operator: 'is', value: '' }] })}
                                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Plus className="w-4 h-4" /> Filter</button>
                            <div className="ml-auto flex items-center gap-2">
                                {!def.group_by_2 && <Seg value={def.chart} onChange={v => set({ chart: v })} options={[['bar', <BarChart2 key="b" className="w-4 h-4" />], ['table', <Table2 key="t" className="w-4 h-4" />]]} />}
                                <PrimaryButton onClick={() => run.mutate()} loading={run.isPending}><Play className="w-4 h-4" /> Run</PrimaryButton>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                            <input className={`${selectSm} flex-1 min-w-[200px]`} value={name} onChange={e => setName(e.target.value)} placeholder="Report name" />
                            <label className="flex items-center gap-1.5 text-sm text-slate-600"><input type="checkbox" className="accent-indigo-600" checked={shared} onChange={e => setShared(e.target.checked)} /> Share with workspace</label>
                            <SecondaryButton onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}><Save className="w-4 h-4" /> {active?.can_edit ? 'Save changes' : 'Save report'}</SecondaryButton>
                            {active?.can_edit && <button onClick={() => window.confirm(`Delete "${active.name}"?`) && remove.mutate(active.report_id)} className="p-2 text-slate-400 hover:text-red-600" aria-label="Delete report"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                        <p className="text-xs text-slate-400">Everyone who opens a shared report sees only their own and their team's records.</p>
                    </div>
                ) : (
                    <p className="text-sm text-slate-500">Managers build reports; open a shared one on the left.</p>
                )}
                <ErrorNote message={error} />
                {result && (
                    <div className={`${card} p-5`} style={cardShadow}>
                        <h2 className="text-sm font-bold text-slate-800 mb-3">{active?.name || 'Result'} <span className="font-normal text-slate-400">· {result.measure_label}</span></h2>
                        <Result result={result} chart={def.group_by_2 ? 'table' : def.chart} />
                    </div>
                )}
            </div>
        </div>
    );
}
