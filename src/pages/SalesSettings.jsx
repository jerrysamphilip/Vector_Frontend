import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, Zap } from 'lucide-react';
import { settingsApi, workflowApi, productsApi, money } from '../api/sales';
import { PageHeader, card, cardShadow, useTeamOwners, Seg } from '../components/sales/shared';
import { Modal, Field, inputClass, PrimaryButton, SecondaryButton, ErrorNote } from '../components/contacts/shared';

const errText = (e) => {
    const d = e?.response?.data?.detail;
    return typeof d === 'string' ? d : d?.message || 'Something went wrong';
};

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

/** Editable list of short strings (reasons). */
function ListEditor({ value = [], onChange, placeholder }) {
    const [draft, setDraft] = useState('');
    const add = () => {
        const v = draft.trim();
        if (v && !value.includes(v)) onChange([...value, v]);
        setDraft('');
    };
    return (
        <div>
            <div className="flex flex-wrap gap-1.5 mb-2">
                {value.map(r => (
                    <span key={r} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-slate-100 text-xs text-slate-700">
                        {r}
                        <button type="button" onClick={() => onChange(value.filter(x => x !== r))} aria-label={`Remove ${r}`}
                            className="text-slate-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2">
                <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={placeholder} className={inputClass}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
                <SecondaryButton type="button" onClick={add}>Add</SecondaryButton>
            </div>
        </div>
    );
}

function GeneralSettings({ settings, owners }) {
    const qc = useQueryClient();
    const [form, setForm] = useState(settings);
    const [saved, setSaved] = useState(false);
    useEffect(() => setForm(settings), [settings]);
    const save = useMutation({
        mutationFn: () => settingsApi.save({
            lead_assignment: { mode: form.lead_assignment.mode, users: form.lead_assignment.users, regions: form.lead_assignment.regions },
            disqualify_reasons: form.disqualify_reasons, default_recycle_days: Number(form.default_recycle_days),
            win_reasons: form.win_reasons, loss_reasons: form.loss_reasons, require_close_reason: form.require_close_reason,
            stale_deal_days: Number(form.stale_deal_days),
            amount_hidden_roles: form.amount_hidden_roles, amount_hidden_levels: form.amount_hidden_levels,
        }),
        onSuccess: () => {
            setSaved(true); setTimeout(() => setSaved(false), 2500);
            qc.invalidateQueries({ queryKey: ['sales-settings'] });
            qc.invalidateQueries({ queryKey: ['leads-meta'] });
        },
    });
    const la = form.lead_assignment;
    const setLa = (patch) => setForm(f => ({ ...f, lead_assignment: { ...f.lead_assignment, ...patch } }));
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const toggle = (k, v) => set(k, form[k].includes(v) ? form[k].filter(x => x !== v) : [...form[k], v]);
    const name = (id) => owners.find(o => o.user_id === id)?.name || 'Unknown user';

    return (
        <>
            <Section title="Lead assignment" subtitle="How new leads without an owner are assigned (from campaign replies, imports and forms).">
                <div className="space-y-4">
                    <Seg value={la.mode} onChange={mode => setLa({ mode })}
                        options={[['off', 'Off (creator owns it)'], ['round_robin', 'Round robin'], ['region', 'By region']]} />
                    {la.mode !== 'off' && (
                        <Field label={la.mode === 'region' ? 'Round-robin pool (used when no region matches)' : 'Round-robin pool'}>
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5 py-1">
                                {owners.map(o => (
                                    <label key={o.user_id} className="flex items-center gap-1.5 text-sm text-slate-700">
                                        <input type="checkbox" className="accent-indigo-600" checked={la.users.includes(o.user_id)}
                                            onChange={() => setLa({ users: la.users.includes(o.user_id) ? la.users.filter(x => x !== o.user_id) : [...la.users, o.user_id] })} />
                                        {o.name}
                                    </label>
                                ))}
                            </div>
                        </Field>
                    )}
                    {la.mode === 'region' && (
                        <Field label="Region rules (first match wins)">
                            <div className="space-y-2">
                                {la.regions.map((r, i) => (
                                    <div key={i} className="grid grid-cols-[110px_1fr_1fr_auto] gap-2">
                                        <select className={inputClass} value={r.field} onChange={e => setLa({ regions: la.regions.map((x, j) => j === i ? { ...x, field: e.target.value } : x) })}>
                                            <option value="country">Country</option><option value="state">State</option>
                                        </select>
                                        <input className={inputClass} value={r.value} placeholder="e.g. India"
                                            onChange={e => setLa({ regions: la.regions.map((x, j) => j === i ? { ...x, value: e.target.value } : x) })} />
                                        <select className={inputClass} value={r.user_id} onChange={e => setLa({ regions: la.regions.map((x, j) => j === i ? { ...x, user_id: e.target.value } : x) })}>
                                            {owners.map(o => <option key={o.user_id} value={o.user_id}>{o.name}</option>)}
                                        </select>
                                        <button type="button" onClick={() => setLa({ regions: la.regions.filter((_, j) => j !== i) })}
                                            className="px-2 text-slate-400 hover:text-red-600" aria-label="Remove rule"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => setLa({ regions: [...la.regions, { field: 'country', value: '', user_id: owners[0]?.user_id }] })}
                                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Plus className="w-4 h-4" /> Add region rule</button>
                            </div>
                        </Field>
                    )}
                    {la.mode === 'round_robin' && la.users.length > 0 && (
                        <p className="text-xs text-slate-500">Next lead goes to {name(la.users[(la.next_index || 0) % la.users.length])}.</p>
                    )}
                </div>
            </Section>

            <Section title="Disqualifying leads" subtitle="Reasons offered when a lead is disqualified, and when it comes back for another try.">
                <div className="grid md:grid-cols-[1fr_220px] gap-5">
                    <Field label="Reasons"><ListEditor value={form.disqualify_reasons} onChange={v => set('disqualify_reasons', v)} placeholder="Add a reason" /></Field>
                    <Field label="Recycle after (days)" hint="Default offered when disqualifying; the lead reopens then.">
                        <input type="number" min="1" className={inputClass} value={form.default_recycle_days} onChange={e => set('default_recycle_days', e.target.value)} />
                    </Field>
                </div>
            </Section>

            <Section title="Closing deals" subtitle="Win and loss reasons, and when an open deal counts as stale.">
                <div className="grid md:grid-cols-2 gap-5">
                    <Field label="Win reasons"><ListEditor value={form.win_reasons} onChange={v => set('win_reasons', v)} placeholder="Add a win reason" /></Field>
                    <Field label="Loss reasons"><ListEditor value={form.loss_reasons} onChange={v => set('loss_reasons', v)} placeholder="Add a loss reason" /></Field>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" className="accent-indigo-600" checked={form.require_close_reason} onChange={e => set('require_close_reason', e.target.checked)} />
                        Require a reason to mark a deal won or lost
                    </label>
                    <Field label="Stale after (days without activity)" hint="Owners and their managers get an alert; the deal shows a stale badge.">
                        <input type="number" min="1" className={inputClass} value={form.stale_deal_days} onChange={e => set('stale_deal_days', e.target.value)} />
                    </Field>
                </div>
            </Section>

            <Section title="Who can see amounts" subtitle="Hidden roles and levels see deals and reports without any money values. Admins always see them.">
                <div className="grid md:grid-cols-2 gap-5">
                    <Field label="Hide from roles">
                        <div className="flex gap-4 py-1">
                            {[['MANAGER', 'Managers'], ['AGENT', 'Users']].map(([v, l]) => (
                                <label key={v} className="flex items-center gap-1.5 text-sm text-slate-700">
                                    <input type="checkbox" className="accent-indigo-600" checked={form.amount_hidden_roles.includes(v)} onChange={() => toggle('amount_hidden_roles', v)} /> {l}
                                </label>
                            ))}
                        </div>
                    </Field>
                    <Field label="Hide from sales levels">
                        <div className="flex gap-4 py-1">
                            {[1, 2, 3, 4].map(v => (
                                <label key={v} className="flex items-center gap-1.5 text-sm text-slate-700">
                                    <input type="checkbox" className="accent-indigo-600" checked={form.amount_hidden_levels.includes(v)} onChange={() => toggle('amount_hidden_levels', v)} /> L{v}
                                </label>
                            ))}
                        </div>
                    </Field>
                </div>
            </Section>

            <div className="flex items-center gap-3">
                <PrimaryButton onClick={() => save.mutate()} loading={save.isPending}>Save settings</PrimaryButton>
                {saved && <span className="text-sm text-emerald-600">Saved</span>}
                {save.error && <ErrorNote message={errText(save.error)} />}
            </div>
        </>
    );
}

// ── Workflow rules ─────────────────────────────────────────

const ACTION_LABEL = { create_task: 'Create a task', notify: 'Send an alert', update_field: 'Set a field' };

function describeRule(rule, meta) {
    const field = meta?.watch_fields?.[rule.object_type]?.[rule.field] || rule.field;
    const obj = { LEAD: 'lead', DEAL: 'deal', CONTACT: 'contact' }[rule.object_type];
    const when = rule.field === 'created' ? `When a ${obj} is created`
        : `When a ${obj}'s ${field.toLowerCase()} ${meta?.operators?.[rule.operator] || rule.operator}${rule.operator !== 'changes' ? ` "${rule.value}"` : ''}`;
    return `${when} → ${rule.actions.map(a => ACTION_LABEL[a.type]).join(', ')}`;
}

function RuleModal({ rule, meta, owners, onClose }) {
    const qc = useQueryClient();
    const [form, setForm] = useState(rule || {
        name: '', object_type: 'DEAL', field: 'stage_id', operator: 'equals', value: '', active: true,
        actions: [{ type: 'create_task', title: 'Follow up on {name}', due_in_days: 2, assign_to: 'owner' }],
    });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const setAction = (i, patch) => set('actions', form.actions.map((a, j) => (j === i ? { ...a, ...patch } : a)));
    const save = useMutation({
        mutationFn: () => (rule ? workflowApi.update(rule.rule_id, form) : workflowApi.create(form)),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflow-rules'] }); onClose(); },
    });
    const watch = meta.watch_fields[form.object_type];
    const settable = meta.settable_fields[form.object_type];
    const people = [['owner', "Record's owner"], ['manager', "Owner's manager"], ['actor', 'Whoever made the change'],
        ...owners.map(o => [o.user_id, o.name])];

    return (
        <Modal title={rule ? 'Edit rule' : 'New workflow rule'} onClose={onClose} width="max-w-2xl"
            footer={<>
                <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
                <PrimaryButton onClick={() => save.mutate()} loading={save.isPending} className="flex-1">Save rule</PrimaryButton>
            </>}>
            <div className="space-y-4">
                <ErrorNote message={save.error && errText(save.error)} />
                <Field label="Name"><input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Proposal sent → follow-up task" /></Field>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Field label="Object">
                        <select className={inputClass} value={form.object_type}
                            onChange={e => setForm(f => ({ ...f, object_type: e.target.value, field: 'created', actions: f.actions.filter(a => a.type !== 'update_field') }))}>
                            <option value="LEAD">Lead</option><option value="DEAL">Deal</option><option value="CONTACT">Contact</option>
                        </select>
                    </Field>
                    <Field label="When">
                        <select className={inputClass} value={form.field} onChange={e => set('field', e.target.value)}>
                            {Object.entries(watch).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                    </Field>
                    {form.field !== 'created' && (
                        <Field label="Condition">
                            <select className={inputClass} value={form.operator} onChange={e => set('operator', e.target.value)}>
                                {Object.entries(meta.operators).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                            </select>
                        </Field>
                    )}
                    {form.field !== 'created' && form.operator !== 'changes' && (
                        <Field label="Value" hint={form.field === 'stage_id' ? 'Stage name' : undefined}>
                            <input className={inputClass} value={form.value || ''} onChange={e => set('value', e.target.value)} />
                        </Field>
                    )}
                </div>
                <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Then</p>
                    {form.actions.map((a, i) => (
                        <div key={i} className="p-3 rounded-xl border border-slate-200 space-y-3">
                            <div className="flex gap-2">
                                <select className={inputClass} value={a.type} onChange={e => setAction(i, { type: e.target.value })}>
                                    {meta.action_types.map(t => <option key={t} value={t}>{ACTION_LABEL[t]}</option>)}
                                </select>
                                <button type="button" onClick={() => set('actions', form.actions.filter((_, j) => j !== i))}
                                    className="px-2 text-slate-400 hover:text-red-600" aria-label="Remove action"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            {a.type === 'create_task' && (
                                <div className="grid grid-cols-[1fr_100px_1fr] gap-2">
                                    <input className={inputClass} value={a.title || ''} placeholder="Task title ({name} = record name)" onChange={e => setAction(i, { title: e.target.value })} />
                                    <input type="number" min="0" className={inputClass} value={a.due_in_days ?? 1} title="Due in days" onChange={e => setAction(i, { due_in_days: Number(e.target.value) })} />
                                    <select className={inputClass} value={a.assign_to || 'owner'} onChange={e => setAction(i, { assign_to: e.target.value })}>
                                        {people.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                </div>
                            )}
                            {a.type === 'notify' && (
                                <div className="space-y-2">
                                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                                        {people.slice(0, 3).map(([v, l]) => (
                                            <label key={v} className="flex items-center gap-1.5 text-sm text-slate-700">
                                                <input type="checkbox" className="accent-indigo-600" checked={(a.to || []).includes(v)}
                                                    onChange={() => setAction(i, { to: (a.to || []).includes(v) ? a.to.filter(x => x !== v) : [...(a.to || []), v] })} /> {l}
                                            </label>
                                        ))}
                                    </div>
                                    <input className={inputClass} value={a.message || ''} placeholder="Message ({name} = record name)" onChange={e => setAction(i, { message: e.target.value })} />
                                </div>
                            )}
                            {a.type === 'update_field' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <select className={inputClass} value={a.field || ''} onChange={e => setAction(i, { field: e.target.value })}>
                                        <option value="">Choose a field…</option>
                                        {Object.entries(settable).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                    </select>
                                    <input className={inputClass} value={a.value || ''} placeholder="New value" onChange={e => setAction(i, { value: e.target.value })} />
                                </div>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={() => set('actions', [...form.actions, { type: 'notify', to: ['owner'], message: '' }])}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Plus className="w-4 h-4" /> Add action</button>
                </div>
            </div>
        </Modal>
    );
}

function WorkflowRules({ owners }) {
    const qc = useQueryClient();
    const { data: meta } = useQuery({ queryKey: ['workflow-meta'], queryFn: workflowApi.meta, staleTime: 300000 });
    const { data: rules = [] } = useQuery({ queryKey: ['workflow-rules'], queryFn: workflowApi.list });
    const [editing, setEditing] = useState(null);
    const refresh = () => qc.invalidateQueries({ queryKey: ['workflow-rules'] });
    const toggle = useMutation({ mutationFn: (r) => workflowApi.update(r.rule_id, { active: !r.active }), onSuccess: refresh });
    const remove = useMutation({ mutationFn: (r) => workflowApi.remove(r.rule_id), onSuccess: refresh });
    return (
        <Section title="Workflow rules" subtitle="When a field changes, create a task, send an alert or set another field."
            action={<SecondaryButton onClick={() => setEditing({})}><Plus className="w-4 h-4" /> New rule</SecondaryButton>}>
            {!rules.length && <p className="text-sm text-slate-400 py-4 text-center">No rules yet.</p>}
            <div className="divide-y divide-slate-100">
                {rules.map(r => (
                    <div key={r.rule_id} className="py-3 flex items-center gap-3">
                        <Zap className={`w-4 h-4 shrink-0 ${r.active ? 'text-amber-500' : 'text-slate-300'}`} />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800">{r.name}</p>
                            <p className="text-xs text-slate-500 truncate">{meta ? describeRule(r, meta) : ''}</p>
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap">Ran {r.run_count || 0}×</span>
                        <label className="flex items-center gap-1.5 text-xs text-slate-600">
                            <input type="checkbox" className="accent-indigo-600" checked={r.active} onChange={() => toggle.mutate(r)} /> Active
                        </label>
                        <button onClick={() => setEditing(r)} className="p-1.5 text-slate-400 hover:text-slate-700" aria-label="Edit"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => window.confirm(`Delete rule "${r.name}"?`) && remove.mutate(r)} className="p-1.5 text-slate-400 hover:text-red-600" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                ))}
            </div>
            {editing && meta && <RuleModal rule={editing.rule_id ? editing : null} meta={meta} owners={owners} onClose={() => setEditing(null)} />}
        </Section>
    );
}

// ── Products ───────────────────────────────────────────────

function ProductModal({ product, onClose }) {
    const qc = useQueryClient();
    const [form, setForm] = useState(product || { name: '', sku: '', unit: '', unit_price: '', description: '', active: true });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const save = useMutation({
        mutationFn: () => (product ? productsApi.update(product.product_id, form) : productsApi.create(form)),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); onClose(); },
    });
    return (
        <Modal title={product ? 'Edit product' : 'New product'} onClose={onClose}
            footer={<>
                <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
                <PrimaryButton onClick={() => save.mutate()} loading={save.isPending} className="flex-1">Save</PrimaryButton>
            </>}>
            <div className="space-y-3">
                <ErrorNote message={save.error && errText(save.error)} />
                <Field label="Name"><input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} /></Field>
                <div className="grid grid-cols-3 gap-3">
                    <Field label="SKU"><input className={inputClass} value={form.sku || ''} onChange={e => set('sku', e.target.value)} /></Field>
                    <Field label="Unit price"><input type="number" step="0.01" className={inputClass} value={form.unit_price ?? ''} onChange={e => set('unit_price', e.target.value)} /></Field>
                    <Field label="Unit"><input className={inputClass} value={form.unit || ''} placeholder="seat / month" onChange={e => set('unit', e.target.value)} /></Field>
                </div>
                <Field label="Description"><textarea rows={3} className={`${inputClass} h-auto py-2`} value={form.description || ''} onChange={e => set('description', e.target.value)} /></Field>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" className="accent-indigo-600" checked={form.active} onChange={e => set('active', e.target.checked)} /> Available on new quotes
                </label>
            </div>
        </Modal>
    );
}

function Products() {
    const { data: products = [] } = useQuery({ queryKey: ['products', 'all'], queryFn: () => productsApi.list(true) });
    const [editing, setEditing] = useState(null);
    return (
        <Section title="Products and price list" subtitle="Used for quote lines on proposals."
            action={<SecondaryButton onClick={() => setEditing({})}><Plus className="w-4 h-4" /> New product</SecondaryButton>}>
            {!products.length ? <p className="text-sm text-slate-400 py-4 text-center">No products yet.</p> : (
                <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                        <th className="py-2 font-semibold">Product</th><th className="font-semibold">SKU</th>
                        <th className="font-semibold text-right pr-6">Price</th><th className="font-semibold">Unit</th><th /></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {products.map(p => (
                            <tr key={p.product_id} className={p.active ? '' : 'text-slate-400'}>
                                <td className="py-2.5"><span className="font-medium">{p.name}</span>{!p.active && <span className="ml-2 text-xs">(inactive)</span>}</td>
                                <td>{p.sku || '—'}</td>
                                <td className="text-right tabular-nums pr-6">{money(p.unit_price)}</td>
                                <td className="text-slate-500">{p.unit ? `per ${p.unit}` : '—'}</td>
                                <td className="text-right"><button onClick={() => setEditing(p)} className="p-1.5 text-slate-400 hover:text-slate-700" aria-label="Edit"><Pencil className="w-4 h-4" /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {editing && <ProductModal product={editing.product_id ? editing : null} onClose={() => setEditing(null)} />}
        </Section>
    );
}

export default function SalesSettings() {
    const { data: settings, isLoading } = useQuery({ queryKey: ['sales-settings'], queryFn: settingsApi.get });
    const owners = useTeamOwners();
    if (isLoading || !settings) return <p className="text-sm text-slate-400">Loading…</p>;
    if (!settings.can_edit) {
        return <div className="space-y-6"><PageHeader title="Sales settings" /><p className="text-sm text-slate-500">Only admins can change sales settings.</p></div>;
    }
    return (
        <div className="space-y-6 max-w-5xl">
            <PageHeader title="Sales settings" subtitle="Lead routing, closing rules, amount visibility, automation and products." />
            <GeneralSettings settings={settings} owners={owners} />
            <WorkflowRules owners={owners} />
            <Products />
        </div>
    );
}
