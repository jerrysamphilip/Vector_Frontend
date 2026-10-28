// F4: single-flight refresh, CSRF on unsafe methods, refresh failure → signed out through the session bridge.
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, apiV1Client, refreshSessionOnce, waitForRefresh } from './http';
import { isSessionEnded, subscribeSession } from '../auth/sessionEvents';

const httpError = (status, data, config = {}) => {
    const error = new Error(`Request failed with status code ${status}`);
    error.config = config;
    error.response = { status, data, headers: {}, config };
    return error;
};
const ok = (config, data = { ok: true }) => Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config });

/** A refresh the test settles by hand. */
function deferredRefresh() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    const spy = vi.spyOn(axios, 'post').mockImplementation(() => promise);
    return { spy, resolve, reject };
}

describe('session refresh (F4)', () => {
    let assign;
    let unsubscribe = () => {};

    beforeEach(() => {
        assign = vi.fn();
        vi.stubGlobal('location', { pathname: '/app/deals', search: '', hash: '', assign });
    });

    afterEach(() => {
        unsubscribe();
        unsubscribe = () => {};
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        delete apiClient.defaults.adapter;
        delete apiV1Client.defaults.adapter;
    });

    it('runs one refresh for concurrent 401s and retries every request after it', async () => {
        const refresh = deferredRefresh();
        const seen = {};
        apiClient.defaults.adapter = (config) => {
            seen[config.url] = (seen[config.url] || 0) + 1;
            if (seen[config.url] === 1) return Promise.reject(httpError(401, { detail: 'expired' }, config));
            return ok(config, { url: config.url });
        };
        const all = Promise.all(['/a', '/b', '/c'].map((u) => apiClient.get(u)));
        await vi.waitFor(() => expect(Object.keys(seen)).toHaveLength(3));
        await Promise.resolve();
        expect(refresh.spy).toHaveBeenCalledTimes(1);
        refresh.resolve({ data: { user: { first_name: 'Bo' } } });
        const results = await all;
        expect(results.map((r) => r.data.url)).toEqual(['/a', '/b', '/c']);
        expect(refresh.spy).toHaveBeenCalledTimes(1); // never a second refresh (rotation reuse would revoke the session)
        expect(seen).toEqual({ '/a': 2, '/b': 2, '/c': 2 });
    });

    it('holds requests started during a refresh until it finishes', async () => {
        const refresh = deferredRefresh();
        const order = [];
        apiClient.defaults.adapter = (config) => {
            order.push(config.url);
            if (config.url === '/first' && order.length === 1) return Promise.reject(httpError(401, {}, config));
            return ok(config);
        };
        const first = apiClient.get('/first');
        await vi.waitFor(() => expect(refresh.spy).toHaveBeenCalledTimes(1));
        const later = apiClient.get('/later');
        await new Promise((r) => setTimeout(r, 10));
        expect(order).toEqual(['/first']); // /later waits for the refresh
        refresh.resolve({ data: {} });
        await Promise.all([first, later]);
        expect(order.slice(1).sort()).toEqual(['/first', '/later']);
        expect(refresh.spy).toHaveBeenCalledTimes(1);
    });

    it('refreshSessionOnce joins the refresh in flight; waitForRefresh waits for it', async () => {
        const refresh = deferredRefresh();
        const a = refreshSessionOnce();
        const b = refreshSessionOnce();
        expect(a).toBe(b);
        let waited = false;
        const wait = waitForRefresh().then(() => { waited = true; });
        await Promise.resolve();
        expect(waited).toBe(false);
        refresh.resolve({ data: {} });
        await Promise.all([a, wait]);
        expect(waited).toBe(true);
        expect(refresh.spy).toHaveBeenCalledTimes(1);
    });

    it('a 401 for a request sent before the latest refresh retries without refreshing again', async () => {
        const refresh = deferredRefresh();
        let releaseSlow;
        const calls = [];
        apiClient.defaults.adapter = (config) => {
            calls.push(config.url);
            if (config.url === '/slow' && calls.filter((u) => u === '/slow').length === 1) {
                return new Promise((_, rej) => { releaseSlow = () => rej(httpError(401, {}, config)); });
            }
            if (config.url === '/fast' && calls.filter((u) => u === '/fast').length === 1) return Promise.reject(httpError(401, {}, config));
            return ok(config);
        };
        const slow = apiClient.get('/slow');
        const fast = apiClient.get('/fast');
        await vi.waitFor(() => expect(refresh.spy).toHaveBeenCalledTimes(1));
        refresh.resolve({ data: {} });
        await fast;
        releaseSlow(); // its 401 arrives after the refresh finished
        await slow;
        expect(refresh.spy).toHaveBeenCalledTimes(1);
    });

    it('sends the CSRF cookie on unsafe methods (also on the retry after a refresh) and never on reads', async () => {
        document.cookie = 'csrf_token=old; path=/';
        vi.spyOn(axios, 'post').mockImplementation(async () => {
            document.cookie = 'csrf_token=new; path=/'; // the refresh rotates the CSRF cookie
            return { data: {} };
        });
        const sent = [];
        apiV1Client.defaults.adapter = (config) => {
            sent.push([config.method, config.headers['X-CSRF-Token']]);
            if (sent.length === 2) return Promise.reject(httpError(401, {}, config));
            return ok(config);
        };
        await apiV1Client.get('/x');
        await apiV1Client.patch('/y', {});
        expect(sent).toEqual([['get', undefined], ['patch', 'old'], ['patch', 'new']]);
        for (const method of ['put', 'post', 'delete']) {
            sent.length = 3;
            await apiV1Client[method]('/z', method === 'delete' ? undefined : {});
            expect(sent[3]).toEqual([method, 'new']);
        }
    });

    it('a refused refresh reports "ended" to the AuthProvider (no full-page redirect) and stops refreshing', async () => {
        const events = [];
        unsubscribe = subscribeSession((e) => events.push(e));
        const refresh = vi.spyOn(axios, 'post').mockRejectedValue(httpError(401, { detail: { code: 'SESSION_EXPIRED', message: 'x' } }));
        apiClient.defaults.adapter = (config) => Promise.reject(httpError(401, { detail: 'expired' }, config));
        localStorage.setItem('user', JSON.stringify({ first_name: 'Ann' }));
        await expect(apiClient.get('/a')).rejects.toBeTruthy();
        expect(events).toEqual([{ type: 'ended', reason: 'expired' }]);
        expect(assign).not.toHaveBeenCalled();
        expect(localStorage.getItem('user')).toBeNull();
        expect(isSessionEnded()).toBe(true);
        // The session is over: later 401s do not replay the dead refresh token
        await expect(apiClient.get('/b')).rejects.toBeTruthy();
        expect(refresh).toHaveBeenCalledTimes(1);
        expect(events).toHaveLength(1);
    });

    it('reports idle and suspended endings with their reason', async () => {
        const events = [];
        unsubscribe = subscribeSession((e) => events.push(e));
        vi.spyOn(axios, 'post').mockRejectedValue(httpError(401, { detail: { code: 'SESSION_IDLE_TIMEOUT', message: 'idle' } }));
        apiClient.defaults.adapter = (config) => Promise.reject(httpError(401, {}, config));
        await expect(apiClient.get('/a')).rejects.toBeTruthy();
        expect(events).toEqual([{ type: 'ended', reason: 'idle' }]);
        unsubscribe();

        const later = [];
        unsubscribe = subscribeSession((e) => later.push(e));
        apiClient.defaults.adapter = (config) => Promise.reject(httpError(403, { detail: 'Tenant suspended' }, config));
        await expect(apiClient.get('/b')).rejects.toBeTruthy();
        expect(later).toEqual([{ type: 'ended', reason: 'suspended' }]);
        expect(assign).not.toHaveBeenCalled();
    });

    it('a successful refresh hands the fresh user to the provider', async () => {
        const events = [];
        unsubscribe = subscribeSession((e) => events.push(e));
        vi.spyOn(axios, 'post').mockResolvedValue({ data: { user: { first_name: 'Bo', role: 'ADMIN' } } });
        await refreshSessionOnce();
        expect(events).toEqual([{ type: 'refreshed', user: { first_name: 'Bo', role: 'ADMIN' } }]);
    });

    it('MFA_SETUP_REQUIRED goes to the provider instead of a full-page redirect', async () => {
        const events = [];
        unsubscribe = subscribeSession((e) => events.push(e));
        apiClient.defaults.adapter = (config) => Promise.reject(httpError(403, { detail: { code: 'MFA_SETUP_REQUIRED', message: 'Set up 2FA' } }, config));
        await expect(apiClient.get('/a')).rejects.toBeTruthy();
        expect(events).toEqual([{ type: 'mfa-setup-required' }]);
        expect(assign).not.toHaveBeenCalled();
    });

    it('an aborted request is not refreshed', async () => {
        const refresh = vi.spyOn(axios, 'post');
        const controller = new AbortController();
        apiClient.defaults.adapter = (config) => {
            controller.abort();
            return Promise.reject(httpError(401, {}, config));
        };
        await expect(apiClient.get('/a', { signal: controller.signal })).rejects.toBeTruthy();
        expect(refresh).not.toHaveBeenCalled();
    });
});
