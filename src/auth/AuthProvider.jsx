// One auth context for the app (F4). The signed-in user comes from GET /api/auth/me through react-query
// (one key: AUTH_QUERY_KEY); the session itself lives in httpOnly cookies the API sets (CSRF double-submit,
// refresh rotation, idle and absolute limits: backend ADR 0007). Nothing here ever sees a token.
//
//   const { user, status, hasPermission, hasRole, login, verifyMfa, logout } = useAuth();
//   status: 'loading' | 'signed-in' | 'signed-out' | 'mfa-required'
//
// lib/authStorage keeps a copy of the user in localStorage for first paint and for the few modules that read
// it synchronously; it is a mirror the provider writes, never the source of truth (and never holds tokens).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { refreshSessionOnce, waitForRefresh } from '../api/http';
import { recordInteraction, resetActivity, SESSION_IDLE_MINUTES } from '../api/activity';
import { clearAuthSession, consumeFirstLogin, getCsrfToken, getStoredUser, setAuthSession, USER_KEY } from '../lib/authStorage';
import { useToast } from '../components/ui/Toast';
import { ADMIN_ROLES, userHasPermission, userHasRole } from './permissions';
import { markSessionActive, markSessionEnded, subscribeSession } from './sessionEvents';
import { useIdleTimeout } from './useIdleTimeout';
import IdleWarning from './IdleWarning';

export const AUTH_QUERY_KEY = ['auth', 'me'];
const ME_STALE_MS = 5 * 60 * 1000;

export const SIGNED_OUT_NOTICES = {
    expired: 'Session expired, please sign in again to continue where you left off.',
    idle: `Signed out after ${SESSION_IDLE_MINUTES} minutes of inactivity.`,
    suspended: 'Your workspace is suspended. Contact your administrator to restore access.',
};

const AuthContext = createContext(null);

const isAuthQuery = (query) => query.queryKey[0] === AUTH_QUERY_KEY[0];

function sameUser(a, b) {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function buildHelpers(user) {
    return {
        hasPermission: (permission) => userHasPermission(user, permission),
        hasRole: (...roles) => userHasRole(user, ...roles),
        isAdmin: userHasRole(user, ADMIN_ROLES),
        isPlatformAdmin: userHasRole(user, 'PLATFORM_ADMIN'),
    };
}

/**
 * options (tests): idleTimeout (true) turns the inactivity warning / sign-out on.
 */
export function AuthProvider({ children, idleTimeout = true }) {
    const queryClient = useQueryClient();
    const toast = useToast();
    // Probe the cookie session only when there may be one (a cached user or the readable CSRF cookie);
    // otherwise the login page would cost a 401 + a refused refresh on every visit.
    const [probe, setProbe] = useState(() => Boolean(getStoredUser() || getCsrfToken()));
    const [mfa, setMfa] = useState(null); // { token } while the second sign-in step is pending
    const [endReason, setEndReason] = useState(null);

    const query = useQuery({
        queryKey: AUTH_QUERY_KEY,
        queryFn: async () => (await authApi.me()) || null,
        enabled: probe,
        // First paint from the cached user; still stale (updatedAt 0), so it is confirmed with the API at once
        initialData: () => getStoredUser() || undefined,
        initialDataUpdatedAt: 0,
        staleTime: ME_STALE_MS,
        retry: false,
        refetchOnWindowFocus: false,
    });
    const user = query.data || null;

    // Mirror for first paint / synchronous readers
    useEffect(() => {
        if (user) {
            if (!sameUser(getStoredUser(), user)) setAuthSession({ user });
        }
    }, [user]);

    const dropUserData = useCallback(() => {
        // After the protected tree unmounted: don't leave this user's data cached for the next sign-in
        setTimeout(() => queryClient.removeQueries({ predicate: (q) => !isAuthQuery(q) }), 0);
    }, [queryClient]);

    /** Local end of the session (after a refused refresh, sign-out, suspension, idle limit). */
    const endLocally = useCallback((reason, { notify = true } = {}) => {
        const wasSignedIn = Boolean(queryClient.getQueryData(AUTH_QUERY_KEY));
        markSessionEnded();
        clearAuthSession();
        resetActivity();
        setMfa(null);
        setProbe(false);
        setEndReason(reason || null);
        queryClient.setQueryData(AUTH_QUERY_KEY, null);
        dropUserData();
        if (notify && wasSignedIn && reason) {
            toast.info(SIGNED_OUT_NOTICES[reason] || SIGNED_OUT_NOTICES.expired, {
                title: reason === 'suspended' ? 'Workspace suspended' : 'Signed out',
            });
        }
    }, [queryClient, toast, dropUserData]);

    // Events from the HTTP layer (api/http.js) and from other tabs
    useEffect(() => subscribeSession((event) => {
        if (event.type === 'ended') endLocally(event.reason);
        else if (event.type === 'refreshed' && event.user) {
            queryClient.setQueryData(AUTH_QUERY_KEY, (prev) => (prev ? { ...prev, ...event.user } : prev));
        } else if (event.type === 'mfa-setup-required') {
            queryClient.setQueryData(AUTH_QUERY_KEY, (prev) => (prev ? { ...prev, mfa_setup_required: true } : prev));
        }
    }), [endLocally, queryClient]);

    useEffect(() => {
        // updateStoredUser() (e.g. two-factor enabled on AccountSecurity) and changes in other tabs
        const adoptCached = () => {
            const cached = getStoredUser();
            const current = queryClient.getQueryData(AUTH_QUERY_KEY);
            if (cached && current && !sameUser(cached, current)) queryClient.setQueryData(AUTH_QUERY_KEY, cached);
        };
        const onStorage = (e) => {
            if (e.key !== USER_KEY && e.key !== null) return;
            // Signed out in another tab: the shared cookies are gone, sign out here too (quietly)
            if (!getStoredUser() && queryClient.getQueryData(AUTH_QUERY_KEY)) endLocally(null, { notify: false });
            else adoptCached();
        };
        window.addEventListener('auth-user-changed', adoptCached);
        window.addEventListener('storage', onStorage);
        return () => {
            window.removeEventListener('auth-user-changed', adoptCached);
            window.removeEventListener('storage', onStorage);
        };
    }, [queryClient, endLocally]);

    /** A sign-in response arrived: the user, or { mfa_required, mfa_token } for the second step. */
    const acceptSignIn = useCallback((data) => {
        if (data?.mfa_required) {
            setMfa({ token: data.mfa_token });
            return { ...data, mfaRequired: true };
        }
        markSessionActive();
        // Another user may have been signed in before: nothing of theirs stays cached
        queryClient.removeQueries({ predicate: (q) => !isAuthQuery(q) });
        setMfa(null);
        setEndReason(null);
        setProbe(true);
        const signedInUser = data?.user || null;
        if (signedInUser) setAuthSession({ user: signedInUser });
        queryClient.setQueryData(AUTH_QUERY_KEY, signedInUser);
        recordInteraction(Date.now());
        // authApi stored the first_login flag (lib/authStorage); read it once
        const firstLogin = consumeFirstLogin() || Boolean(data?.first_login);
        return { ...data, mfaRequired: false, firstLogin };
    }, [queryClient]);

    const signInWith = useCallback(async (request) => acceptSignIn(await request()), [acceptSignIn]);
    const login = useCallback((email, password) => signInWith(() => authApi.login(email, password)), [signInWith]);
    const verifyMfa = useCallback(({ code, recoveryCode } = {}) => {
        if (!mfa?.token) return Promise.reject(new Error('No two-factor sign-in in progress'));
        return signInWith(() => authApi.verifyMfa(mfa.token, { code, recoveryCode }));
    }, [mfa, signInWith]);
    const cancelMfa = useCallback(() => setMfa(null), []);

    /** Revoke the session server side (refresh + access token), then sign out here. */
    const logout = useCallback(async ({ reason = null } = {}) => {
        // Never present a refresh token that an in-flight refresh is rotating (reuse detection)
        await waitForRefresh();
        try { await authApi.logout(); } catch { /* signed out locally anyway */ }
        endLocally(reason);
    }, [endLocally]);

    /** Exchange the refresh token now (single-flight with the HTTP layer), reporting user activity. */
    const refresh = useCallback(async () => {
        await refreshSessionOnce();
        return queryClient.getQueryData(AUTH_QUERY_KEY);
    }, [queryClient]);

    const refetchUser = useCallback(() => queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY }), [queryClient]);
    const updateUser = useCallback((patch) => {
        queryClient.setQueryData(AUTH_QUERY_KEY, (prev) => (prev ? { ...prev, ...patch } : prev));
    }, [queryClient]);

    const status = mfa ? 'mfa-required'
        : user ? 'signed-in'
            : probe && query.isPending ? 'loading'
                : 'signed-out';

    const idle = useIdleTimeout({
        enabled: idleTimeout && status === 'signed-in',
        onTimeout: () => logout({ reason: 'idle' }),
    });
    const staySignedIn = useCallback(async () => {
        recordInteraction(Date.now());
        idle.dismiss();
        try { await refresh(); } catch { /* a refused refresh already ended the session */ }
    }, [idle, refresh]);

    const value = useMemo(() => ({
        user,
        status,
        isSignedIn: status === 'signed-in',
        endReason,
        mfaPending: Boolean(mfa),
        ...buildHelpers(user),
        login,
        verifyMfa,
        cancelMfa,
        signInWith,
        acceptSignIn,
        logout,
        refresh,
        refetchUser,
        updateUser,
    }), [user, status, endReason, mfa, login, verifyMfa, cancelMfa, signInWith, acceptSignIn, logout, refresh, refetchUser, updateUser]);

    return (
        <AuthContext.Provider value={value}>
            {children}
            {idle.warningUntil && (
                <IdleWarning until={idle.warningUntil} onStay={staySignedIn} onSignOut={() => logout()} />
            )}
        </AuthContext.Provider>
    );
}

const notMounted = () => Promise.reject(new Error('AuthProvider is not mounted'));

/** Read-only fallback from the cached user (isolated component tests without a provider). */
function fallbackAuth() {
    const user = getStoredUser();
    return {
        user,
        status: user ? 'signed-in' : 'signed-out',
        isSignedIn: Boolean(user),
        endReason: null,
        mfaPending: false,
        ...buildHelpers(user),
        login: notMounted, verifyMfa: notMounted, signInWith: notMounted, logout: notMounted, refresh: notMounted,
        cancelMfa: () => {}, acceptSignIn: (data) => data, refetchUser: () => Promise.resolve(), updateUser: () => {},
    };
}

/** The auth context: user, status, permission / role helpers and the sign-in / sign-out actions. */
export function useAuth() {
    const ctx = useContext(AuthContext);
    const fallback = useRef(null);
    if (ctx) return ctx;
    if (!fallback.current) fallback.current = fallbackAuth();
    return fallback.current;
}

export default AuthProvider;
