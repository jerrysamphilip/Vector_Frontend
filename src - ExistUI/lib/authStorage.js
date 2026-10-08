export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const USER_KEY = 'user';

export function getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function getDisplayName() {
    const user = getStoredUser();
    if (user?.first_name) return user.first_name;
    return localStorage.getItem('user_name') || 'User';
}

export function setAuthSession(payload) {
    if (payload?.access_token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, payload.access_token);
    }
    if (payload?.refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, payload.refresh_token);
    }
    if (payload?.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
        if (payload.user.first_name) {
            localStorage.setItem('user_name', payload.user.first_name);
        }
    }
    if (payload?.first_login) {
        localStorage.setItem('first_login', '1');
    } else {
        localStorage.removeItem('first_login');
    }
}

export function consumeFirstLogin() {
    const val = localStorage.getItem('first_login') === '1';
    localStorage.removeItem('first_login');
    return val;
}

export function clearAuthSession() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('user_name');
}

export function isAuthenticated() {
    return Boolean(getAccessToken());
}

/**
 * Check if the stored user has a specific feature permission.
 * SUPER_ADMIN (tenant creator) always returns true for tenant permissions.
 * PLATFORM_ADMIN is blocked from tenant permissions (returns false).
 * Others check against the 'permissions' array stored in the user object.
 */
export function hasPermission(permission) {
    const user = getStoredUser();
    if (!user) return false;
    if (user.role === 'PLATFORM_ADMIN') return false; // platform admins have no tenant permissions
    if (user.role === 'SUPER_ADMIN') return true;
    return Array.isArray(user.permissions) && user.permissions.includes(permission);
}
