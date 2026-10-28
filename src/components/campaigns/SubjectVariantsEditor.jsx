import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, Plus, Trash2, Save, X, Edit2, Trophy, AlertTriangle } from 'lucide-react';
import { subjectVariantsApi } from '../../api/subjectVariants';
import { useConfirm } from '../ui/ConfirmDialog';

// A/B subject-line variants of one sequence step (BR-SF-18). Each enrolled prospect's
// email for the step is assigned one variant when it is scheduled; sent emails never change.
const MAX_SUBJECT = 500;

const errorText = (error) => {
    const detail = error?.response?.data?.detail;
    if (Array.isArray(detail)) return detail.map((d) => d.msg).join('; ');
    return detail || error?.message || 'Request failed';
};

export default function SubjectVariantsEditor({ campaignId, step }) {
    const confirm = useConfirm();
    const queryClient = useQueryClient();
    const key = ['subject-variants', campaignId, step];
    const [newSubject, setNewSubject] = useState('');
    const [newWeight, setNewWeight] = useState('');
    const [editingLabel, setEditingLabel] = useState(null);
    const [editSubject, setEditSubject] = useState('');
    const [editWeight, setEditWeight] = useState('');
    const [message, setMessage] = useState(null); // {kind: 'error'|'warning'|'info', text}

    const { data, isLoading } = useQuery({
        queryKey: key,
        queryFn: () => subjectVariantsApi.list(campaignId, step),
        enabled: !!campaignId && !!step,
    });

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: key });
        queryClient.invalidateQueries({ queryKey: ['subject-variant-stats', campaignId, step] });
    };

    const createMutation = useMutation({
        mutationFn: () => subjectVariantsApi.create(campaignId, step, {
            subject: newSubject.trim(),
            weight: newWeight ? parseInt(newWeight, 10) : undefined,
        }),
        onSuccess: (res) => {
            setNewSubject('');
            setNewWeight('');
            setMessage(res?.warnings?.length ? { kind: 'warning', text: res.warnings.join(' ') } : null);
            refresh();
        },
        onError: (error) => setMessage({ kind: 'error', text: errorText(error) }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ label, payload }) => subjectVariantsApi.update(campaignId, step, label, payload),
        onSuccess: (res) => {
            setEditingLabel(null);
            setMessage(res?.warnings?.length ? { kind: 'warning', text: res.warnings.join(' ') } : null);
            refresh();
        },
        onError: (error) => setMessage({ kind: 'error', text: errorText(error) }),
    });

    const deleteMutation = useMutation({
        mutationFn: (label) => subjectVariantsApi.remove(campaignId, step, label),
        onSuccess: () => { setMessage(null); refresh(); },
        onError: (error) => setMessage({ kind: 'error', text: errorText(error) }),
    });

    if (isLoading) return null;
    const variants = data?.variants || [];
    const promoted = data?.promoted_label;
    const maxVariants = data?.max_variants || 4;
    const minVariants = data?.min_variants || 2;
    const locked = !!promoted;

    const startEdit = (v) => {
        setEditingLabel(v.label);
        setEditSubject(v.subject);
        setEditWeight(String(v.weight));
        setMessage(null);
    };

    const saveEdit = (v) => {
        const payload = {};
        if (editSubject.trim() !== v.subject) payload.subject = editSubject.trim();
        const w = parseInt(editWeight, 10);
        if (w && w !== v.weight) payload.weight = w;
        if (!Object.keys(payload).length) { setEditingLabel(null); return; }
        updateMutation.mutate({ label: v.label, payload });
    };

    const totalWeight = variants.reduce((sum, v) => sum + (v.weight || 1), 0) || 1;

    return (
        <div className="mt-3 rounded-lg border border-indigo-100 bg-white p-3" data-testid={`subject-variants-step-${step}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Subject A/B test</span>
                    {data?.ab_active && !locked && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">Running</span>
                    )}
                    {locked && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> Variant {promoted} promoted
                        </span>
                    )}
                </div>
                <span className="text-[11px] text-slate-400">
                    {variants.length}/{maxVariants} variants{variants.length > 0 && variants.length < minVariants ? ` · add ${minVariants - variants.length} more to start` : ''}
                </span>
            </div>

            {variants.length === 0 && (
                <p className="text-xs text-slate-400 mb-2">
                    No variants: every prospect gets the template subject. Add {minVariants}-{maxVariants} subjects to split this step's emails between them.
                </p>
            )}

            <ul className="space-y-1.5">
                {variants.map((v) => (
                    <li key={v.label} className="flex items-center gap-2 text-sm" data-testid={`variant-row-${v.label}`}>
                        <span className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-xs font-bold ${v.is_winner ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600'}`}>
                            {v.label}
                        </span>
                        {editingLabel === v.label ? (
                            <>
                                <input
                                    value={editSubject}
                                    maxLength={MAX_SUBJECT}
                                    onChange={(e) => setEditSubject(e.target.value)}
                                    className="flex-1 min-w-0 px-2 py-1 text-sm border border-slate-200 rounded"
                                    aria-label={`Subject of variant ${v.label}`}
                                />
                                <input
                                    type="number" min="1" max="100"
                                    value={editWeight}
                                    onChange={(e) => setEditWeight(e.target.value)}
                                    className="w-16 px-2 py-1 text-xs border border-slate-200 rounded"
                                    aria-label={`Weight of variant ${v.label}`}
                                />
                                <button onClick={() => saveEdit(v)} disabled={updateMutation.isPending}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Save">
                                    <Save className="w-4 h-4" />
                                </button>
                                <button onClick={() => setEditingLabel(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded" title="Cancel">
                                    <X className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <>
                                <span className="flex-1 min-w-0 truncate text-slate-800" title={v.subject}>{v.subject}</span>
                                <span className="text-[11px] text-slate-400 whitespace-nowrap" title="Share of this step's emails">
                                    {Math.round((v.weight / totalWeight) * 100)}%
                                </span>
                                {!locked && (
                                    <>
                                        <button onClick={() => startEdit(v)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded" title="Edit variant">
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={async () => { if (await confirm({ title: `Delete subject variant ${v.label}?`, confirmLabel: 'Delete', danger: true })) deleteMutation.mutate(v.label); }}
                                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete variant"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </li>
                ))}
            </ul>

            {!locked && variants.length < maxVariants && (
                <form
                    className="mt-2 flex items-center gap-2"
                    onSubmit={(e) => { e.preventDefault(); if (newSubject.trim()) createMutation.mutate(); }}
                >
                    <input
                        value={newSubject}
                        maxLength={MAX_SUBJECT}
                        onChange={(e) => setNewSubject(e.target.value)}
                        placeholder="New subject variant, e.g. Quick question, {{first_name}}"
                        className="flex-1 min-w-0 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        aria-label="New subject variant"
                    />
                    <input
                        type="number" min="1" max="100"
                        value={newWeight}
                        onChange={(e) => setNewWeight(e.target.value)}
                        placeholder="Weight"
                        title="Optional relative weight (1-100); equal split when empty"
                        className="w-20 px-2 py-1 text-xs border border-slate-200 rounded"
                        aria-label="Variant weight"
                    />
                    <button
                        type="submit"
                        disabled={!newSubject.trim() || createMutation.isPending}
                        className="text-xs px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg flex items-center gap-1 hover:bg-indigo-700 disabled:opacity-50"
                    >
                        <Plus className="w-3 h-3" /> {createMutation.isPending ? 'Adding...' : 'Add variant'}
                    </button>
                </form>
            )}

            {message && (
                <p className={`mt-2 text-xs flex items-start gap-1 ${message.kind === 'error' ? 'text-red-600' : 'text-amber-700'}`} role="alert">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> {message.text}
                </p>
            )}
        </div>
    );
}
