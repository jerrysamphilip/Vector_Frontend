// Where to go back to after signing in (expired session, protected route visited while signed out).
// Only internal app paths are accepted, so ?next= cannot be used as an open redirect.

const APP_BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, ''); // '' or e.g. '/vector'
const ALLOWED = /^\/(app|admin)(?:[/?#]|$)/;

/**
 * Normalise a candidate return path to a router path (without the deployment base), or null when it is not
 * a safe internal path. Accepts '/app/deals?view=list', '/vector/app/deals' (base stripped) and '/admin/...'.
 */
export function safeReturnPath(raw) {
    if (!raw || typeof raw !== 'string') return null;
    let p = raw.trim();
    // eslint-disable-next-line no-control-regex -- control characters are exactly what is rejected here
    if (/[\u0000-\u001f\\]/.test(p)) return null;
    if (APP_BASE && (p === APP_BASE || p.startsWith(`${APP_BASE}/`))) p = p.slice(APP_BASE.length) || '/';
    if (!p.startsWith('/') || p.startsWith('//')) return null;
    return ALLOWED.test(p) ? p : null;
}

/** The current location as a return path (or null outside the app screens). */
export function currentReturnPath() {
    if (typeof window === 'undefined') return null;
    const { pathname, search, hash } = window.location;
    return safeReturnPath(`${pathname}${search}${hash}`);
}
