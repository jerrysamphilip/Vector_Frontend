import { CheckCircle2, Loader2 } from 'lucide-react';
import { Toggle } from './shared';

// Inbox detail "Settings" tab: warm-up toggles, limits, max/day override and identifier, saved together.
export default function InboxSettingsTab({ accounts }) {
    const {
        drawerForm, formError, handleSaveSettings, saveSuccess, setDrawerForm, updateMutation
    } = accounts;
    return (
        <div className="p-5 space-y-4">
            {[
                { key: 'warmup_enabled',    label: 'Warmup Enabled',      sub: 'Allow warmup traffic from this mailbox.' },
                { key: 'warmup_auto_adjust', label: 'Auto Adjust Volume',  sub: 'Reduce warmup when campaign traffic is busy.' },
                { key: 'warmup_randomize',   label: 'Randomize Daily Count', sub: 'Add variance to avoid bot-like patterns.' },
            ].map(({ key, label, sub }) => (
                <div key={key} className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                    </div>
                    <Toggle checked={drawerForm[key]}
                        onChange={() => setDrawerForm(p => ({ ...p, [key]: !p[key] }))}/>
                </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
                {[
                    { key: 'warmup_reply_rate_target', label: 'Reply Rate %',    min: 0, max: 100, placeholder: '' },
                    { key: 'warmup_max_target',        label: 'Max Target',      min: 0, placeholder: 'Auto' },
                    { key: 'delay_between_emails',     label: 'Delay (sec)',     min: 15, placeholder: '' },
                    { key: 'daily_limit',              label: 'Daily Limit (post-warmup)', min: 1, placeholder: '' },
                ].map(({ key, label, min, max, placeholder }) => (
                    <label key={key} className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5 block">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
                        <input type="number" min={min} max={max}
                            value={drawerForm[key]} placeholder={placeholder}
                            onChange={e => setDrawerForm(p => ({ ...p, [key]: e.target.value }))}
                            className="mt-1 w-full bg-transparent text-sm font-bold text-gray-900 outline-none"/>
                    </label>
                ))}
            </div>

            <label className="block rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                    Max Emails/Day Override (bypasses warmup ramp)
                </span>
                <input type="number" min={1}
                    value={drawerForm.max_emails_per_day}
                    placeholder="Off — follow warmup ramp / Daily Limit"
                    onChange={e => setDrawerForm(p => ({ ...p, max_emails_per_day: e.target.value }))}
                    className="mt-1 w-full bg-transparent text-sm font-bold text-gray-900 outline-none"/>
                <p className="text-[11px] text-amber-700/80 mt-1">
                    Only set this for an already-established mailbox/domain with prior
                    sending history. It skips the day-by-day warmup ramp entirely —
                    new mailboxes should leave this blank and let warmup graduate
                    (day 10+) to the Daily Limit above instead.
                </p>
            </label>

            <label className="block rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Warmup Identifier</span>
                <input value={drawerForm.warmup_identifier}
                    onChange={e => setDrawerForm(p => ({ ...p, warmup_identifier: e.target.value }))}
                    placeholder="Optional routing tag"
                    className="mt-1 w-full bg-transparent text-sm font-bold text-gray-900 outline-none"/>
            </label>

            {formError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{formError}</p>
            )}

            <button onClick={handleSaveSettings}
                disabled={updateMutation.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60"
                style={{ background: saveSuccess
                    ? 'linear-gradient(135deg,#059669,#34d399)'
                    : 'linear-gradient(135deg,#0046FF,#73C8D2)' }}>
                {updateMutation.isPending
                    ? <Loader2 size={15} className="animate-spin"/>
                    : <CheckCircle2 size={15}/>}
                {saveSuccess ? 'Saved!' : 'Save Settings'}
            </button>
        </div>
    );
}
