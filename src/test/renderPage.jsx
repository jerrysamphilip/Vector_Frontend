// Page render harness (W-11): renders a page the way the app does (react-query, router at the page's
// route, the signed-in user with a chosen role) against an HTTP mock installed at the axios boundary.
//
//   renderPage(<Contacts />, {
//       route: '/app/contacts/:id', path: '/app/contacts/c1', role: 'AGENT',
//       http: { 'GET /contacts/:id': contact, 'GET /lists': [], 'POST /contacts': reply(201, created) },
//   });
//
// HTTP keys are "METHOD /path" relative to the client base URL (apiClient: /api, apiV1Client: /api/api),
// without the query string. `:param` matches one segment, a trailing `*` matches the rest; literal
// routes win over `:param` routes, which win over `*` routes. A value is
// the 200 body, reply(status, body), pending() (never settles: loading state), fail(status, detail) or a
// function (req) => any of those; req = { method, url, path, query, params, body }.
//
// The test fails on any request no key matches (unexpected requests) and on any console.error, unless
// allowed via `allowConsoleError: [/regex/]`. `http.requests` (returned) records every request made.
import { afterEach, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';
import axios from 'axios';
import { apiClient, apiV1Client } from '../api/http';
import { USER_KEY } from '../lib/authStorage';
import { ToastProvider } from '../components/ui/Toast';
import { ConfirmProvider } from '../components/ui/ConfirmDialog';
import { AUTH_QUERY_KEY, AuthProvider } from '../auth/AuthProvider';
import { ROLE_DEFAULT_PERMISSIONS } from '../auth/permissions';

const REPLY = Symbol('reply');
const PENDING = Symbol('pending');

/** A response with a status (and optional body). */
export const reply = (status, data = {}, headers = {}) => ({ [REPLY]: true, status, data, headers });
/** The X-Request-ID every fail() response carries (shown as the error reference by LoadError). */
export const FAIL_REQUEST_ID = 'req-test-0001';
/** An error response; detail is FastAPI's error body. */
export const fail = (status = 500, detail = 'Internal Server Error') => reply(status, { detail }, { 'x-request-id': FAIL_REQUEST_ID });
/** A request that never settles (keeps the page in its loading state). */
export const pending = () => PENDING;

// Roles and their default permissions (backend app/domain/identity.py ROLE_DEFAULT_PERMISSIONS, src/auth/permissions.js).
export const ROLE_PERMISSIONS = ROLE_DEFAULT_PERMISSIONS;

export function makeUser(role = 'SUPER_ADMIN', overrides = {}) {
    return {
        id: 'u-1',
        email: 'ada@example.com',
        first_name: 'Ada',
        last_name: 'Lovelace',
        role,
        tenant_id: 't-1',
        permissions: [...(ROLE_PERMISSIONS[role] || [])],
        mfa_enabled: false,
        ...overrides,
    };
}

function compile(key) {
    const m = /^(\w+)\s+(\S+)$/.exec(key);
    if (!m) throw new Error(`renderPage: bad http key "${key}" (want "METHOD /path")`);
    const [, method, pattern] = m;
    const names = [];
    let src = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/:(\w+)/g, (_, n) => { names.push(n); return '([^/]+)'; });
    src = src.endsWith('*') ? `${src.slice(0, -1)}.*` : src;
    const re = new RegExp(`^${src}/?$`);
    return { key, method: method.toUpperCase(), re, names };
}

function parseBody(data) {
    if (typeof data !== 'string') return data;
    try { return JSON.parse(data); } catch { return data; }
}

function settle(config, value) {
    if (value === PENDING) return new Promise(() => {});
    const r = value && value[REPLY] ? value : { status: 200, data: value === undefined ? {} : value, headers: {} };
    const response = { data: r.data, status: r.status, statusText: String(r.status), headers: r.headers, config, request: {} };
    if (r.status >= 200 && r.status < 300) return Promise.resolve(response);
    const error = new axios.AxiosError(`Request failed with status code ${r.status}`,
        r.status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST', config, {}, response);
    return Promise.reject(error);
}

let active = null;

function installHttp(handlers) {
    // Most specific first: literal paths, then `:param` ones, then trailing `*` (so '/contacts/owners' beats '/contacts/:id')
    const specificity = (r) => (r.key.endsWith('*') ? 1000 : 0) + r.names.length;
    const routes = Object.entries(handlers).map(([key, value]) => ({ ...compile(key), value }))
        .sort((a, b) => specificity(a) - specificity(b));
    const state = { requests: [], unexpected: [] };
    const adapter = async (config) => {
        const raw = config.url || '';
        const [pathPart, queryPart = ''] = raw.split('?');
        const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
        const query = Object.fromEntries(new URLSearchParams(queryPart));
        Object.entries(config.params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null) query[k] = String(v); });
        const method = (config.method || 'get').toUpperCase();
        const req = { method, url: raw, path, query, params: {}, body: parseBody(config.data), baseURL: config.baseURL };
        state.requests.push(req);
        for (const route of routes) {
            if (route.method !== method) continue;
            const hit = route.re.exec(path);
            if (!hit) continue;
            route.names.forEach((n, i) => { req.params[n] = decodeURIComponent(hit[i + 1]); });
            const value = typeof route.value === 'function' ? route.value(req) : route.value;
            return settle(config, value);
        }
        state.unexpected.push(`${method} ${path}${queryPart ? `?${queryPart}` : ''}`);
        return settle(config, reply(599, { detail: `renderPage: unexpected request ${method} ${raw}` }));
    };
    const saved = [apiClient.defaults.adapter, apiV1Client.defaults.adapter, axios.defaults.adapter];
    apiClient.defaults.adapter = adapter;
    apiV1Client.defaults.adapter = adapter;
    axios.defaults.adapter = adapter;
    state.restore = () => {
        [apiClient.defaults.adapter, apiV1Client.defaults.adapter, axios.defaults.adapter] = saved;
    };
    return state;
}

afterEach(() => {
    if (!active) return;
    const { http, consoleErrors, allowConsoleError, strict } = active;
    active = null;
    http.restore();
    if (!strict) { consoleErrors.mockRestore(); return; }
    const errors = consoleErrors.mock.calls
        .map((args) => args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '))
        .filter((msg) => !allowConsoleError.some((re) => re.test(msg)));
    consoleErrors.mockRestore();
    expect(http.unexpected, 'unexpected HTTP requests').toEqual([]);
    expect(errors, 'console.error calls').toEqual([]);
});

export function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, retryDelay: 0, refetchOnWindowFocus: false, gcTime: Infinity, staleTime: Infinity },
            mutations: { retry: false },
        },
    });
}

/**
 * Render `ui` at `path` (matched by `route`) as a signed-in user.
 * options: route, path, role ('SUPER_ADMIN'), user (overrides), signedIn (true), http ({}),
 *          allowConsoleError ([]), queryClient, idleTimeout (false: the AuthProvider's inactivity timer).
 * The page gets the AuthProvider with that user already in its react-query cache (AUTH_QUERY_KEY), so no
 * GET /auth/me is made; the localStorage mirror (lib/authStorage) is written too for synchronous readers.
 */
export function renderPage(ui, options = {}) {
    const {
        route = '/', path = route, role = 'SUPER_ADMIN', user = {}, signedIn = true,
        http = {}, allowConsoleError = [], strict = true, queryClient = createTestQueryClient(), extraRoutes = null,
        idleTimeout = false,
    } = options;
    if (active) active.http.restore();
    const signedInUser = signedIn ? makeUser(role, user) : null;
    if (signedInUser) localStorage.setItem(USER_KEY, JSON.stringify(signedInUser));
    queryClient.setQueryData(AUTH_QUERY_KEY, signedInUser);
    const state = installHttp(http);
    const consoleErrors = vi.spyOn(console, 'error').mockImplementation(() => {});
    active = { http: state, consoleErrors, allowConsoleError, strict };
    const result = render(
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
            <ConfirmProvider>
            <AuthProvider idleTimeout={idleTimeout}>
            <MemoryRouter initialEntries={[path]}>
                <Suspense fallback={<div>Loading page…</div>}>
                    <Routes>
                        <Route path={route} element={ui} />
                        {extraRoutes}
                        <Route path="*" element={<div data-testid="navigated-away" />} />
                    </Routes>
                </Suspense>
            </MemoryRouter>
            </AuthProvider>
            </ConfirmProvider>
            </ToastProvider>
        </QueryClientProvider>,
    );
    return { ...result, http: state, queryClient, consoleErrors };
}
