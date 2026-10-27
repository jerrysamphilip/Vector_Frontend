import { useRef, useState } from 'react';
import { Clock, Info, Loader2, Save, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignApi } from '../../../api/campaigns';
import { itemVariants } from '../../layout/PageTransition';
import { versionedSave } from '../../../lib/useRecordVersion';
import { errorMessage } from '../../../lib/apiErrors';
import { isStaleVersion } from '../../../lib/staleVersion';
import TimezonePicker from '../wizard/TimezonePicker';
import InboxSelector from '../actions/InboxSelector';
import { EDITABLE_STATUSES, settingsError, settingsFormFrom, settingsPayload } from './settingsForm';

const inputClass = 'mt-1 w-full h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-500';
const MODES = [
    { value: 'spread', label: 'Spread evenly' },
    { value: 'random', label: 'Random' },
    { value: 'batch', label: 'Batches' },
];

function Section({ icon: Icon, title, children }) {
    return (
        <motion.section variants={itemVariants} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <Icon className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-800">{title}</h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
        </motion.section>
    );
}

function Field({ label, children, wide }) {
    return <label className={`block text-xs font-semibold text-slate-600 ${wide ? 'sm:col-span-2' : ''}`}>{label}{children}</label>;
}

/**
 * Campaign settings: sender details, send window, timezone, schedule and inboxes. Editable while the
 * campaign is a draft or paused; read-only while it is sending (editing a live campaign comes later).
 * Saves with the row_version on screen (T-3); emptied optional fields are cleared (S-23).
 */
export default function SettingsTab({ campaign }) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState(() => settingsFormFrom(campaign));
    const [message, setMessage] = useState(null); // { tone, text }
    const version = useRef(campaign.row_version ?? null);
    const editable = EDITABLE_STATUSES.includes(campaign.status);
    const set = (patch) => { setForm(f => ({ ...f, ...patch })); setMessage(null); };

    const mutation = useMutation({
        mutationFn: versionedSave(version, (data) => campaignApi.update(campaign.campaign_id, data)),
        scope: { id: `campaign-${campaign.campaign_id}` },
        onSuccess: (updated) => {
            setForm(settingsFormFrom(updated));
            setMessage({ tone: 'success', text: 'Settings saved' });
            queryClient.invalidateQueries({ queryKey: ['campaign', campaign.campaign_id] });
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        },
        onError: (err) => { if (!isStaleVersion(err)) setMessage({ tone: 'error', text: errorMessage(err) }); },
    });

    const save = (e) => {
        e.preventDefault();
        const problem = settingsError(form);
        if (problem) { setMessage({ tone: 'error', text: problem }); return; }
        mutation.mutate(settingsPayload(form));
    };

    return (
        <form onSubmit={save} className="max-w-4xl mx-auto space-y-6">
            {!editable && (
                <div role="note" className="flex gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                        {campaign.status === 'ACTIVE'
                            ? 'This campaign is sending, so its settings are read-only. Pause it to change them.'
                            : 'This campaign has finished; its settings are read-only.'}
                    </span>
                </div>
            )}
            <fieldset disabled={!editable || mutation.isPending} className="space-y-6">
                <Section icon={UserRound} title="Sender details">
                    <Field label="Sender name"><input value={form.sender_name} maxLength={100} onChange={e => set({ sender_name: e.target.value })} className={inputClass} /></Field>
                    <Field label="Sender title"><input value={form.sender_title} maxLength={150} onChange={e => set({ sender_title: e.target.value })} className={inputClass} /></Field>
                    <Field label="Booking / CTA link" wide><input type="url" value={form.cta_link} maxLength={500} onChange={e => set({ cta_link: e.target.value })} placeholder="https://" className={inputClass} /></Field>
                </Section>

                <Section icon={Clock} title="Send window and schedule">
                    <Field label="Window start"><input type="time" value={form.send_window_start} onChange={e => set({ send_window_start: e.target.value })} className={inputClass} /></Field>
                    <Field label="Window end"><input type="time" value={form.send_window_end} onChange={e => set({ send_window_end: e.target.value })} className={inputClass} /></Field>
                    <div className="sm:col-span-2 text-xs font-semibold text-slate-600">
                        Timezone
                        <div className={`mt-1 ${editable ? '' : 'pointer-events-none opacity-70'}`}>
                            <TimezonePicker value={form.campaign_timezone} onChange={tz => set({ campaign_timezone: tz })} />
                        </div>
                    </div>
                    <Field label="Distribution">
                        <select value={form.sending_mode} onChange={e => set({ sending_mode: e.target.value })} className={inputClass}>
                            {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Minimum gap (minutes)"><input type="number" min="0" max="10080" value={form.min_gap_minutes} onChange={e => set({ min_gap_minutes: e.target.value })} className={inputClass} /></Field>
                    {form.sending_mode === 'batch' && (
                        <>
                            <Field label="Emails per batch"><input type="number" min="1" value={form.batch_size} onChange={e => set({ batch_size: e.target.value })} className={inputClass} /></Field>
                            <Field label="Minutes between batches"><input type="number" min="1" max="10080" value={form.batch_gap_minutes} onChange={e => set({ batch_gap_minutes: e.target.value })} className={inputClass} /></Field>
                        </>
                    )}
                    <Field label="New contacts per day (empty = no limit)"><input type="number" min="1" value={form.daily_batch_size} onChange={e => set({ daily_batch_size: e.target.value })} className={inputClass} /></Field>
                    <div />
                    <Field label="Start date"><input type="date" value={form.start_date} onChange={e => set({ start_date: e.target.value })} className={inputClass} /></Field>
                    <Field label="End date"><input type="date" value={form.end_date} onChange={e => set({ end_date: e.target.value })} className={inputClass} /></Field>
                </Section>

                <motion.section variants={itemVariants} className="bg-white rounded-xl border border-slate-200 p-6">
                    <InboxSelector value={form.inbox_ids} onChange={ids => set({ inbox_ids: ids })} disabled={!editable} />
                </motion.section>
            </fieldset>

            {message && (
                <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${message.tone === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{message.text}</p>
            )}
            {editable && (
                <button type="submit" disabled={mutation.isPending} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
                    {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save settings
                </button>
            )}
        </form>
    );
}
