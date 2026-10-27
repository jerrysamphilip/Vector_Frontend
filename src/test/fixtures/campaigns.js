// Small campaign fixtures for page render tests.
export const campaign = (id, extra = {}) => ({
    campaign_id: id, campaign_name: `Campaign ${id}`, status: 'ACTIVE', sent_count: 10, opened_count: 4,
    replied_count: 1, bounced_count: 0, unsubscribed_count: 0, created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-20T10:00:00Z', ...extra,
});
export const campaignPage = (items) => ({ items, total: items.length, page: 1, page_size: 100, total_pages: 1 });
export const conversation = (id, extra = {}) => ({
    id, prospect_id: `p-${id}`, prospect_name: `Prospect ${id}`, prospect_email: `${id}@acme.test`, inbox_email: 'me@acme.test',
    subject: `Subject ${id}`, last_message_snippet: 'Sounds good', last_message_at: '2026-10-20T10:00:00Z', is_unread: false,
    status: 'OPEN', last_message_direction: 'INBOUND', ...extra,
});
