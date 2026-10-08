// Built-in contact views, shown in the sidebar under Contacts alongside saved views.
export const BUILT_IN_VIEWS = [
    { id: 'all', name: 'All contacts', owner: '' },
    { id: 'mine', name: 'My contacts', owner: 'me' },
    { id: 'unassigned', name: 'Unassigned', owner: 'unassigned', manageOnly: true },
    { id: 'recent', name: 'Recently created', filters: { op: 'AND', conditions: [{ field: 'created_at', operator: 'in_last_days', value: 30 }] } },
];

/** Link that opens a contact view (the Contacts page applies its filters, sort and columns). */
export const contactViewHref = (id) => `/app/contacts?view=${encodeURIComponent(id)}&apply=1`;
