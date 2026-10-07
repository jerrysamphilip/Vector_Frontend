import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { targetsApi, money } from '../api/sales';
import { PageHeader, card, cardShadow } from '../components/sales/shared';
import { ErrorNote } from '../components/contacts/shared';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** One cell: saves when it loses focus, if the value changed. */
function TargetCell({ value, editable, onSave }) {
    const [draft, setDraft] = useState(null);
    const [state, setState] = useState('');
    if (!editable) return <span className="tabular-nums text-slate-700">{value == null ? '—' : money(value)}</span>;
    const commit = async () => {
        if (draft === null) return;
        const next = draft === '' ? 0 : Number(draft);
        if (Number.isNaN(next) || next === (value || 0)) { setDraft(null); return; }
        setState('saving');
        try { await onSave(next); setState('saved'); setTimeout(() => setState(''), 1500); }
        catch { setState('error'); }
        setDraft(null);
    };
    return (
        <input type="number" min="0" step="1000" value={draft ?? (value ?? '')} placeholder="0"
            onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
            className={`w-full h-9 px-2 text-right tabular-nums bg-white border rounded-lg text-sm focus:outline-none focus:border-indigo-400 ${state === 'error' ? 'border-red-300' : state === 'saved' ? 'border-emerald-300' : 'border-slate-200'}`} />
    );
}

export default function SalesTargets() {
    const qc = useQueryClient();
    const [fy, setFy] = useState(null);
    const [error, setError] = useState(null);
    const { data, isLoading } = useQuery({ queryKey: ['sales-targets', fy], queryFn: () => targetsApi.list(fy) });
    const year = data?.fy;
    const startMonth = data?.start_month || 4;
    const quarterLabel = (q) => {
        const first = (startMonth - 1 + (q - 1) * 3) % 12;
        return `Q${q} · ${MONTHS[first]}–${MONTHS[(first + 2) % 12]}`;
    };
    const save = async (userId, quarter, amount) => {
        setError(null);
        try {
            await targetsApi.set({ user_id: userId, fy: year, quarter, amount });
            qc.invalidateQueries({ queryKey: ['sales-targets'] });
            qc.invalidateQueries({ queryKey: ['sales-report'] });
        } catch (e) {
            setError(e?.response?.data?.detail || 'Could not save the target');
            throw e;
        }
    };
    const totals = [0, 1, 2, 3].map(i => (data?.users || []).reduce((s, u) => s + (u.quarters[i] || 0), 0));

    return (
        <div className="space-y-6">
            <PageHeader title="Revenue targets" subtitle="Quarterly targets per person. Managers set targets for their team; admins and L1 for anyone.">
                <div className="flex items-center gap-1">
                    <button onClick={() => setFy((fy || year) - 1)} className="p-2 rounded-lg hover:bg-white text-slate-500" aria-label="Previous year"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-sm font-semibold text-slate-800 min-w-[90px] text-center">{data?.label || '…'}</span>
                    <button onClick={() => setFy((fy || year) + 1)} className="p-2 rounded-lg hover:bg-white text-slate-500" aria-label="Next year"><ChevronRight className="w-4 h-4" /></button>
                </div>
            </PageHeader>
            <ErrorNote message={error} />
            <div className={`${card} overflow-x-auto`} style={cardShadow}>
                {isLoading ? <p className="p-6 text-sm text-slate-400">Loading…</p> : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                                <th className="px-4 py-3 font-semibold">Person</th>
                                {[1, 2, 3, 4].map(q => <th key={q} className="px-2 py-3 font-semibold text-right w-40">{quarterLabel(q)}</th>)}
                                <th className="px-4 py-3 font-semibold text-right">Year</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(data?.users || []).map(u => (
                                <tr key={u.user_id}>
                                    <td className="px-4 py-2">
                                        <span className="font-medium text-slate-800">{u.name}</span>
                                        {u.sales_level && <span className="ml-2 text-[11px] font-semibold text-slate-400">L{u.sales_level}</span>}
                                    </td>
                                    {[0, 1, 2, 3].map(i => (
                                        <td key={i} className="px-2 py-2 text-right">
                                            <TargetCell value={u.quarters[i]} editable={u.can_edit} onSave={(v) => save(u.user_id, i + 1, v)} />
                                        </td>
                                    ))}
                                    <td className="px-4 py-2 text-right font-semibold tabular-nums">{u.total == null ? '—' : money(u.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t border-slate-200 font-semibold">
                                <td className="px-4 py-3 text-slate-500">Everyone shown</td>
                                {totals.map((t, i) => <td key={i} className="px-2 py-3 text-right tabular-nums">{money(t)}</td>)}
                                <td className="px-4 py-3 text-right tabular-nums">{money(totals.reduce((a, b) => a + b, 0))}</td>
                            </tr>
                        </tfoot>
                    </table>
                )}
            </div>
            <p className="text-xs text-slate-400">Totals add up individual targets; a manager's own target is separate from their team's.</p>
        </div>
    );
}
