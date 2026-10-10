// Signed-in user info (name, role, permissions, two-factor state) for the UI. The session itself
// lives in httpOnly cookies set by the API; no token is ever readable by or stored from JavaScript.
export const USER_KEY = 'user';
const CSRF_COOKIE = 'csrf_token';
const LEGACY_TOKEN_KEYS = ['access_token', 'refresh_token'];

// One-time cleanup: earlier builds kept tokens in web storage.
(function removeLegacyTokens() {
    try {
        LEGACY_TOKEN_KEYS.forEach((k) => {
            localStorage.removeItem(k);
            sessionStorage.removeItem(k);
        });
    } catch { /* storage unavailable */ }
})();

/** The readable CSRF cookie, echoed in X-CSRF-Token on state-changing requests. */
export function getCsrfToken() {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.split('; ').find((c) => c.startsWith(`${CSRF_COOKIE}=`));
    return match ? decodeURIComponent(match.slice(CSRF_COOKIE.length + 1)) : '';
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

/** Store the user from a sign-in / session response. Token fields, if any, are ignored. */
export function setAuthSession(payload) {
    if (payload?.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
        if (payload.user.first_name) {
            localStorage.setItem('user_name', payload.user.first_name);
        }
    }
    if (payload && 'first_login' in payload) {
        if (payload.first_login) localStorage.setItem('first_login', '1');
        else localStorage.removeItem('first_login');
    }
}

/** Merge fields into the stored user (e.g. two-factor state after enabling it). */
export function updateStoredUser(patch) {
    const user = getStoredUser();
    if (!user) return null;
    const next = { ...user, ...patch };
    localStorage.setItem(USER_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('auth-user-changed'));
    return next;
}

export function consumeFirstLogin() {
    const val = localStorage.getItem('first_login') === '1';
    localStorage.removeItem('first_login');
    return val;
}

export function clearAuthSession() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('user_name');
    localStorage.removeItem('first_login');
    LEGACY_TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));
}

/** The UI's view of "signed in": user info is present. The API cookie decides for real; a dead
 *  session turns into a 401, a failed refresh, clearAuthSession() and the login page. */
export function isAuthenticated() {
    return Boolean(getStoredUser());
}

/** The workspace requires two-factor and this user has not set it up yet. */
export function mfaSetupRequired() {
    return Boolean(getStoredUser()?.mfa_setup_required);
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
