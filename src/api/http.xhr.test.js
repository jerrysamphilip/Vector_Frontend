// The API clients over axios' real XHR adapter (the one the browser bundle uses), with XMLHttpRequest faked:
// request headers (cookie auth, CSRF), credentials, JSON bodies, error shaping and the 401 refresh + retry.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './http';

let sent;
let handler;

class FakeXHR {
    constructor() {
        this.headers = {};
        this.readyState = 0;
        this.upload = { addEventListener() {} };
        this.withCredentials = false;
        this.responseType = '';
        sent.push(this);
    }
    open(method, url) { this.method = method; this.url = url; this.readyState = 1; }
    setRequestHeader(name, value) { this.headers[name] = value; }
    addEventListener(type, fn) { this[`on${type}`] = fn; }
    removeEventListener() {}
    getAllResponseHeaders() { return 'content-type: application/json\r\nx-request-id: req-1\r\n'; }
    abort() { this.onabort?.(); }
    send(body) {
        this.body = body;
        const { status, data } = handler(this);
        queueMicrotask(() => {
            this.readyState = 4;
            this.status = status;
            this.statusText = String(status);
            this.responseText = JSON.stringify(data);
            this.response = this.responseText;
            this.responseURL = this.url;
            if (this.onloadend) this.onloadend();
            else this.onreadystatechange?.();
        });
    }
}

beforeEach(() => {
    sent = [];
    handler = () => ({ status: 200, data: { ok: true } });
    vi.stubGlobal('XMLHttpRequest', FakeXHR);
    vi.stubGlobal('location', { pathname: '/app/deals', search: '', hash: '', assign: vi.fn() });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('API client over the XHR adapter', () => {
    it('sends cookie auth, credentials, JSON and the CSRF header on writes only', async () => {
        document.cookie = 'csrf_token=abc; path=/';
        const read = await apiClient.get('/campaigns', { params: { page: 2 } });
        await apiClient.post('/campaigns', { name: 'x' });
        expect(read.data).toEqual({ ok: true });
        expect(read.headers['x-request-id']).toBe('req-1');
        expect(sent[0].method).toBe('GET');
        expect(sent[0].url).toBe('/api/campaigns?page=2');
        expect(sent[0].withCredentials).toBe(true);
        expect(sent[0].headers['X-Auth-Mode']).toBe('cookie');
        expect(sent[0].headers['X-CSRF-Token']).toBeUndefined();
        expect(sent[1].method).toBe('POST');
        expect(sent[1].headers['X-CSRF-Token']).toBe('abc');
        expect(sent[1].headers['Content-Type']).toBe('application/json');
        expect(JSON.parse(sent[1].body)).toEqual({ name: 'x' });
    });

    it('shapes a FastAPI 422 into detail text and detail_list', async () => {
        handler = () => ({ status: 422, data: { detail: [{ loc: ['body', 'email'], msg: 'bad email' }] } });
        const error = await apiClient.post('/contacts', {}).catch((e) => e);
        expect(error.response.status).toBe(422);
        expect(error.response.data.detail).toBe('email: bad email');
        expect(error.response.data.detail_list).toEqual([{ loc: ['body', 'email'], msg: 'bad email' }]);
    });

    it('refreshes the session on a 401 and retries the request once', async () => {
        handler = (xhr) => {
            if (xhr.url.endsWith('/auth/refresh')) return { status: 200, data: { user: { first_name: 'Bo' } } };
            const tries = sent.filter((x) => x.url === xhr.url).length;
            return tries === 1 ? { status: 401, data: { detail: 'expired' } } : { status: 200, data: { retried: true } };
        };
        const res = await apiClient.get('/deals');
        expect(res.data).toEqual({ retried: true });
        expect(sent.map((x) => `${x.method} ${x.url}`)).toEqual(['GET /api/deals', 'POST /api/api/auth/refresh', 'GET /api/deals']);
    });
});
