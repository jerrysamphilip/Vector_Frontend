// Sales hierarchy helpers (BRD 5.4, BR-SH-01/02). Pure functions over GET /team/hierarchy users.

/** Everyone below `userId` (direct and indirect reports), not including the user. */
export function descendantIds(users, userId) {
    const children = {};
    (users || []).forEach(u => { if (u.manager_id) (children[u.manager_id] ||= []).push(u.user_id); });
    const seen = new Set();
    const stack = [userId];
    while (stack.length) {
        for (const child of children[stack.pop()] || []) {
            if (!seen.has(child) && child !== userId) { seen.add(child); stack.push(child); }
        }
    }
    return seen;
}

/**
 * Who `userId` (null for someone not created yet) can report to at `level`: people in the
 * hierarchy at a higher level (lower number), never the user or anyone in their own team
 * (which would make a cycle). Level 1 and "not in hierarchy" have no manager.
 */
export function managerCandidates(users, userId, level) {
    if (!level || Number(level) <= 1) return [];
    const below = userId ? descendantIds(users, userId) : new Set();
    return (users || [])
        .filter(u => u.sales_level && u.sales_level < Number(level) && u.user_id !== userId && !below.has(u.user_id))
        .sort((a, b) => a.sales_level - b.sales_level || (a.name || '').localeCompare(b.name || ''));
}

/** Client-side check matching PUT /team/hierarchy/{id}; returns an error message or null. */
export function hierarchyError(users, userId, level, managerId) {
    if (!level) return null;
    if (Number(level) === 1) return null;
    if (!managerId) return 'Levels 2 to 4 need a manager';
    if (!managerCandidates(users, userId, level).some(u => u.user_id === managerId)) {
        return 'Choose a manager at a higher level who is not in this person\'s own team';
    }
    return null;
}
