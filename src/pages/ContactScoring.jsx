import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, RefreshCw, Save, RotateCcw, Loader2 } from 'lucide-react';
import { scoringApi, GRADES, GRADE_TONES } from '../api/contactScoring';
import { errorMessage } from '../api/contacts';
import { PageHeader, card, cardShadow } from '../components/sales/shared';
import { ErrorNote, PrimaryButton, SecondaryButton, formatDateTime } from '../components/contacts/shared';

const cell = 'h-8 px-2 bg-white border border-slate-200 rounded-md text-sm text-slate-800 focus:outline-none focus:border-indigo-400';

function Section({ title, subtitle, children, action }) {
    return (
        <section className={`${card} p-5`} style={cardShadow}>
            <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

function NumberInput({ value, onChange, min, max, label, className = 'w-20' }) {
    return (
        <input type="number" aria-label={label} min={min} max={max} step={1} value={value ?? ''} className={`${cell} ${className}`}
            onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
    );
}

let draftSeq = 0;

/** Settings → Contact scoring (BR-CM-43): fit rules, engagement weights, decay, weights and grade thresholds. */
export default function ContactScoring() {
    const qc = useQueryClient();
    const { data, isLoading, error: loadError } = useQuery({ queryKey: ['scoring-model'], queryFn: scoringApi.model, retry: false });
    const [form, setForm] = useState(null);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);
    useEffect(() => { if (data?.model) setForm(structuredClone(data.model)); }, [data]);

    const operatorsFor = useMemo(() => {
        const ops = data?.operators || [];
        return (field) => {
            const kind = (data?.fields || []).find(f => f.key === field)?.kind;
            return ops.filter(o => (kind === 'number' ? o.number : o.text));
        };
    }, [data]);

    const save = useMutation({
        mutationFn: () => scoringApi.saveModel(form),
        onSuccess: res => { setError(null); setNotice('Saved. Every contact is being rescored with the new model.'); qc.setQueryData(['scoring-model'], res); qc.invalidateQueries({ queryKey: ['contacts'] }); },
        onError: err => { setNotice(null); setError(errorMessage(err)); },
    });
    const recompute = useMutation({
        mutationFn: scoringApi.recompute,
        onSuccess: res => { setError(null); setNotice(`Recalculating ${res.contacts.toLocaleString()} contact${res.contacts === 1 ? '' : 's'} in the background.`); qc.invalidateQueries({ queryKey: ['scoring-model'] }); qc.invalidateQueries({ queryKey: ['contacts'] }); },
        onError: err => { setNotice(null); setError(errorMessage(err)); },
    });

    if (isLoading) return <div className="py-32 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-indigo-500" /></div>;
    if (loadError) {
        return <div className="py-24 text-center"><p className="text-lg font-bold text-slate-800">Contact scoring</p><p className="text-sm text-slate-500 mt-1">{loadError?.response?.status === 403 ? 'Only workspace admins can change the scoring model.' : errorMessage(loadError)}</p></div>;
    }
    if (!form) return null;

    const setRule = (i, changes) => setForm(f => ({ ...f, fit_rules: f.fit_rules.map((r, j) => (j === i ? { ...r, ...changes } : r)) }));
    const addRule = () => setForm(f => ({ ...f, fit_rules: [...f.fit_rules, { id: `new${++draftSeq}`, label: '', field: 'designation', operator: 'contains_any', value: '', points: 10 }] }));
    const removeRule = (i) => setForm(f => ({ ...f, fit_rules: f.fit_rules.filter((_, j) => j !== i) }));
    const setSignal = (key, changes) => setForm(f => ({ ...f, engagement: { ...f.engagement, [key]: { ...f.engagement[key], ...changes } } }));
    const stats = data.stats || {};
    const maxRules = data.limits?.max_rules || 50;

    return (
        <div className="w-full space-y-5 max-w-5xl" data-testid="scoring-settings">
            <PageHeader title="Contact scoring" subtitle="Score contacts 0-100 on fit and engagement with transparent rules. Grades A-D follow the thresholds below.">
                <SecondaryButton onClick={() => recompute.mutate()} disabled={recompute.isPending} data-testid="scoring-recompute">
                    {recompute.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Recompute now
                </SecondaryButton>
                <PrimaryButton onClick={() => save.mutate()} loading={save.isPending} data-testid="scoring-save"><Save className="w-4 h-4" /> Save model</PrimaryButton>
            </PageHeader>

            {notice && <div className="px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-800" data-testid="scoring-notice">{notice}</div>}
            <ErrorNote message={error} />

            <div className={`${card} p-4 flex flex-wrap items-center gap-5 text-sm`} style={cardShadow}>
                <span className="text-slate-600"><b className="text-slate-900">{(stats.scored || 0).toLocaleString()}</b> of {(stats.contacts || 0).toLocaleString()} contacts scored</span>
                <span className="flex items-center gap-2">
                    {GRADES.map(g => <span key={g} className={`px-2 py-0.5 rounded-md border text-xs font-semibold ${GRADE_TONES[g]}`}>{g}: {(stats.grades?.[g] || 0).toLocaleString()}</span>)}
                </span>
                <span className="text-slate-500 text-xs ml-auto">
                    {data.recompute_requested_at ? 'Recalculation queued…' : data.last_recomputed_at ? `Last full recalculation ${formatDateTime(data.last_recomputed_at)}` : 'Scores refresh automatically every day.'}
                </span>
            </div>

            <Section title="Fit rules" subtitle="Points for who the contact is. Matching rules add up; fit is capped at 0-100. Lists are comma-separated; text matching ignores case."
                action={<SecondaryButton onClick={addRule} disabled={form.fit_rules.length >= maxRules} data-testid="scoring-add-rule"><Plus className="w-4 h-4" /> Add rule</SecondaryButton>}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                <th className="py-2 pr-2">Label</th><th className="py-2 pr-2">Property</th><th className="py-2 pr-2">Condition</th>
                                <th className="py-2 pr-2">Value</th><th className="py-2 pr-2">Points</th><th />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {form.fit_rules.map((r, i) => {
                                const ops = operatorsFor(r.field);
                                const op = (data.operators || []).find(o => o.key === r.operator);
                                return (
                                    <tr key={r.id || i} data-testid="scoring-rule-row">
                                        <td className="py-1.5 pr-2"><input className={`${cell} w-44`} value={r.label} maxLength={100} placeholder="Label" aria-label="Rule label" onChange={e => setRule(i, { label: e.target.value })} /></td>
                                        <td className="py-1.5 pr-2">
                                            <select className={`${cell} w-48`} value={r.field} aria-label="Rule property"
                                                onChange={e => { const field = e.target.value; const allowed = operatorsFor(field).map(o => o.key); setRule(i, { field, operator: allowed.includes(r.operator) ? r.operator : allowed[0] }); }}>
                                                {(data.fields || []).map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                                            </select>
                                        </td>
                                        <td className="py-1.5 pr-2">
                                            <select className={`${cell} w-40`} value={r.operator} aria-label="Rule condition" onChange={e => setRule(i, { operator: e.target.value })}>
                                                {ops.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                                            </select>
                                        </td>
                                        <td className="py-1.5 pr-2">
                                            {op?.needs_value === false ? <span className="text-xs text-slate-400">—</span> : (
                                                <input className={`${cell} w-64`} value={r.value ?? ''} maxLength={500} aria-label="Rule value"
                                                    placeholder={r.operator === 'between' ? 'e.g. 50-199' : 'Value or comma-separated list'} onChange={e => setRule(i, { value: e.target.value })} />
                                            )}
                                        </td>
                                        <td className="py-1.5 pr-2"><NumberInput label="Rule points" value={r.points} min={-100} max={100} onChange={v => setRule(i, { points: v })} /></td>
                                        <td className="py-1.5 text-right">
                                            <button onClick={() => removeRule(i)} className="p-1.5 text-slate-400 hover:text-red-600" aria-label={`Delete rule ${r.label || i + 1}`} data-testid="scoring-delete-rule"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {form.fit_rules.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">No fit rules: fit is 0 for everyone.</p>}
                </div>
            </Section>

            <Section title="Engagement" subtitle="Points per email opened, link clicked, reply, meeting, call or completed task, each capped. Engagement is capped at 0-100.">
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
                    {(data.signals || []).map(s => (
                        <div key={s.key} className="flex items-center justify-between gap-3 text-sm" data-testid="scoring-signal-row">
                            <span className="text-slate-700">{s.label}</span>
                            <span className="flex items-center gap-2 text-xs text-slate-500">
                                <NumberInput label={`${s.label} points`} value={form.engagement[s.key]?.points} min={0} max={100} onChange={v => setSignal(s.key, { points: v })} /> each, up to
                                <NumberInput label={`${s.label} cap`} value={form.engagement[s.key]?.max} min={0} max={100} onChange={v => setSignal(s.key, { max: v })} />
                            </span>
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap gap-6 mt-4 text-sm text-slate-600">
                    <label className="flex items-center gap-2">Half-life <NumberInput label="Half-life days" value={form.half_life_days} min={0} max={365} onChange={v => setForm(f => ({ ...f, half_life_days: v }))} /> days <span className="text-xs text-slate-400">(0 = no decay)</span></label>
                    <label className="flex items-center gap-2">Look back <NumberInput label="Look-back days" value={form.lookback_days} min={1} max={730} onChange={v => setForm(f => ({ ...f, lookback_days: v }))} /> days</label>
                </div>
            </Section>

            <div className="grid md:grid-cols-2 gap-5">
                <Section title="Weights" subtitle="How much fit and engagement count towards the total. They add up to 100.">
                    <div className="flex items-center gap-3 text-sm text-slate-700">
                        <label className="flex items-center gap-2">Fit <NumberInput label="Fit weight" value={form.fit_weight} min={0} max={100}
                            onChange={v => setForm(f => ({ ...f, fit_weight: v, engagement_weight: v === '' ? f.engagement_weight : Math.max(0, Math.min(100, 100 - v)) }))} /> %</label>
                        <span className="text-slate-400">+</span>
                        <label className="flex items-center gap-2">Engagement <NumberInput label="Engagement weight" value={form.engagement_weight} min={0} max={100}
                            onChange={v => setForm(f => ({ ...f, engagement_weight: v, fit_weight: v === '' ? f.fit_weight : Math.max(0, Math.min(100, 100 - v)) }))} /> %</label>
                    </div>
                </Section>
                <Section title="Grades" subtitle="Minimum score for each grade; anything lower is D.">
                    <div className="flex items-center gap-4 text-sm">
                        {['A', 'B', 'C'].map(g => (
                            <label key={g} className="flex items-center gap-2">
                                <span className={`w-6 h-6 inline-flex items-center justify-center rounded-md border font-bold text-xs ${GRADE_TONES[g]}`}>{g}</span>
                                <NumberInput label={`Grade ${g} threshold`} value={form.grade_thresholds[g]} min={1} max={100}
                                    onChange={v => setForm(f => ({ ...f, grade_thresholds: { ...f.grade_thresholds, [g]: v } }))} />
                            </label>
                        ))}
                    </div>
                </Section>
            </div>

            <div className="flex justify-between">
                <SecondaryButton onClick={() => window.confirm('Replace the model with the default rules? Nothing is saved until you click Save model.') && setForm(structuredClone(data.defaults))} data-testid="scoring-reset">
                    <RotateCcw className="w-4 h-4" /> Restore defaults
                </SecondaryButton>
                <PrimaryButton onClick={() => save.mutate()} loading={save.isPending}><Save className="w-4 h-4" /> Save model</PrimaryButton>
            </div>
        </div>
    );
}
