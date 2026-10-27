// Workspace users for page render tests.
export const teamUser = (id, extra = {}) => ({
    user_id: id, email: `${id}@acme.test`, first_name: `First${id}`, last_name: 'Member', role: 'AGENT', status: 'ACTIVE',
    permissions: ['manage_campaigns'], created_at: '2026-01-01T00:00:00Z', last_login: null, ...extra,
});
export const teamUsers = [
    teamUser('u-1', { first_name: 'Ada', last_name: 'Lovelace', role: 'SUPER_ADMIN', email: 'ada@example.com' }),
    teamUser('u-2', { first_name: 'Bob', last_name: 'Builder', role: 'AGENT', email: 'bob@example.com' }),
];
