// Small sales fixtures (shapes follow backend app/services/sales_*.py) for page render tests.
export const owners = [
    { user_id: 'u-1', name: 'Ada Lovelace', email: 'ada@example.com' },
    { user_id: 'u-2', name: 'Bob Builder', email: 'bob@example.com' },
];

export const salesStages = [
    { stage_id: 's-1', name: 'Qualification', probability: 10, sort_order: 1, is_won: false, is_lost: false, active: true, status: 'OPEN' },
    { stage_id: 's-2', name: 'Proposal', probability: 50, sort_order: 2, is_won: false, is_lost: false, active: true, status: 'OPEN' },
    { stage_id: 's-3', name: 'Closed won', probability: 100, sort_order: 3, is_won: true, is_lost: false, active: true, status: 'WON' },
    { stage_id: 's-4', name: 'Closed lost', probability: 0, sort_order: 4, is_won: false, is_lost: true, active: true, status: 'LOST' },
];

const LEAD_STAGES = [['NEW', 'New', 'LEAD', true], ['CONTACTED', 'Contacted', 'LEAD', true], ['ENGAGED', 'Engaged (MQL)', 'MQL', true],
    ['SQL', 'Sales qualified (SQL)', 'SQL', true], ['CONVERTED', 'Converted to opportunity', 'OPPORTUNITY', false], ['DISQUALIFIED', 'Disqualified', null, false]];

export const leadsMeta = {
    stages: LEAD_STAGES.map(([value, label, lifecycle, open]) => ({ value, label, lifecycle, open })),
    criteria: [{ key: 'budget', label: 'Budget confirmed' }, { key: 'authority', label: 'Talking to the decision maker' },
        { key: 'need', label: 'Clear business need' }, { key: 'timeline', label: 'Buying timeline known' }],
    client_types: [{ value: 'NEW', label: 'New client' }, { value: 'EXISTING', label: 'Existing client' }],
    proposal_statuses: [{ value: 'DRAFT', label: 'Draft' }, { value: 'SENT', label: 'Sent' }],
    sales_stages: salesStages,
    fiscal_year_start_month: 4,
    sees_everything: true,
    forecast_categories: [{ value: 'PIPELINE', label: 'Pipeline' }, { value: 'COMMIT', label: 'Commit' }],
    disqualify_reasons: ['No budget'], default_recycle_days: 90, win_reasons: ['Price'], loss_reasons: ['Competitor'],
    require_close_reason: false, can_see_amounts: true,
};

export const lead = (id, extra = {}) => ({
    lead_id: id, prospect_id: `c-${id}`, contact_name: `Lead ${id}`, contact_email: `${id}@acme.test`, company_name: 'Acme',
    owner_id: 'u-1', owner_name: 'Ada Lovelace', stage: 'NEW', stage_label: 'New', source: 'Website',
    next_step: null, next_step_at: null, qualification: {}, created_at: '2026-10-01T10:00:00Z',
    stage_changed_at: '2026-10-02T10:00:00Z', updated_at: '2026-10-02T10:00:00Z', version: 1, days_in_stage: 2, history: [],
    contact_title: 'CTO', account_id: 'a-1', opportunity_id: null, ...extra,
});

export const opportunity = (id, extra = {}) => ({
    opportunity_id: id, name: `Deal ${id}`, amount: 50000, close_date: '2026-12-31', stage_id: 's-1', stage_name: 'Qualification',
    probability: 10, status: 'OPEN', client_type: 'NEW', owner_id: 'u-1', owner_name: 'Ada Lovelace', account_id: 'a-1',
    company_name: 'Acme', prospect_id: 'c-1', contact_name: 'Carol Contact', forecast_category: 'PIPELINE',
    proposals: [], stage_history: [], lead: null, weighted_amount: 5000, stale: false, days_idle: 0,
    created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-02T10:00:00Z', version: 1, ...extra,
});
