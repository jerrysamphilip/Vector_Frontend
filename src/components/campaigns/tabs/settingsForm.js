// Campaign Settings tab (F-04): form state from a campaign, the PUT /campaigns/{id} body (draft) and the
// POST /campaigns/{id}/edits body (launched: unsent emails follow the change). Emptied optional fields are sent
// as null so the API clears them (S-23: an explicit null clears sender_name, sender_title, cta_link,
// batch_size, daily_batch_size, start_date, end_date).

export const EDITABLE_STATUSES = ['DRAFT', 'PAUSED', 'ACTIVE'];
export const LAUNCHED_STATUSES = ['ACTIVE', 'PAUSED'];

/** Whether a campaign has its emails built (edits then go through POST /edits and the start date is locked). */
export const isLaunched = (campaign) => LAUNCHED_STATUSES.includes(campaign?.status);

const hhmm = (t) => (t ? String(t).slice(0, 5) : '');
const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

export function settingsFormFrom(campaign) {
    return {
        sender_name: campaign.sender_name || '',
        sender_title: campaign.sender_title || '',
        cta_link: campaign.cta_link || '',
        send_window_start: hhmm(campaign.send_window_start) || '09:00',
        send_window_end: hhmm(campaign.send_window_end) || '17:00',
        campaign_timezone: campaign.campaign_timezone || 'UTC',
        wait_business_days: Boolean(campaign.wait_business_days),
        sending_mode: campaign.sending_mode || 'spread',
        min_gap_minutes: campaign.min_gap_minutes ?? 2,
        batch_size: campaign.batch_size ?? '',
        batch_gap_minutes: campaign.batch_gap_minutes ?? 30,
        daily_batch_size: campaign.daily_batch_size ?? '',
        start_date: campaign.start_date || '',
        end_date: campaign.end_date || '',
        inbox_ids: (campaign.sending_inboxes || []).map(i => i.inbox_id),
    };
}

export function settingsPayload(form) {
    const text = (v) => (v.trim() ? v.trim() : null);
    return {
        sender_name: text(form.sender_name),
        sender_title: text(form.sender_title),
        cta_link: text(form.cta_link),
        send_window_start: form.send_window_start || undefined,
        send_window_end: form.send_window_end || undefined,
        campaign_timezone: form.campaign_timezone,
        wait_business_days: Boolean(form.wait_business_days),
        sending_mode: form.sending_mode,
        min_gap_minutes: num(form.min_gap_minutes) ?? 0,
        batch_size: num(form.batch_size),
        batch_gap_minutes: num(form.batch_gap_minutes) ?? 30,
        daily_batch_size: num(form.daily_batch_size),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        inbox_ids: form.inbox_ids,
    };
}

/** POST /campaigns/{id}/edits body for a launched campaign: settings (no start date: locked) and mailboxes. */
export function editSettingsBody(form) {
    const { inbox_ids: inboxIds, start_date: _locked, ...settings } = settingsPayload(form);
    return { settings, inbox_ids: inboxIds };
}

export function settingsError(form) {
    if (form.send_window_start && form.send_window_end && form.send_window_end <= form.send_window_start) {
        return 'The send window must end after it starts';
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) return 'The end date must be on or after the start date';
    if (form.sending_mode === 'batch' && !num(form.batch_size)) return 'Batch mode needs the number of emails per batch';
    if (!form.inbox_ids.length) return 'Select at least one sending inbox';
    return null;
}
