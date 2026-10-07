import axios from 'axios';
import {
    getAccessToken,
    getRefreshToken,
    setAuthSession,
    clearAuthSession,
} from '../lib/authStorage';

const API_BASE = '/api';
const API_V1_BASE = '/api/api';

let refreshPromise = null;

function redirectToLogin() {
    if (typeof window === 'undefined') return;
    if (window.location.pathname !== '/login') {
        window.location.assign('/login');
    }
}

async function refreshAccessToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        clearAuthSession();
        redirectToLogin();
        throw new Error('No refresh token available');
    }

    const response = await axios.post(
        `${API_V1_BASE}/auth/refresh`,
        { refresh_token: refreshToken },
        {
            headers: { 'Content-Type': 'application/json' },
        },
    );

    setAuthSession(response.data);
    return response.data.access_token;
}

function attachAuthInterceptors(client) {
    client.interceptors.request.use((config) => {
        if (!config.skipAuth) {
            const token = getAccessToken();
            if (token) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    });

    client.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error?.config;
            const status = error?.response?.status;

            if (!originalRequest || originalRequest.skipAuth || status !== 401 || originalRequest._retry) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            try {
                if (!refreshPromise) {
                    refreshPromise = refreshAccessToken().finally(() => {
                        refreshPromise = null;
                    });
                }

                const newAccessToken = await refreshPromise;
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                return client(originalRequest);
            } catch (refreshError) {
                clearAuthSession();
                redirectToLogin();
                return Promise.reject(refreshError);
            }
        },
    );
}

export const apiClient = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const apiV1Client = axios.create({
    baseURL: API_V1_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

attachAuthInterceptors(apiClient);
attachAuthInterceptors(apiV1Client);
