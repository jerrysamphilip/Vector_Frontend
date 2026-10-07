import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye, FileText, Search } from 'lucide-react';
import { templatesApi } from '../api/sales';
import { PageHeader, card, cardShadow, selectSm, Empty } from '../components/sales/shared';
import { Modal, Field, inputClass, PrimaryButton, SecondaryButton, ErrorNote, relativeDate } from '../components/contacts/shared';

const errText = (e) => {
    const d = e?.response?.data?.detail;
    return typeof d === 'string' ? d : 'Something went wrong';
};

function TemplateModal({ template, categories, mergeFields, onClose }) {
    const qc = useQueryClient();
    const [form, setForm] = useState(template || { name: '', category: '', subject: '', body: '', shared: true });
    const [focus, setFocus] = useState('body');
    const subjectRef = useRef(null);
    const bodyRef = useRef(null);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const insert = (token) => {
        const el = focus === 'subject' ? subjectRef.current : bodyRef.current;
        const value = form[focus] || '';
        const start = el?.selectionStart ?? value.length;
        const end = el?.selectionEnd ?? value.length;
        set(focus, value.slice(0, start) + token + value.slice(end));
        requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + token.length, start + token.length); });
    };
    const save = useMutation({
        mutationFn: () => (template ? templatesApi.update(template.template_id, form) : templatesApi.create(form)),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['template-library'] }); onClose(); },
    });
    return (
        <Modal title={template ? 'Edit template' : 'New template'} onClose={onClose} width="max-w-3xl"
            footer={<>
                <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
                <PrimaryButton onClick={() => save.mutate()} loading={save.isPending} className="flex-1">Save template</PrimaryButton>
            </>}>
            <div className="space-y-3">
                <ErrorNote message={save.error && errText(save.error)} />
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Name"><input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} /></Field>
                    <Field label="Category">
                        <input className={inputClass} list="template-categories" value={form.category || ''} placeholder="e.g. Follow-up"
                            onChange={e => set('category', e.target.value)} />
                        <datalist id="template-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
                    </Field>
                </div>
                <Field label="Subject">
                    <input ref={subjectRef} className={inputClass} value={form.subject} onFocus={() => setFocus('subject')} onChange={e => set('subject', e.target.value)} />
                </Field>
                <Field label="Body">
                    <textarea ref={bodyRef} rows={10} className={`${inputClass} h-auto py-2 font-mono text-[13px]`} value={form.body}
                        onFocus={() => setFocus('body')} onChange={e => set('body', e.target.value)} />
                </Field>
                <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Insert a merge field into the {focus}</p>
                    <div className="flex flex-wrap gap-1.5">
                        {mergeFields.map(f => (
                            <button type="button" key={f.token} onClick={() => insert(f.token)}
                                className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100">{f.label}</button>
                        ))}
                    </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" className="accent-indigo-600" checked={form.shared} onChange={e => set('shared', e.target.checked)} />
                    Share with everyone in the workspace
                </label>
            </div>
        </Modal>
    );
}

function PreviewModal({ template, onClose }) {
    const { data, isLoading } = useQuery({ queryKey: ['template-preview', template.template_id], queryFn: () => templatesApi.render(template.template_id) });
    return (
        <Modal title={template.name} subtitle="Preview with sample contact values" onClose={onClose} width="max-w-2xl">
            {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : (
                <div className="space-y-3">
                    <p className="text-sm"><span className="text-slate-400">Subject: </span><span className="font-medium text-slate-800">{data?.subject}</span></p>
                    <div className="p-4 rounded-xl bg-slate-50 text-sm text-slate-700 whitespace-pre-wrap">{data?.body}</div>
                </div>
            )}
        </Modal>
    );
}

export default function TemplateLibrary() {
    const qc = useQueryClient();
    const [q, setQ] = useState('');
    const [category, setCategory] = useState('');
    const [editing, setEditing] = useState(null);
    const [preview, setPreview] = useState(null);
    const { data, isLoading } = useQuery({ queryKey: ['template-library', q, category], queryFn: () => templatesApi.list({ q, category }) });
    const remove = useMutation({ mutationFn: (t) => templatesApi.remove(t.template_id), onSuccess: () => qc.invalidateQueries({ queryKey: ['template-library'] }) });
    const items = data?.items || [];
    return (
        <div className="space-y-6">
            <PageHeader title="Email templates" subtitle="Reusable messages with merge fields. Use them from the inbox reply box.">
                <PrimaryButton onClick={() => setEditing({})}><Plus className="w-4 h-4" /> New template</PrimaryButton>
            </PageHeader>
            <div className="flex gap-2 flex-wrap">
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search templates" className={`${selectSm} pl-8 w-64`} />
                </div>
                <select className={selectSm} value={category} onChange={e => setCategory(e.target.value)} aria-label="Category">
                    <option value="">All categories</option>
                    {(data?.categories || []).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div className={card} style={cardShadow}>
                {isLoading ? <p className="p-6 text-sm text-slate-400">Loading…</p> : !items.length ? (
                    <Empty icon={FileText} title="No templates yet" text="Create one to reuse it in replies." />
                ) : (
                    <table className="w-full text-sm">
                        <thead><tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                            <th className="px-4 py-3 font-semibold">Template</th><th className="font-semibold">Category</th>
                            <th className="font-semibold">Owner</th><th className="font-semibold text-right">Used</th>
                            <th className="font-semibold">Updated</th><th /></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {items.map(t => (
                                <tr key={t.template_id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-slate-800">{t.name}{!t.shared && <span className="ml-2 text-[11px] text-slate-400">private</span>}</p>
                                        <p className="text-xs text-slate-500 truncate max-w-md">{t.subject}</p>
                                    </td>
                                    <td>{t.category || '—'}</td>
                                    <td>{t.owner_name || '—'}</td>
                                    <td className="text-right tabular-nums">{t.usage_count || 0}</td>
                                    <td className="text-slate-500">{relativeDate(t.updated_at)}</td>
                                    <td className="px-3 text-right whitespace-nowrap">
                                        <button onClick={() => setPreview(t)} className="p-1.5 text-slate-400 hover:text-slate-700" aria-label="Preview"><Eye className="w-4 h-4" /></button>
                                        {t.can_edit && <>
                                            <button onClick={() => setEditing(t)} className="p-1.5 text-slate-400 hover:text-slate-700" aria-label="Edit"><Pencil className="w-4 h-4" /></button>
                                            <button onClick={() => window.confirm(`Delete "${t.name}"?`) && remove.mutate(t)} className="p-1.5 text-slate-400 hover:text-red-600" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                                        </>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            {editing && <TemplateModal template={editing.template_id ? editing : null} categories={data?.categories || []}
                mergeFields={data?.merge_fields || []} onClose={() => setEditing(null)} />}
            {preview && <PreviewModal template={preview} onClose={() => setPreview(null)} />}
        </div>
    );
}
