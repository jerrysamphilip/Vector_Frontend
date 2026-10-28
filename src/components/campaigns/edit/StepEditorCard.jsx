import { ArrowDown, ArrowUp, Eye, Loader2, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import RichTextEditor from '../../common/RichTextEditor';
import { canDelete, newVersion } from './campaignEditModel';

const inputClass = 'w-full h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400 disabled:bg-slate-50';

/**
 * One step of the campaign editor (F-04 / F-05): wait days, stop flags and every persona version of the step
 * (who receives it, subject, body), with Regenerate (one version) and Preview. A step whose email already went
 * out can't be deleted; existing steps are never reordered, a new step can be moved.
 */
export default function StepEditorCard({
    step, index, total, onChange, onDelete, onMove, onInsertAfter, onRegenerate, regenerating, onPreview, editorRev,
    canAddStep,
}) {
    const number = index + 1;
    const set = (patch) => onChange({ ...step, ...patch });
    const setVersion = (vi, patch) => set({ versions: step.versions.map((v, i) => (i === vi ? { ...v, ...patch } : v)) });
    const removeVersion = (vi) => set({ versions: step.versions.filter((_, i) => i !== vi) });
    const isNew = !step.sequence_id;

    return (
        <section aria-label={`Step ${number}`} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <header className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center gap-3">
                <h3 className="text-sm font-bold text-slate-800">
                    Step {number}{number === 1 ? ' · Initial email' : ` · Follow-up ${number - 1}`}
                </h3>
                {isNew && <span className="text-xs rounded-md bg-blue-50 text-blue-700 px-2 py-0.5">New</span>}
                {step.sent > 0 && <span className="text-xs rounded-md bg-slate-100 text-slate-600 px-2 py-0.5">Sent to {step.sent}</span>}
                <div className="ml-auto flex items-center gap-1">
                    {isNew && (
                        <>
                            <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} aria-label={`Move step ${number} up`} className="p-1.5 rounded-md hover:bg-white disabled:opacity-40"><ArrowUp className="w-4 h-4" /></button>
                            <button type="button" onClick={() => onMove(index, 1)} disabled={index === total - 1} aria-label={`Move step ${number} down`} className="p-1.5 rounded-md hover:bg-white disabled:opacity-40"><ArrowDown className="w-4 h-4" /></button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={() => onDelete(index)}
                        disabled={!canDelete(step) || total <= 1}
                        title={canDelete(step) ? 'Delete this step' : 'This step was already sent, so it can\'t be deleted'}
                        aria-label={`Delete step ${number}`}
                        className="p-1.5 rounded-md text-rose-600 hover:bg-white disabled:opacity-40"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </header>

            <div className="p-5 space-y-4">
                <div className="flex flex-wrap items-end gap-4 text-xs font-semibold text-slate-600">
                    <label className="block">
                        {number === 1 ? 'Days before the first email' : 'Wait days after the previous step'}
                        <input type="number" min="0" max="30" value={step.wait_days} onChange={e => set({ wait_days: e.target.value === '' ? '' : Number(e.target.value) })} className={`${inputClass} mt-1 w-28`} />
                    </label>
                    <label className="inline-flex items-center gap-2 h-9">
                        <input type="checkbox" checked={step.stop_on_reply} onChange={e => set({ stop_on_reply: e.target.checked })} /> Stop on reply
                    </label>
                    <label className="inline-flex items-center gap-2 h-9">
                        <input type="checkbox" checked={step.stop_on_bounce} onChange={e => set({ stop_on_bounce: e.target.checked })} /> Stop on bounce
                    </label>
                </div>

                {step.versions.map((v, vi) => (
                    <div key={v.key} className="rounded-lg border border-slate-200 p-4 space-y-3" data-testid={`step-${number}-version`}>
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="text-xs font-semibold text-slate-600">
                                Persona
                                <input
                                    value={v.designation}
                                    onChange={e => setVersion(vi, { designation: e.target.value })}
                                    placeholder="All contacts (generic)"
                                    aria-label={`Step ${number} email ${vi + 1} persona`}
                                    className={`${inputClass} mt-1 w-56`}
                                />
                            </label>
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 mt-4">
                                <Users className="w-3.5 h-3.5" aria-hidden="true" />
                                {v.template_id ? (v.recipients === 1 ? '1 contact gets this version' : `${v.recipients} contacts get this version`) : 'New version'}
                            </span>
                            <div className="ml-auto flex items-center gap-2 mt-4">
                                {v.template_id && (
                                    <button type="button" onClick={() => onRegenerate(v)} disabled={Boolean(regenerating)} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50">
                                        {regenerating === v.template_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Regenerate
                                    </button>
                                )}
                                <button type="button" onClick={() => onPreview(index, v)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900">
                                    <Eye className="w-3.5 h-3.5" /> Preview
                                </button>
                                {!v.template_id && step.versions.length > 1 && (
                                    <button type="button" onClick={() => removeVersion(vi)} className="text-xs font-semibold text-rose-600">Remove</button>
                                )}
                            </div>
                        </div>
                        <label className="block text-xs font-semibold text-slate-600">
                            Subject
                            <input value={v.subject} maxLength={998} onChange={e => setVersion(vi, { subject: e.target.value })} aria-label={`Step ${number} email ${vi + 1} subject`} className={`${inputClass} mt-1`} />
                        </label>
                        <div className="text-xs font-semibold text-slate-600">
                            Body
                            <div className="mt-1 rounded-lg border border-slate-200">
                                <RichTextEditor
                                    key={`${v.key}-${editorRev}`}
                                    value={v.body}
                                    onChange={html => setVersion(vi, { body: html })}
                                    placeholder="Email body. Use {{first_name}}, {{company_name}}, {{signature_block}}..."
                                    minHeightClass="min-h-[10rem]"
                                />
                            </div>
                        </div>
                    </div>
                ))}

                <div className="flex flex-wrap items-center gap-4">
                    <button type="button" onClick={() => set({ versions: [...step.versions, newVersion('')] })} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700">
                        <Plus className="w-4 h-4" /> Add persona version
                    </button>
                    {step.unassigned > 0 && <span className="text-xs text-amber-700">{step.unassigned} contact(s) have no email for this step yet</span>}
                    {canAddStep && (
                        <button type="button" onClick={() => onInsertAfter(index)} className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900">
                            <Plus className="w-4 h-4" /> Add a step after this one
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}
