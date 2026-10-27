// Small CRM fixtures (contacts, companies, lists, tasks; shapes from backend contact_query_service) for page tests.
export { owners } from './sales';

export const contactMeta = (over = {}) => ({
    lifecycle_stages: [{ value: 'LEAD', label: 'Lead' }, { value: 'CUSTOMER', label: 'Customer' }],
    lead_statuses: [{ value: 'NEW', label: 'New' }, { value: 'OPEN', label: 'Open' }],
    legal_bases: [{ value: 'CONSENT', label: 'Consent' }],
    columns: [{ key: 'full_name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'company_name', label: 'Company' },
        { key: 'owner_name', label: 'Owner' }, { key: 'lifecycle_stage', label: 'Lifecycle stage' }],
    can_manage: true, can_export: true, can_override_lifecycle: true, restore_window_days: 90,
    ...over,
});

export const contact = (id, extra = {}) => ({
    prospect_id: id, row_version: 1, first_name: 'Carol', last_name: `Contact${id}`, full_name: `Carol Contact${id}`,
    email: `carol.${id}@acme.test`, phone: '+1 555 0100', mobile_phone: null, designation: 'CTO', company_name: 'Acme',
    account_id: 'a-1', account_name: 'Acme', account_domain: 'acme.test', owner_id: 'u-1', owner_name: 'Ada Lovelace',
    tags: ['vip'], industry: 'Software', emp_band: '11-50', poc_city: 'Paris', poc_state: null, poc_country: 'France',
    timezone: 'Europe/Paris', linkedin_url: null, lifecycle_stage: 'LEAD', lead_status: 'NEW', lead_source: 'Website',
    legal_basis: 'CONSENT', consent_status: 'SUBSCRIBED', is_valid_email: true, custom_fields: {}, quality_flags: [],
    score: 40, fit_score: 20, engagement_score: 20, score_grade: 'B', scored_at: null,
    last_activity_at: '2026-10-20T10:00:00Z', last_contacted_at: null, created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-02T10:00:00Z',
    ...extra,
});

export const contactPage = (items, extra = {}) => ({ items, total: items.length, page: 1, page_size: 25, total_pages: 1, ...extra });

export const account = (id, extra = {}) => ({
    account_id: id, name: `Acme ${id}`, domain: 'acme.test', website: null, industry: 'Software', emp_band: '11-50', phone: null,
    city: 'Paris', country: 'France', annual_revenue: null, description: null, owner_id: 'u-1', owner_name: 'Ada Lovelace',
    lifecycle_stage: 'CUSTOMER', tags: [], contact_count: 1, row_version: 1, created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-02T10:00:00Z', can_edit: true, can_delete: true,
    stats: { contacts: 1, emails_sent: 3, replies: 1, open_tasks: 0 },
    contacts: [{ prospect_id: 'c-1', full_name: 'Carol Contact', first_name: 'Carol', last_name: 'Contact', email: 'carol@acme.test',
        designation: 'CTO', tags: [], owner_name: 'Ada Lovelace', last_activity_at: null }],
    history: [],
    ...extra,
});

export const crmList = (id, extra = {}) => ({
    list_id: id, list_name: `List ${id}`, list_type: 'STATIC', object_type: 'CONTACT', member_count: 3, created_by_name: 'Ada Lovelace',
    description: null, created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-02T10:00:00Z', can_edit: true, ...extra,
});

export const task = (id, extra = {}) => ({
    task_id: id, title: `Task ${id}`, task_type: 'TODO', status: 'OPEN', priority: 'MEDIUM', due_at: '2026-10-27T10:00:00Z',
    owner_id: 'u-1', owner_name: 'Ada Lovelace', prospect_id: 'c-1', contact_name: 'Carol Contact', notes: null,
    created_at: '2026-10-01T10:00:00Z', row_version: 1, ...extra,
});
