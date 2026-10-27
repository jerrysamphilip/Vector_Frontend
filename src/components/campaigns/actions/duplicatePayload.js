// Request body of POST /campaigns/{id}/duplicates from the duplicate form. Empty fields are left out so
// the copy keeps the source's value; inbox_ids is only sent when the user changed the selection.

export function initialDuplicateForm(campaign) {
    const time = (t) => (t ? String(t).slice(0, 5) : '');
    return {
        campaign_name: `Copy of ${campaign.campaign_name || ''}`.slice(0, 255),
        start_date: '',
        send_window_start: time(campaign.send_window_start),
        send_window_end: time(campaign.send_window_end),
        campaign_timezone: campaign.campaign_timezone || 'UTC',
        inbox_ids: (campaign.sending_inboxes || []).map(i => i.inbox_id),
        list_id: '',
        skip_source_prospects: true,
    };
}

export function duplicatePayload(form, campaign) {
    const body = { skip_source_prospects: form.skip_source_prospects };
    const name = form.campaign_name.trim();
    if (name) body.campaign_name = name;
    if (form.start_date) body.start_date = form.start_date;
    if (form.send_window_start) body.send_window_start = form.send_window_start;
    if (form.send_window_end) body.send_window_end = form.send_window_end;
    if (form.campaign_timezone && form.campaign_timezone !== campaign.campaign_timezone) {
        body.campaign_timezone = form.campaign_timezone;
    }
    const original = (campaign.sending_inboxes || []).map(i => i.inbox_id).sort().join(',');
    if ([...form.inbox_ids].sort().join(',') !== original) body.inbox_ids = form.inbox_ids;
    if (form.list_id) body.list_ids = [form.list_id];
    return body;
}

/** Client-side checks mirroring the API's (422/400 would say the same). */
export function duplicateFormError(form, today) {
    if (!form.campaign_name.trim()) return 'Enter a name for the copy';
    if (form.start_date && today && form.start_date < today) return 'The start date cannot be in the past';
    if (form.send_window_start && form.send_window_end && form.send_window_end <= form.send_window_start) {
        return 'The send window must end after it starts';
    }
    return null;
}
