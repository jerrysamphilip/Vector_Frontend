// Roles and feature permissions, mirroring the backend (Vector_Backend app/domain/identity.py
// ROLE_DEFAULT_PERMISSIONS / effective_permissions). The API is the authority: these helpers only decide
// what the UI shows; every request is checked again server side.

export const ROLES = Object.freeze({
    PLATFORM_ADMIN: 'PLATFORM_ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    AGENT: 'AGENT',
});

const TENANT_ALL = ['manage_campaigns', 'manage_templates', 'manage_inboxes', 'manage_prospects', 'view_analytics', 'export_data', 'manage_team'];

export const ROLE_DEFAULT_PERMISSIONS = Object.freeze({
    PLATFORM_ADMIN: Object.freeze(['manage_platform']),
    SUPER_ADMIN: Object.freeze([...TENANT_ALL]),
    ADMIN: Object.freeze([...TENANT_ALL]),
    MANAGER: Object.freeze(['manage_campaigns', 'manage_templates', 'view_analytics']),
    AGENT: Object.freeze(['manage_campaigns']),
});

/** The user's permissions: the custom list the API sent (also an empty one), else the role's defaults. */
export function effectivePermissions(user) {
    if (!user) return [];
    if (Array.isArray(user.permissions)) return user.permissions;
    return [...(ROLE_DEFAULT_PERMISSIONS[user.role] || [])];
}

/**
 * Same rule as before (lib/authStorage hasPermission): PLATFORM_ADMIN has no tenant permissions,
 * SUPER_ADMIN (the workspace creator) has all of them, everyone else has their effective permissions.
 */
export function userHasPermission(user, permission) {
    if (!user || !permission) return false;
    if (user.role === ROLES.PLATFORM_ADMIN) return permission === 'manage_platform';
    if (user.role === ROLES.SUPER_ADMIN) return true;
    return effectivePermissions(user).includes(permission);
}

/** True when the user has one of the roles. */
export function userHasRole(user, ...roles) {
    const wanted = roles.flat();
    return Boolean(user?.role) && wanted.includes(user.role);
}

export const ADMIN_ROLES = Object.freeze([ROLES.SUPER_ADMIN, ROLES.ADMIN]);
