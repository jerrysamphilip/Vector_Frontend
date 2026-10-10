import axios from 'axios';
import { clearAuthSession, getCsrfToken, setAuthSession, updateStoredUser } from '../lib/authStorage';

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

function redirectToLogin() {
    if (typeof window === 'undefined') return;
    if (window.location.pathname !== LOGIN_PATH) {
        window.location.assign(LOGIN_PATH);
    }
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
    const response = await axios.post(`${API_V1_BASE}/auth/refresh`, null, withCsrf({ ...COMMON, method: 'post', headers: { ...COMMON.headers } }));
    setAuthSession({ user: response.data?.user });
    return response.data;
}

/** FastAPI errors: a validation list becomes text; {code, message} becomes detail text + data.code. */
function normalizeError(error) {
    const data = error?.response?.data;
    if (!data) return;
    if (Array.isArray(data.detail)) {
        data.detail = data.detail.map(d => (d?.loc ? `${d.loc.filter(l => l !== 'body').join('.')}: ${d.msg}` : d?.msg || String(d))).join('; ');
    } else if (data.detail && typeof data.detail === 'object') {
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
                clearAuthSession();
                redirectToLogin();
                return Promise.reject(refreshError);
            }
        },
    );
}

export const apiClient = axios.create({ ...COMMON, baseURL: API_BASE });

export const apiV1Client = axios.create({ ...COMMON, baseURL: API_V1_BASE });

attachAuthInterceptors(apiClient);
attachAuthInterceptors(apiV1Client);
