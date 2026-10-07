import { apiV1Client } from './http';
import { setAuthSession, getRefreshToken } from '../lib/authStorage';

export const authApi = {
    login: async (email, password) => {
        const response = await apiV1Client.post('/auth/login', { email, password }, { skipAuth: true });
        setAuthSession(response.data);
        return response.data;
    },

    register: async (payload) => {
        const response = await apiV1Client.post('/auth/register', payload, { skipAuth: true });
        setAuthSession(response.data);
        return response.data;
    },

    me: async () => {
        const response = await apiV1Client.get('/auth/me');
        return response.data;
    },

    logout: async () => {
        const refreshToken = getRefreshToken();
        if (!refreshToken) return;
        await apiV1Client.post('/auth/logout', { refresh_token: refreshToken });
    },

    googleAuthUrl: async () => {
        const response = await apiV1Client.get('/auth/google', { skipAuth: true });
        return response.data;
    },

    googleCallback: async (credential) => {
        const response = await apiV1Client.post('/auth/google/callback', { credential }, { skipAuth: true });
        setAuthSession(response.data);
        return response.data;
    },

    forgotPassword: async (email) => {
        const response = await apiV1Client.post('/auth/forgot-password', { email }, { skipAuth: true });
        return response.data;
    },

    resetPassword: async (token, newPassword) => {
        const response = await apiV1Client.post(
            '/auth/reset-password',
            { token, new_password: newPassword },
            { skipAuth: true },
        );
        return response.data;
    },

    magicLogin: async (token) => {
        const response = await apiV1Client.post('/auth/magic-login', { token }, { skipAuth: true });
        setAuthSession(response.data);
        return response.data;
    },

    changePassword: async (currentPassword, newPassword) => {
        const response = await apiV1Client.put('/auth/me/password', {
            current_password: currentPassword,
            new_password: newPassword,
        });
        return response.data;
    },

    updateProfile: async (payload) => {
        const response = await apiV1Client.put('/auth/me', payload);
        return response.data;
    },
};

export default authApi;
