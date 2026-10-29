import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, isTenantSuspended, normalizeError } from './http';
import { ACTIVITY_STORAGE_KEY, SESSION_IDLE_MINUTES, resetActivity } from './activity';

const httpError = (status, data, config = {}) => {
    const error = new Error(`Request failed with status code ${status}`);
    error.config = config;
    error.response = { status, data, headers: {}, config };
    return error;
};

describe('normalizeError', () => {
    it('turns a FastAPI validation list into readable text (without the "body" segment)', () => {
        const error = httpError(422, {
            detail: [
                { loc: ['body', 'email'], msg: 'value is not a valid email address' },
                { loc: ['query', 'page'], msg: 'must be >= 1' },
                { msg: 'free text' },
            ],
        });
        normalizeError(error);
        expect(error.response.data.detail).toBe('email: value is not a valid email address; query.page: must be >= 1; free text');
        // the per-field list stays available to forms (serverFieldErrors)
        expect(error.response.data.detail_list).toEqual([
            { loc: ['body', 'email'], msg: 'value is not a valid email address' },
            { loc: ['query', 'page'], msg: 'must be >= 1' },
            { msg: 'free text' },
        ]);
    });

    it('keeps a structured detail in detail_data and exposes its code and message', () => {
        const detail = { code: 'DUPLICATE_PROSPECT', message: 'Already in this list', prospect_id: 'p-1' };
        const error = httpError(409, { detail });
        normalizeError(error);
        expect(error.response.data.detail).toBe('Already in this list');
        expect(error.response.data.code).toBe('DUPLICATE_PROSPECT');
        expect(error.response.data.detail_data).toEqual(detail);
        expect(error.response.data.detail_data.prospect_id).toBe('p-1');
    });

    it('falls back to the code, then a generic text, when the structured detail has no message', () => {
        const withCode = httpError(400, { detail: { code: 'LIMIT_REACHED' } });
        normalizeError(withCode);
        expect(withCode.response.data.detail).toBe('LIMIT_REACHED');

        const bare = httpError(400, { detail: { lead_id: 'l-9' } });
        normalizeError(bare);
        expect(bare.response.data.detail).toBe('Request failed');
        expect(bare.response.data.detail_data).toEqual({ lead_id: 'l-9' });
    });

    it('leaves plain string details and network errors alone', () => {
        const plain = httpError(400, { detail: 'Bad request' });
        normalizeError(plain);
        expect(plain.response.data).toEqual({ detail: 'Bad request' });
        expect(() => normalizeError(new Error('Network Error'))).not.toThrow();
        expect(() => normalizeError(undefined)).not.toThrow();
    });
});

describe('isTenantSuspended', () => {
    it('matches only a 403 "Tenant suspended" detail', () => {
        expect(isTenantSuspended(httpError(403, { detail: 'Tenant suspended' }))).toBe(true);
        expect(isTenantSuspended(httpError(403, { detail: '  tenant SUSPENDED ' }))).toBe(true);
        expect(isTenantSuspended(httpError(403, { detail: 'Not enough permissions' }))).toBe(false);
        expect(isTenantSuspended(httpError(401, { detail: 'Tenant suspended' }))).toBe(false);
        expect(isTenantSuspended(undefined)).toBe(false);
    });
});

describe('apiClient interceptors', () => {
    let sent;
    let respond;
    let assign;

    beforeEach(() => {
        sent = [];
        respond = (config) => Promise.resolve({ data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config });
        apiClient.defaults.adapter = (config) => { sent.push(config); return respond(config); };
        assign = vi.fn();
        vi.stubGlobal('location', { pathname: '/app/deals', search: '?stage=won', hash: '', assign });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        delete apiClient.defaults.adapter;
    });

    it('sends the CSRF cookie as X-CSRF-Token on state-changing requests only', async () => {
        document.cookie = 'csrf_token=tok%2B123; path=/';
        await apiClient.get('/campaigns');
        await apiClient.post('/campaigns', { name: 'x' });
        await apiClient.delete('/campaigns/1');
        expect(sent[0].headers['X-CSRF-Token']).toBeUndefined();
        expect(sent[1].headers['X-CSRF-Token']).toBe('tok+123');
        expect(sent[2].headers['X-CSRF-Token']).toBe('tok+123');
    });

    it('always asks for cookie auth and sends credentials', async () => {
        await apiClient.get('/me');
        expect(sent[0].headers['X-Auth-Mode']).toBe('cookie');
        expect(sent[0].withCredentials).toBe(true);
    });

    it('on 403 "Tenant suspended" ends the session and sends the user to login with reason and return path', async () => {
        localStorage.setItem('user', JSON.stringify({ first_name: 'Ann' }));
        respond = (config) => Promise.reject(httpError(403, { detail: 'Tenant suspended' }, config));
        await expect(apiClient.get('/campaigns')).rejects.toMatchObject({ response: { status: 403 } });
        expect(localStorage.getItem('user')).toBeNull();
        expect(assign).toHaveBeenCalledTimes(1);
        const target = new URL(assign.mock.calls[0][0], 'http://localhost');
        expect(target.pathname).toBe('/login');
        expect(target.searchParams.get('reason')).toBe('suspended');
        expect(target.searchParams.get('next')).toBe('/app/deals?stage=won');
    });

    it('does not redirect a suspended-tenant error on a skipAuth request (e.g. the login form)', async () => {
        respond = (config) => Promise.reject(httpError(403, { detail: 'Tenant suspended' }, config));
        await expect(apiClient.post('/auth/login', {}, { skipAuth: true })).rejects.toBeTruthy();
        expect(assign).not.toHaveBeenCalled();
    });

    it('normalises structured errors before they reach the caller', async () => {
        respond = (config) => Promise.reject(httpError(409, { detail: { code: 'DUP', message: 'Duplicate', lead_id: 'l1' } }, config));
        const error = await apiClient.post('/leads', {}).catch(e => e);
        expect(error.response.data.detail).toBe('Duplicate');
        expect(error.response.data.detail_data.lead_id).toBe('l1');
        expect(assign).not.toHaveBeenCalled();
    });

    it('refreshes the session once on 401 and retries the request', async () => {
        const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: { user: { first_name: 'Bo' } } });
        let calls = 0;
        respond = (config) => {
            calls += 1;
            if (calls === 1) return Promise.reject(httpError(401, { detail: 'expired' }, config));
            return Promise.resolve({ data: { ok: 'retried' }, status: 200, statusText: 'OK', headers: {}, config });
        };
        const res = await apiClient.get('/campaigns');
        expect(res.data).toEqual({ ok: 'retried' });
        expect(refresh).toHaveBeenCalledTimes(1);
        expect(refresh.mock.calls[0][0]).toMatch(/\/api\/api\/auth\/refresh$/);
        expect(JSON.parse(localStorage.getItem('user'))).toEqual({ first_name: 'Bo' });
        expect(assign).not.toHaveBeenCalled();
    });

    it('sends the user to login (reason=expired) when the refresh fails', async () => {
        vi.spyOn(axios, 'post').mockRejectedValue(httpError(401, { detail: 'refresh expired' }));
        respond = (config) => Promise.reject(httpError(401, { detail: 'expired' }, config));
        await expect(apiClient.get('/campaigns')).rejects.toBeTruthy();
        const target = new URL(assign.mock.calls[0][0], 'http://localhost');
        expect(target.searchParams.get('reason')).toBe('expired');
    });

    describe('session limits', () => {
        const expiredThenOk = () => {
            let calls = 0;
            respond = (config) => {
                calls += 1;
                if (calls === 1) return Promise.reject(httpError(401, { detail: 'expired' }, config));
                return Promise.resolve({ data: { ok: 'retried' }, status: 200, statusText: 'OK', headers: {}, config });
            };
        };

        beforeEach(() => resetActivity());
        afterEach(() => resetActivity());

        it('reports recent user interaction in X-User-Activity on refresh', async () => {
            const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
            expiredThenOk();
            window.dispatchEvent(new Event('keydown')); // http.js tracks interaction on window
            await apiClient.get('/campaigns');
            const headers = refresh.mock.calls[0][2].headers;
            expect(headers['X-User-Activity']).toMatch(/^\d+$/);
            expect(Number(headers['X-User-Activity'])).toBeLessThan(5);
            expect(headers['X-Auth-Mode']).toBe('cookie');
        });

        it('sends no activity header when the refresh comes from background polling alone', async () => {
            const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
            expiredThenOk();
            await apiClient.get('/campaigns');
            expect(refresh.mock.calls[0][2].headers).not.toHaveProperty('X-User-Activity');
        });

        it('sends no activity header when the last interaction is older than the idle window', async () => {
            const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
            expiredThenOk();
            localStorage.setItem(ACTIVITY_STORAGE_KEY, String(Date.now() - (SESSION_IDLE_MINUTES * 60 + 5) * 1000));
            await apiClient.get('/campaigns');
            expect(refresh.mock.calls[0][2].headers).not.toHaveProperty('X-User-Activity');
        });

        it('sends the user to login with reason=idle when the session timed out from inactivity', async () => {
            vi.spyOn(axios, 'post').mockRejectedValue(httpError(401, {
                detail: { code: 'SESSION_IDLE_TIMEOUT', message: 'Signed out after 30 minutes of inactivity' },
            }));
            respond = (config) => Promise.reject(httpError(401, { detail: 'expired' }, config));
            await expect(apiClient.get('/campaigns')).rejects.toBeTruthy();
            const target = new URL(assign.mock.calls[0][0], 'http://localhost');
            expect(target.searchParams.get('reason')).toBe('idle');
            expect(target.searchParams.get('next')).toBe('/app/deals?stage=won');
        });

        it('uses reason=expired for the absolute session limit and a revoked session', async () => {
            for (const code of ['SESSION_EXPIRED', 'REFRESH_TOKEN_REUSED']) {
                assign.mockClear();
                vi.spyOn(axios, 'post').mockRejectedValue(httpError(401, { detail: { code, message: 'x' } }));
                respond = (config) => Promise.reject(httpError(401, { detail: 'expired' }, config));
                await expect(apiClient.get('/campaigns')).rejects.toBeTruthy();
                const target = new URL(assign.mock.calls[0][0], 'http://localhost');
                expect(target.searchParams.get('reason')).toBe('expired');
            }
        });

        it('retries without signing out when another tab already exchanged the refresh token', async () => {
            localStorage.setItem('user', JSON.stringify({ first_name: 'Ann' }));
            vi.spyOn(axios, 'post').mockRejectedValue(httpError(401, {
                detail: { code: 'REFRESH_TOKEN_SUPERSEDED', message: 'Refresh token already exchanged' },
            }));
            expiredThenOk();
            const res = await apiClient.get('/campaigns');
            expect(res.data).toEqual({ ok: 'retried' });
            expect(assign).not.toHaveBeenCalled();
            expect(localStorage.getItem('user')).not.toBeNull();
        });
    });
});
