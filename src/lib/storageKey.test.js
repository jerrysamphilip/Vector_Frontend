import { afterEach, describe, expect, it, vi } from 'vitest';

// The app can run next to another app on the same origin (e.g. at /vector/). localStorage is shared
// per origin, so this app must never read, overwrite or delete the other app's plain-named values.
async function loadAt(base) {
    vi.resetModules();
    vi.stubEnv('BASE_URL', base);
    return {
        keys: await import('./storageKey'),
        auth: await import('./authStorage'),
    };
}

afterEach(() => { vi.unstubAllEnvs(); localStorage.clear(); });

describe('storageKey', () => {
    it('prefixes every name with the app and its base path', async () => {
        const { keys, auth } = await loadAt('/vector/');
        expect(keys.storageKey('user')).toBe('outreach360:/vector:user');
        expect(auth.USER_KEY).toBe('outreach360:/vector:user');
        expect(keys.OWNS_ROOT_STORAGE).toBe(false);
    });

    it('under a sub-path, signing in and out leaves the other app\'s plain keys alone', async () => {
        localStorage.setItem('access_token', 'other-app-token');
        localStorage.setItem('user', '{"first_name":"Other"}');
        localStorage.setItem('user_name', 'Other');
        const { auth } = await loadAt('/vector/');   // module load runs the legacy-token cleanup
        auth.setAuthSession({ user: { first_name: 'Ann' }, first_login: true });
        expect(auth.getStoredUser()).toEqual({ first_name: 'Ann' });
        auth.clearAuthSession();
        expect(auth.getStoredUser()).toBeNull();
        expect(localStorage.getItem('access_token')).toBe('other-app-token');
        expect(localStorage.getItem('user')).toBe('{"first_name":"Other"}');
        expect(localStorage.getItem('user_name')).toBe('Other');
    });

    it('a plain "user" value from another app does not count as signed in here', async () => {
        localStorage.setItem('user', '{"first_name":"Other","role":"SUPER_ADMIN"}');
        const { auth } = await loadAt('/vector/');
        expect(auth.isAuthenticated()).toBe(false);
        expect(auth.hasPermission('export_data')).toBe(false);
    });

    it('at the origin root it still removes tokens left by earlier builds', async () => {
        localStorage.setItem('access_token', 'old-build-token');
        const { keys } = await loadAt('/');
        await import('./authStorage');
        expect(keys.OWNS_ROOT_STORAGE).toBe(true);
        expect(localStorage.getItem('access_token')).toBeNull();
    });
});
