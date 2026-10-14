import axios from 'axios';
import { clearAuthSession, getCsrfToken, setAuthSession, updateStoredUser } from '../lib/authStorage';
import { currentReturnPath } from '../lib/returnTo';
import { activityHeaders, startActivityTracking } from './activity';

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

let refreshPromise = null;

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
    setAuthSession({ user: response.data?.user });
    return response.data;
}

/** FastAPI errors: a validation list becomes text; {code, message} becomes detail text + data.code. */
export function normalizeError(error) {
    const data = error?.response?.data;
    if (!data) return;
    if (Array.isArray(data.detail)) {
        data.detail = data.detail.map(d => (d?.loc ? `${d.loc.filter(l => l !== 'body').join('.')}: ${d.msg}` : d?.msg || String(d))).join('; ');
    } else if (data.detail && typeof data.detail === 'object') {
        data.detail_data = data.detail; // keep the structured detail (e.g. {prospect_id}, {lead_id}) for callers
        data.code = data.detail.code;
        data.detail = data.detail.message || data.detail.code || 'Request failed';
    }
}

function attachAuthInterceptors(client) {
    client.interceptors.request.use(withCsrf);

    client.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error?.config;
            const status = error?.response?.status;
            normalizeError(error);

            if (status === 403 && error?.response?.data?.code === 'MFA_SETUP_REQUIRED') {
                updateStoredUser({ mfa_setup_required: true });
                redirectToSecurity();
                return Promise.reject(error);
            }

            // Workspace suspended mid-session: end the session and say why on the login page
            if (isTenantSuspended(error) && !originalRequest?.skipAuth) {
                clearAuthSession();
                redirectToLogin('suspended');
                return Promise.reject(error);
            }

            if (!originalRequest || originalRequest.skipAuth || status !== 401 || originalRequest._retry) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            try {
                if (!refreshPromise) {
                    refreshPromise = refreshSession().finally(() => {
                        refreshPromise = null;
                    });
                }
                await refreshPromise;
                // The refresh issued a new csrf_token cookie; send the current one on the retry
                return client(withCsrf(originalRequest));
            } catch (refreshError) {
                const code = refreshErrorCode(refreshError);
                // Another tab exchanged the same refresh token a moment earlier; the shared cookies
                // already hold the new session, so just retry with them.
                if (code === REFRESH_TOKEN_SUPERSEDED) {
                    return client(withCsrf(originalRequest));
                }
                clearAuthSession();
                const reason = isTenantSuspended(refreshError) ? 'suspended'
                    : code === SESSION_IDLE_TIMEOUT ? 'idle' : 'expired';
                redirectToLogin(reason);
                return Promise.reject(refreshError);
            }
        },
    );
}

export const apiClient = axios.create({ ...COMMON, baseURL: API_BASE });

export const apiV1Client = axios.create({ ...COMMON, baseURL: API_V1_BASE });

attachAuthInterceptors(apiClient);
attachAuthInterceptors(apiV1Client);
