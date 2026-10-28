import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import DialogPanel from '../../common/DialogPanel';
import TimezonePicker from '../wizard/TimezonePicker';
import InboxSelector from './InboxSelector';
import { campaignApi } from '../../../api/campaigns';
import { errorMessage } from '../../../lib/apiErrors';
import { localISODate } from '../../../lib/dates';
import { duplicateFormError, duplicatePayload, initialDuplicateForm } from './duplicatePayload';

const inputClass = 'mt-1 w-full h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-400';

/**
 * Duplicate a campaign (POST /campaigns/{id}/duplicates): a new DRAFT with the same steps, templates,
 * subject variants, attachments and automation rules. The form overrides name, start date, send window,
 * timezone and inboxes, and can enrol a list (contacts already in the source are skipped by default).
 * Afterwards it shows what was copied, who was enrolled, and personas lacking templates.
 */
export default function DuplicateCampaignModal({ campaign: listed, onClose, onDuplicated, onOpenCopy }) {
    const titleId = `duplicate-title-${listed.campaign_id}`;
    // A list row lacks the settings the form starts from: load the full campaign
    const { data: full, isLoading, error: loadError } = useQuery({
        queryKey: ['campaign', listed.campaign_id],
        queryFn: () => campaignApi.get(listed.campaign_id),
        enabled: !listed.sending_inboxes,
    });
    const campaign = listed.sending_inboxes ? listed : full;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <DialogPanel onClose={onClose} labelledBy={titleId} className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
                <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                        <h2 id={titleId} className="text-lg font-bold text-slate-900">Duplicate “{listed.campaign_name}”</h2>
                        <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
                    </div>
                    {isLoading && !campaign && <p className="text-sm text-slate-500">Loading campaign...</p>}
                    {loadError && !campaign && <p role="alert" className="text-sm text-red-600">{errorMessage(loadError)}</p>}
                    {campaign && <DuplicateForm campaign={campaign} onClose={onClose} onDuplicated={onDuplicated} onOpenCopy={onOpenCopy} />}
                </div>
            </DialogPanel>
        </div>
    );
}

function DuplicateForm({ campaign, onClose, onDuplicated, onOpenCopy }) {
    const [form, setForm] = useState(() => initialDuplicateForm(campaign));
    const [formError, setFormError] = useState('');
    const set = (patch) => setForm(f => ({ ...f, ...patch }));
    const { data: lists = [] } = useQuery({ queryKey: ['prospect-lists'], queryFn: campaignApi.getProspectLists });

    const mutation = useMutation({
        mutationFn: () => campaignApi.duplicate(campaign.campaign_id, duplicatePayload(form, campaign)),
        onSuccess: (result) => onDuplicated?.(result),
        onError: (err) => setFormError(errorMessage(err)),
    });

    if (mutation.data) {
        return <DuplicateResult result={mutation.data} onClose={onClose} onOpenCopy={onOpenCopy} />;
    }

    const submit = (e) => {
        e.preventDefault();
        const problem = duplicateFormError(form, localISODate());
        if (problem) { setFormError(problem); return; }
        setFormError('');
        mutation.mutate();
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-slate-500">The copy is a draft with the same sequence, templates, subject variants, attachments and automation rules. Enrolled contacts and sent emails are not copied.</p>
            <label className="block text-sm font-medium text-slate-700">
                Name
                <input value={form.campaign_name} onChange={e => set({ campaign_name: e.target.value })} maxLength={255} data-autofocus className={inputClass} />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="block text-sm font-medium text-slate-700">
                    Start date
                    <input type="date" value={form.start_date} min={localISODate()} onChange={e => set({ start_date: e.target.value })} className={inputClass} />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                    Window start
                    <input type="time" value={form.send_window_start} onChange={e => set({ send_window_start: e.target.value })} className={inputClass} />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                    Window end
                    <input type="time" value={form.send_window_end} onChange={e => set({ send_window_end: e.target.value })} className={inputClass} />
                </label>
            </div>
            <div className="text-sm font-medium text-slate-700">
                Timezone
                <div className="mt-1"><TimezonePicker value={form.campaign_timezone} onChange={tz => set({ campaign_timezone: tz })} /></div>
            </div>
            <InboxSelector value={form.inbox_ids} onChange={ids => set({ inbox_ids: ids })} />
            <label className="block text-sm font-medium text-slate-700">
                Enrol a list (optional)
                <select value={form.list_id} onChange={e => set({ list_id: e.target.value })} className={inputClass}>
                    <option value="">No contacts for now</option>
                    {lists.map(l => <option key={l.list_id} value={l.list_id}>{l.list_name}</option>)}
                </select>
            </label>
            {form.list_id && (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={form.skip_source_prospects} onChange={e => set({ skip_source_prospects: e.target.checked })} className="rounded border-slate-300" />
                    Skip contacts already in “{campaign.campaign_name}”
                </label>
            )}
            {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 inline-flex items-center gap-2">
                    {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Duplicate
                </button>
            </div>
        </form>
    );
}

function DuplicateResult({ result, onClose, onOpenCopy }) {
    const copied = result.copied || {};
    const enrollment = result.enrollment;
    const gaps = result.persona_gaps || [];
    return (
        <div className="space-y-4" role="status">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> Created “{result.campaign?.campaign_name}” as a draft
            </p>
            <ul className="text-sm text-slate-600 grid grid-cols-2 gap-1">
                <li>{copied.sequences || 0} steps</li>
                <li>{copied.templates || 0} templates</li>
                <li>{copied.subject_variants || 0} subject variants</li>
                <li>{copied.attachments || 0} attachments</li>
                <li>{copied.automation_rules || 0} automation rules</li>
                {enrollment && <li>{enrollment.enrolled_count} contacts enrolled ({enrollment.rejected_count} skipped)</li>}
            </ul>
            {enrollment?.daily_limit_notice && <p className="text-sm text-amber-700">{enrollment.daily_limit_notice}</p>}
            {result.skipped_inboxes?.length > 0 && (
                <p className="text-sm text-amber-700">Not copied (inactive or blocked): {result.skipped_inboxes.join(', ')}</p>
            )}
            {gaps.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="w-4 h-4" /> Personas without templates</p>
                    <ul className="mt-1 space-y-0.5">
                        {gaps.map(g => (
                            <li key={g.persona_type}>{g.persona_type}: {g.prospect_count} contacts, no template for step {g.missing_steps.join(', ')}</li>
                        ))}
                    </ul>
                    <p className="mt-1 text-xs">Generate or write them before launch, or these contacts get another persona's email.</p>
                </div>
            )}
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Done</button>
                {onOpenCopy && (
                    <button type="button" onClick={() => onOpenCopy(result.campaign)} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Open copy</button>
                )}
            </div>
        </div>
    );
}
