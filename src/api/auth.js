import { apiV1Client } from './http';
import { setAuthSession } from '../lib/authStorage';

// Sign-in responses carry only the user: the API sets the session as httpOnly cookies.
// When the account has two-factor on, they carry { mfa_required: true, mfa_token } instead and
// the sign-in finishes with verifyMfa().
function signedIn(data) {
    if (!data?.mfa_required) setAuthSession(data);
    return data;
}

export const authApi = {
    login: async (email, password) => {
        const response = await apiV1Client.post('/auth/login', { email, password }, { skipAuth: true });
        return signedIn(response.data);
    },

    verifyMfa: async (mfaToken, { code, recoveryCode } = {}) => {
        const response = await apiV1Client.post(
            '/auth/mfa/verify',
            { mfa_token: mfaToken, code: code || null, recovery_code: recoveryCode || null },
            { skipAuth: true },
        );
        return signedIn(response.data);
    },

    register: async (payload) => {
        const response = await apiV1Client.post('/auth/register', payload, { skipAuth: true });
        return signedIn(response.data);
    },

    me: async () => {
        const response = await apiV1Client.get('/auth/me');
        return response.data;
    },

    /** The current session (user + two-factor state); 401 when signed out. */
    session: async () => {
        const response = await apiV1Client.get('/auth/session');
        if (response.data?.user) setAuthSession({ user: response.data.user });
        return response.data;
    },

    logout: async () => {
        await apiV1Client.post('/auth/logout', null, { skipAuth: true });
    },

    googleAuthUrl: async () => {
        const response = await apiV1Client.get('/auth/google', { skipAuth: true });
        return response.data;
    },

    googleCallback: async (credential) => {
        const response = await apiV1Client.post('/auth/google/callback', { credential }, { skipAuth: true });
        return signedIn(response.data);
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
        return signedIn(response.data);
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

    // ── Two-factor ──
    mfaSetup: async () => (await apiV1Client.post('/auth/mfa/setup')).data,
    mfaEnable: async (code) => (await apiV1Client.post('/auth/mfa/enable', { code })).data,
    mfaDisable: async ({ password, code, recoveryCode }) => (await apiV1Client.post('/auth/mfa/disable', {
        password: password || null, code: code || null, recovery_code: recoveryCode || null,
    })).data,
    mfaRegenerateRecoveryCodes: async (code) => (await apiV1Client.post('/auth/mfa/recovery-codes', { code })).data,
    mfaSetTenantPolicy: async (requireMfa) => (await apiV1Client.put('/auth/mfa/tenant-policy', { require_mfa: requireMfa })).data,
};

export default authApi;
