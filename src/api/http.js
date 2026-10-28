import axios from 'axios';
import { clearAuthSession, getCsrfToken, setAuthSession, updateStoredUser } from '../lib/authStorage';
import { currentReturnPath } from '../lib/returnTo';
import { activityHeaders, startActivityTracking } from './activity';
import { isSessionEnded, markSessionActive, reportSession } from '../auth/sessionEvents';

// BASE_URL is Vite's `base` ('/' by default, e.g. '/vector/' when served under a path prefix)
const APP_BASE = import.meta.env.BASE_URL;
const API_BASE = `${APP_BASE}api`;
const API_V1_BASE = `${APP_BASE}api/api`;
const LOGIN_PATH = `${APP_BASE}login`;
export const SECURITY_PATH = '/app/account/security';
const SAFE_METHODS = ['get', 'head', 'options'];

// The session lives in httpOnly cookies. "X-Auth-Mode: cookie" asks the API to set them on sign-in
// and refresh (and to keep tokens out of response bodies); state-changing requests echo the
// readable csrf_token cookie in X-CSRF-Token.
const COMMON = {
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'X-Auth-Mode': 'cookie',
    },
};

// Single-flight refresh (backend refresh rotation with reuse detection: presenting an already rotated
// refresh token revokes the whole session, so this tab never runs two refreshes at once). While one is in
// flight, new requests wait for it and every 401 joins it. `sessionGeneration` counts completed refreshes:
// a 401 for a request sent before the latest refresh is retried with the new cookies, not refreshed again.
let refreshPromise = null;
let sessionGeneration = 0;

// User interaction is what keeps a session alive (idle timeout); polling is not. See activity.js.
startActivityTracking();

// Refresh refusals the API explains with a code (backend app/services/session_limits.py)
const SESSION_IDLE_TIMEOUT = 'SESSION_IDLE_TIMEOUT';
const REFRESH_TOKEN_SUPERSEDED = 'REFRESH_TOKEN_SUPERSEDED';

function refreshErrorCode(error) {
    const detail = error?.response?.data?.detail;
    return detail && typeof detail === 'object' ? detail.code : undefined;
}

/**
 * Full-page redirect to the login page, keeping the page in use (path + query + hash) in ?next= so signing in
 * again returns there (validated as an internal /app or /admin path by Login, see lib/returnTo.js).
 * reason: 'expired' (session could not be refreshed: absolute session limit, revoked, ...), 'idle' (signed out
 * after the inactivity limit) or 'suspended' (the workspace was suspended); Login shows it.
 */
function redirectToLogin(reason) {
    if (typeof window === 'undefined') return;
    if (window.location.pathname === LOGIN_PATH) return;
    const params = new URLSearchParams();
    const next = currentReturnPath();
    if (next) params.set('next', next);
    if (reason) params.set('reason', reason);
    const query = params.toString();
    window.location.assign(query ? `${LOGIN_PATH}?${query}` : LOGIN_PATH);
}

/** 403 "Tenant suspended": the user's workspace was suspended by the platform admin (app/core/auth.py). */
export function isTenantSuspended(error) {
    return error?.response?.status === 403 && /^tenant suspended$/i.test(String(error?.response?.data?.detail || '').trim());
}

function redirectToSecurity() {
    if (typeof window === 'undefined') return;
    const target = `${APP_BASE.replace(/\/$/, '')}${SECURITY_PATH}`;
    if (window.location.pathname !== target) {
        window.location.assign(target);
    }
}

function withCsrf(config) {
    const method = (config.method || 'get').toLowerCase();
    if (!SAFE_METHODS.includes(method)) {
        const csrf = getCsrfToken();
        if (csrf) {
            config.headers = config.headers || {};
            config.headers['X-CSRF-Token'] = csrf;
        }
    }
    return config;
}

async function refreshSession() {
    // X-User-Activity only when the user interacted within the idle window: a refresh triggered by
    // background polling alone does not extend the session.
    const headers = { ...COMMON.headers, ...activityHeaders() };
    const response = await axios.post(`${API_V1_BASE}/auth/refresh`, null, withCsrf({ ...COMMON, method: 'post', headers }));
    sessionGeneration += 1;
    markSessionActive();
    const user = response.data?.user;
    setAuthSession({ user });
    if (user) reportSession({ type: 'refreshed', user });
    return response.data;
}

/** Refresh the session, joining the refresh already in flight if there is one (never two at once). */
export function refreshSessionOnce() {
    if (!refreshPromise) {
        refreshPromise = refreshSession().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}

/** Resolves once no refresh is in flight (whatever its outcome). Sign-out waits for it so it revokes the latest token. */
export async function waitForRefresh() {
    while (refreshPromise) {
        try { await refreshPromise; } catch { /* the caller only waits */ }
    }
}

/**
 * The session is over (refresh refused, workspace suspended): drop the cached user and tell the
 * AuthProvider (signed-out + notice); without one, a full-page redirect to the login page.
 */
function endSession(reason) {
    clearAuthSession();
    if (!reportSession({ type: 'ended', reason })) redirectToLogin(reason);
}

/** FastAPI errors: a validation list becomes text; {code, message} becomes detail text + data.code. */
export function normalizeError(error) {
    const data = error?.response?.data;
    if (!data) return;
    if (Array.isArray(data.detail)) {
        data.detail_list = data.detail; // keep FastAPI's per-field list for forms (serverFieldErrors)
        data.detail = data.detail.map(d => (d?.loc ? `${d.loc.filter(l => l !== 'body').join('.')}: ${d.msg}` : d?.msg || String(d))).join('; ');
    } else if (data.detail && typeof data.detail === 'object') {
        data.detail_data = data.detail; // keep the structured detail (e.g. {prospect_id}, {lead_id}) for callers
        data.code = data.detail.code;
        data.detail = data.detail.message || data.detail.code || 'Request failed';
    }
}

async function beforeRequest(config) {
    // Requests started while a refresh is in flight wait for it (they would carry the old access cookie)
    if (refreshPromise && !config.skipAuth) {
        try { await refreshPromise; } catch { /* their own 401 handling decides */ }
    }
    config._sessionGen = sessionGeneration;
    return withCsrf(config);
}

function attachAuthInterceptors(client) {
    client.interceptors.request.use(beforeRequest);

    client.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error?.config;
            const status = error?.response?.status;
            normalizeError(error);

            if (status === 403 && error?.response?.data?.code === 'MFA_SETUP_REQUIRED') {
                updateStoredUser({ mfa_setup_required: true });
                if (!reportSession({ type: 'mfa-setup-required' })) redirectToSecurity();
                return Promise.reject(error);
            }

            // Workspace suspended mid-session: end the session and say why on the login page
            if (isTenantSuspended(error) && !originalRequest?.skipAuth) {
                endSession('suspended');
                return Promise.reject(error);
            }

            // No refresh for: sign-in requests, non-401s, a request already retried, an aborted request
            // (nobody wants its answer, W-9) and a session that already ended (its refresh token is dead).
            if (!originalRequest || originalRequest.skipAuth || status !== 401 || originalRequest._retry
                || originalRequest.signal?.aborted || isSessionEnded()) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            // Sent before the latest refresh finished: the cookies are already new, just retry
            if (originalRequest._sessionGen !== undefined && originalRequest._sessionGen !== sessionGeneration) {
                return client(originalRequest);
            }

            try {
                await refreshSessionOnce();
                // The retry goes through beforeRequest again: it sends the new csrf_token cookie
                return client(originalRequest);
            } catch (refreshError) {
                const code = refreshErrorCode(refreshError);
                // Another tab exchanged the same refresh token a moment earlier; the shared cookies
                // already hold the new session, so just retry with them.
                if (code === REFRESH_TOKEN_SUPERSEDED) {
                    return client(originalRequest);
                }
                normalizeError(refreshError);
                const reason = isTenantSuspended(refreshError) ? 'suspended'
                    : code === SESSION_IDLE_TIMEOUT ? 'idle' : 'expired';
                endSession(reason);
                return Promise.reject(refreshError);
            }
        },
    );
}

// ── Request cancellation (W-9) ─────────────────────────────────────────────────────────────────────
// A read that is no longer wanted (the query key changed, the page was left) is aborted with the AbortSignal
// react-query hands to the query function (lib/useApiQuery.js). Callers can pass `signal` in the axios config
// themselves; runWithSignal() also hands it to every request the API helpers (src/api/*.js) *start
// synchronously* inside fn, so the helpers need no extra parameter. A request started after an `await`
// inside a helper (e.g. page 2 of campaignApi.listAll) does not see it; its late answer is still dropped by
// useApiQuery. An aborted request rejects with axios' CanceledError (isRequestCanceled), never refreshes the
// session and is never shown as an error.
let ambientSignal = null;

/** Run fn() so that the requests it starts synchronously carry `signal` (unless they pass their own). */
export function runWithSignal(signal, fn) {
    const previous = ambientSignal;
    ambientSignal = signal || null;
    try {
        return fn();
    } finally {
        ambientSignal = previous;
    }
}

/** True for a request aborted through its AbortSignal (or axios' own cancel). Not an error to show. */
export function isRequestCanceled(error) {
    return axios.isCancel(error) || error?.name === 'CanceledError' || error?.name === 'AbortError' || error?.code === 'ERR_CANCELED';
}

function withAmbientSignal(config) {
    if (!ambientSignal || (config && config.signal)) return config;
    return { ...(config || {}), signal: ambientSignal };
}

function attachSignalSupport(client) {
    ['get', 'delete', 'head', 'options'].forEach((method) => {
        const original = client[method];
        client[method] = (url, config) => original(url, withAmbientSignal(config));
    });
    ['post', 'put', 'patch'].forEach((method) => {
        const original = client[method];
        client[method] = (url, data, config) => original(url, data, withAmbientSignal(config));
    });
}

export const apiClient = axios.create({ ...COMMON, baseURL: API_BASE });

export const apiV1Client = axios.create({ ...COMMON, baseURL: API_V1_BASE });

attachAuthInterceptors(apiClient);
attachAuthInterceptors(apiV1Client);
attachSignalSupport(apiClient);
attachSignalSupport(apiV1Client);
