import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, Loader2, Plus, RefreshCw, Save, Sparkles, UserRound } from 'lucide-react';
import { campaignApi, sequenceApi } from '../api/campaigns';
import { errorMessage } from '../lib/apiErrors';
import { isStaleVersion } from '../lib/staleVersion';
import Loading from '../components/common/Loading';
import LoadError from '../components/ui/LoadError';
import StatusBadge from '../components/campaigns/StatusBadge';
import InboxSelector from '../components/campaigns/actions/InboxSelector';
import TimezonePicker from '../components/campaigns/wizard/TimezonePicker';
import StepEditorCard from '../components/campaigns/edit/StepEditorCard';
import EmailPreviewDialog from '../components/campaigns/edit/EmailPreviewDialog';
import {
    MAX_STEPS, buildSteps, editBody, impactText, insertStep, moveNewStep, stepsError, toEditorHtml,
} from '../components/campaigns/edit/campaignEditModel';
import { EDITABLE_STATUSES, editSettingsBody, isLaunched, settingsError, settingsFormFrom } from '../components/campaigns/tabs/settingsForm';

const inputClass = 'mt-1 w-full h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-500';

function Banner({ banner, onDismiss }) {
    if (!banner) return null;
    const tone = { error: 'border-red-200 bg-red-50 text-red-700', warning: 'border-amber-200 bg-amber-50 text-amber-800' }[banner.tone]
        || 'border-emerald-200 bg-emerald-50 text-emerald-700';
    return (
        <div role={banner.tone === 'error' ? 'alert' : 'status'} className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm ${tone}`}>
            <span>{banner.text}</span>
            <span className="flex items-center gap-3">
                {banner.action}
                <button type="button" onClick={onDismiss} aria-label="Dismiss" className="opacity-70 hover:opacity-100">x</button>
            </span>
        </div>
    );
}

/**
 * Edit a campaign (P2 S-04 / F-04, F-05) - also after launch: the steps with wait days and every persona
 * version of each step (who receives it, regenerate one or all, preview as a real contact), sender / CTA /
 * window / timezone / mailboxes. Save runs the dry run first and shows how many unsent emails the change
 * updates; it is one POST /campaigns/{id}/edits under the campaign's row_version (409 -> reload prompt).
 */
export default function CampaignEdit() {
    const { id } = useParams();
    const queryClient = useQueryClient();
    const campaignQ = useQuery({ queryKey: ['campaign', id], queryFn: () => campaignApi.get(id), refetchOnWindowFocus: false });
    const sequencesQ = useQuery({ queryKey: ['campaign-sequences', id], queryFn: () => sequenceApi.list(id), refetchOnWindowFocus: false });
    const assignmentsQ = useQuery({ queryKey: ['campaign-template-assignments', id], queryFn: () => campaignApi.getTemplateAssignments(id, { limit: 500 }), refetchOnWindowFocus: false });

    const campaign = campaignQ.data;
    const loadedSteps = useMemo(() => buildSteps(sequencesQ.data?.steps || [], assignmentsQ.data), [sequencesQ.data, assignmentsQ.data]);
    const [steps, setSteps] = useState(null);
    const [form, setForm] = useState(null);
    const version = useRef(null);
    const [editorRev, setEditorRev] = useState(0);
    const [banner, setBanner] = useState(null);
    const [pending, setPending] = useState(null); // { body, text }: dry run done, waiting for the user
    const [saving, setSaving] = useState(false);
    const [regenerating, setRegenerating] = useState(null);
    const [preview, setPreview] = useState(null);

    // Start editing from what was loaded (and again after Reload / a save)
    useEffect(() => {
        if (campaign && sequencesQ.data && assignmentsQ.data && steps === null) {
            setSteps(loadedSteps);
            setForm(settingsFormFrom(campaign));
            version.current = campaign.row_version ?? null;
        }
    }, [campaign, sequencesQ.data, assignmentsQ.data, loadedSteps, steps]);

    const reload = async () => {
        setBanner(null);
        setPending(null);
        setSteps(null);
        await Promise.all([campaignQ.refetch(), sequencesQ.refetch(), assignmentsQ.refetch()]);
        setEditorRev(r => r + 1);
    };

    const fail = (error) => {
        if (isStaleVersion(error)) {
            setBanner({
                tone: 'error',
                text: 'Someone else changed this campaign while you were editing. Reload to see the latest version (your unsaved edits will be lost).',
                action: <button type="button" onClick={reload} className="inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="w-3.5 h-3.5" /> Reload</button>,
            });
        } else {
            setBanner({ tone: 'error', text: errorMessage(error) });
        }
    };

    if (campaignQ.isLoading || sequencesQ.isLoading || assignmentsQ.isLoading) return <Loading text="Loading campaign..." size="lg" fullScreen />;
    const loadError = campaignQ.error || sequencesQ.error || assignmentsQ.error;
    if (loadError && !campaign) return <LoadError error={loadError} onRetry={reload} title="Couldn't load this campaign" />;
    if (!campaign || !steps || !form) return <Loading text="Loading campaign..." size="lg" fullScreen />;

    const launched = isLaunched(campaign);
    const editable = EDITABLE_STATUSES.includes(campaign.status);
    const prospects = assignmentsQ.data?.prospects || [];
    const setField = (patch) => { setForm(f => ({ ...f, ...patch })); setPending(null); };
    const updateSteps = (next) => { setSteps(next); setPending(null); };

    const buildBody = () => {
        const { settings, inbox_ids: inboxIds } = editSettingsBody(form);
        const settingsBody = { settings: launched ? settings : { ...settings, start_date: form.start_date || null }, inbox_ids: inboxIds };
        return editBody({ steps, loadedSteps, settingsBody });
    };

    const check = async () => {
        const problem = settingsError(form) || stepsError(steps);
        if (problem) { setBanner({ tone: 'error', text: problem }); return; }
        setBanner(null);
        setSaving(true);
        try {
            const body = buildBody();
            const result = await campaignApi.checkEdit(id, body, version.current);
            setPending({ body, text: impactText(result) });
        } catch (error) {
            fail(error);
        } finally {
            setSaving(false);
        }
    };

    const save = async () => {
        setSaving(true);
        try {
            const result = await campaignApi.edit(id, pending.body, version.current);
            setPending(null);
            setBanner({ tone: 'success', text: `Saved. ${impactText(result)}` });
            queryClient.invalidateQueries({ queryKey: ['campaign', id] });
            queryClient.invalidateQueries({ queryKey: ['campaign-templates', id] });
            queryClient.invalidateQueries({ queryKey: ['campaign-schedule', id] });
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            await Promise.all([campaignQ.refetch(), sequencesQ.refetch(), assignmentsQ.refetch()]);
            setSteps(null);
            setEditorRev(r => r + 1);
        } catch (error) {
            setPending(null);
            fail(error);
        } finally {
            setSaving(false);
        }
    };

    // F-05: AI-regenerate one persona version (the existing endpoint saves it; a launched campaign's unsent
    // emails built from it follow), or each version of every step in turn
    const regenerateOne = async (v) => {
        setRegenerating(v.template_id);
        try {
            const r = await campaignApi.regenerateTemplate(id, v.template_id);
            setSteps(list => list.map(s => ({
                ...s,
                versions: s.versions.map(x => (x.template_id === v.template_id
                    ? { ...x, subject: r.subject, body: toEditorHtml(r.body), original: { ...x.original, subject: r.subject, body: toEditorHtml(r.body) } }
                    : x)),
            })));
            setEditorRev(n => n + 1);
            return true;
        } catch (error) {
            fail(error);
            return false;
        } finally {
            setRegenerating(null);
        }
    };
    const regenerateAll = async () => {
        let done = 0;
        for (const v of steps.flatMap(s => s.versions).filter(x => x.template_id)) {
            if (!(await regenerateOne(v))) return;
            done += 1;
        }
        setBanner({ tone: 'success', text: `${done} email${done === 1 ? '' : 's'} regenerated` });
        assignmentsQ.refetch();
    };

    return (
        <div className="max-w-5xl mx-auto pb-24 space-y-6">
            <header className="flex flex-wrap items-center gap-4">
                <Link to={`/app/campaigns/${id}`} aria-label="Back to the campaign" className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"><ArrowLeft className="w-4 h-4" /></Link>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-3">Edit {campaign.campaign_name} <StatusBadge status={campaign.status} /></h1>
                    <p className="text-sm text-slate-500">{launched ? 'Changes apply to the emails that have not gone out yet; sent emails never change.' : 'This campaign has not been launched yet.'}</p>
                </div>
            </header>

            <Banner banner={banner} onDismiss={() => setBanner(null)} />
            {!editable && <Banner banner={{ tone: 'warning', text: 'This campaign has finished and can no longer be edited.' }} onDismiss={() => {}} />}

            <fieldset disabled={!editable || saving} className="space-y-6">
                <section className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <h2 className="sm:col-span-2 text-sm font-bold text-slate-800 flex items-center gap-2"><UserRound className="w-4 h-4 text-blue-500" /> Sender and call to action</h2>
                    <label className="block text-xs font-semibold text-slate-600">Sender name<input value={form.sender_name} maxLength={100} onChange={e => setField({ sender_name: e.target.value })} className={inputClass} /></label>
                    <label className="block text-xs font-semibold text-slate-600">Sender title<input value={form.sender_title} maxLength={150} onChange={e => setField({ sender_title: e.target.value })} className={inputClass} /></label>
                    <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">Booking / CTA link<input type="url" value={form.cta_link} maxLength={500} placeholder="https://" onChange={e => setField({ cta_link: e.target.value })} className={inputClass} /></label>
                </section>

                <section className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <h2 className="sm:col-span-2 text-sm font-bold text-slate-800 flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500" /> Send window</h2>
                    <label className="block text-xs font-semibold text-slate-600">Window start<input type="time" value={form.send_window_start} onChange={e => setField({ send_window_start: e.target.value })} className={inputClass} /></label>
                    <label className="block text-xs font-semibold text-slate-600">Window end<input type="time" value={form.send_window_end} onChange={e => setField({ send_window_end: e.target.value })} className={inputClass} /></label>
                    <div className="sm:col-span-2 text-xs font-semibold text-slate-600">Timezone<div className="mt-1"><TimezonePicker value={form.campaign_timezone} onChange={tz => setField({ campaign_timezone: tz })} /></div></div>
                    <label className="block text-xs font-semibold text-slate-600">Wait days count
                        <select value={form.wait_business_days ? 'business' : 'calendar'} onChange={e => setField({ wait_business_days: e.target.value === 'business' })} className={inputClass}>
                            <option value="calendar">Calendar days</option>
                            <option value="business">Business days (Mon-Fri)</option>
                        </select>
                    </label>
                    <label className="block text-xs font-semibold text-slate-600">New contacts per day (empty = no limit)<input type="number" min="1" value={form.daily_batch_size} onChange={e => setField({ daily_batch_size: e.target.value })} className={inputClass} /></label>
                    <label className="block text-xs font-semibold text-slate-600">{launched ? 'Start date (locked after launch)' : 'Start date'}<input type="date" value={form.start_date} disabled={launched} onChange={e => setField({ start_date: e.target.value })} className={inputClass} /></label>
                    <label className="block text-xs font-semibold text-slate-600">End date<input type="date" value={form.end_date} onChange={e => setField({ end_date: e.target.value })} className={inputClass} /></label>
                    <div className="sm:col-span-2"><InboxSelector value={form.inbox_ids} onChange={ids => setField({ inbox_ids: ids })} disabled={!editable} /></div>
                </section>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-base font-bold text-slate-900">Steps ({steps.length}/{MAX_STEPS})</h2>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={regenerateAll} disabled={Boolean(regenerating)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50">
                            <Sparkles className="w-4 h-4" /> Regenerate all emails
                        </button>
                        {steps.length < MAX_STEPS && (
                            <button type="button" onClick={() => updateSteps(insertStep(steps, -1))} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900">
                                <Plus className="w-4 h-4" /> Add a first step
                            </button>
                        )}
                    </div>
                </div>

                {steps.map((step, index) => (
                    <StepEditorCard
                        key={step.key}
                        step={step}
                        index={index}
                        total={steps.length}
                        editorRev={editorRev}
                        regenerating={regenerating}
                        canAddStep={steps.length < MAX_STEPS}
                        onChange={next => updateSteps(steps.map((s, i) => (i === index ? next : s)))}
                        onDelete={i => updateSteps(steps.filter((_, j) => j !== i))}
                        onMove={(i, delta) => updateSteps(moveNewStep(steps, i, delta))}
                        onInsertAfter={i => updateSteps(insertStep(steps, i))}
                        onRegenerate={regenerateOne}
                        onPreview={(i, v) => setPreview({
                            stepNumber: i + 1,
                            // a saved step at its saved number: the server renders the unsaved text for a real contact
                            draft: steps[i].sequence_id && loadedSteps.findIndex(s => s.sequence_id === steps[i].sequence_id) === i
                                ? { subject: v.subject, body: v.body } : null,
                            templateId: v.template_id || undefined,
                            unsaved: !steps[i].sequence_id,
                        })}
                    />
                ))}
            </fieldset>

            {preview && (preview.unsaved || !preview.draft ? (
                <Banner banner={{ tone: 'warning', text: preview.unsaved ? 'Save the new step to preview it for a contact.' : 'Save the step order first to preview this step.' }} onDismiss={() => setPreview(null)} />
            ) : (
                <EmailPreviewDialog campaignId={id} prospects={prospects} stepNumber={preview.stepNumber} templateId={preview.templateId} draft={preview.draft} onClose={() => setPreview(null)} />
            ))}

            {editable && (
                <div className="sticky bottom-4 z-30 rounded-xl border border-slate-200 bg-white/95 shadow-lg px-5 py-3 flex flex-wrap items-center gap-3">
                    {pending ? (
                        <>
                            <p className="text-sm text-slate-700" role="status" data-testid="edit-impact">{pending.text}</p>
                            <div className="ml-auto flex gap-2">
                                <button type="button" onClick={() => setPending(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Keep editing</button>
                                <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save changes
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-slate-500">Review the impact on unsent emails before saving.</p>
                            <button type="button" onClick={check} disabled={saving} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Review and save
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
