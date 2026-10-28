// F4: useAuth (status, permission / role helpers), session end → signed out + notice, idle warning, route gates.
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, AUTH_QUERY_KEY, useAuth } from './AuthProvider';
import { reportSession } from './sessionEvents';
import { userHasPermission, userHasRole } from './permissions';
import { IDLE_LIMIT_MS, WARNING_MS } from './useIdleTimeout';
import { ToastProvider } from '../components/ui/Toast';
import { PermissionRoute, PlatformAdminRoute, ProtectedRoute, PublicRoute } from '../components/auth/ProtectedRoute';
import { createTestQueryClient, makeUser, renderPage } from '../test/renderPage';
import { apiClient, apiV1Client } from '../api/http';
import { resetActivity } from '../api/activity';

function Probe() {
    const auth = useAuth();
    return (
        <div>
            <p data-testid="status">{auth.status}</p>
            <p data-testid="name">{auth.user?.first_name || ''}</p>
            <p data-testid="perms">{['manage_team', 'export_data', 'manage_campaigns', 'view_analytics'].filter(auth.hasPermission).join(',')}</p>
            <p data-testid="roles">{auth.hasRole('SUPER_ADMIN', 'ADMIN') ? 'admin' : 'member'}</p>
        </div>
    );
}

function Where() {
    const location = useLocation();
    return <p data-testid="where">{`${location.pathname}${location.search}`}</p>;
}

describe('permission helpers (backend ROLE_DEFAULT_PERMISSIONS)', () => {
    it('falls back to the role defaults and honours a custom list (also an empty one)', () => {
        expect(userHasPermission({ role: 'MANAGER' }, 'view_analytics')).toBe(true);
        expect(userHasPermission({ role: 'MANAGER' }, 'manage_team')).toBe(false);
        expect(userHasPermission({ role: 'AGENT' }, 'manage_campaigns')).toBe(true);
        expect(userHasPermission({ role: 'ADMIN', permissions: [] }, 'manage_team')).toBe(false);
        expect(userHasPermission({ role: 'AGENT', permissions: ['export_data'] }, 'export_data')).toBe(true);
    });

    it('SUPER_ADMIN has every tenant permission; PLATFORM_ADMIN none', () => {
        expect(userHasPermission({ role: 'SUPER_ADMIN', permissions: [] }, 'manage_team')).toBe(true);
        expect(userHasPermission({ role: 'PLATFORM_ADMIN' }, 'manage_campaigns')).toBe(false);
        expect(userHasPermission(null, 'manage_campaigns')).toBe(false);
    });

    it('hasRole takes several roles or a list', () => {
        expect(userHasRole({ role: 'ADMIN' }, 'SUPER_ADMIN', 'ADMIN')).toBe(true);
        expect(userHasRole({ role: 'ADMIN' }, ['MANAGER'])).toBe(false);
        expect(userHasRole(null, 'ADMIN')).toBe(false);
    });
});

describe('useAuth in pages (renderPage)', () => {
    it('gives the chosen role and its permissions', () => {
        renderPage(<Probe />, { role: 'MANAGER' });
        expect(screen.getByTestId('status')).toHaveTextContent('signed-in');
        expect(screen.getByTestId('perms')).toHaveTextContent('manage_campaigns,view_analytics');
        expect(screen.getByTestId('roles')).toHaveTextContent('member');
    });

    it('custom user permissions and signedIn: false', () => {
        renderPage(<Probe />, { role: 'ADMIN', user: { first_name: 'Kim', permissions: ['export_data'] } });
        expect(screen.getByTestId('name')).toHaveTextContent('Kim');
        expect(screen.getByTestId('perms')).toHaveTextContent(/^export_data$/);
        expect(screen.getByTestId('roles')).toHaveTextContent('admin');
    });

    it('signed out', () => {
        renderPage(<Probe />, { signedIn: false });
        expect(screen.getByTestId('status')).toHaveTextContent('signed-out');
    });
});

function renderApp(ui, { path = '/app/home', user = makeUser('AGENT'), queryClient = createTestQueryClient(), idleTimeout = false } = {}) {
    queryClient.setQueryData(AUTH_QUERY_KEY, user);
    if (user) localStorage.setItem('user', JSON.stringify(user));
    return render(
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <AuthProvider idleTimeout={idleTimeout}>
                    <MemoryRouter initialEntries={[path]}>
                        {ui}
                    </MemoryRouter>
                </AuthProvider>
            </ToastProvider>
        </QueryClientProvider>,
    );
}

const appRoutes = (
    <Routes>
        <Route path="/login" element={<PublicRoute><p>login page</p><Where /></PublicRoute>} />
        <Route path="/app/home" element={<ProtectedRoute><p>home</p><Probe /></ProtectedRoute>} />
        <Route path="/app/team" element={<ProtectedRoute><PermissionRoute permission="manage_team"><p>team</p></PermissionRoute></ProtectedRoute>} />
        <Route path="/app/dashboard" element={<ProtectedRoute><p>dashboard</p></ProtectedRoute>} />
        <Route path="/app/account/security" element={<ProtectedRoute><p>security</p></ProtectedRoute>} />
        <Route path="/admin" element={<PlatformAdminRoute><p>admin</p></PlatformAdminRoute>} />
        <Route path="*" element={<Where />} />
    </Routes>
);

describe('ProtectedRoute and role gates', () => {
    it('redirects a signed-out visitor to the login page', () => {
        renderApp(appRoutes, { user: null });
        expect(screen.getByText('login page')).toBeInTheDocument();
    });

    it('PermissionRoute sends a user without the permission to the dashboard', () => {
        renderApp(appRoutes, { path: '/app/team', user: makeUser('AGENT') });
        expect(screen.getByText('dashboard')).toBeInTheDocument();
    });

    it('PermissionRoute lets an admin in', () => {
        renderApp(appRoutes, { path: '/app/team', user: makeUser('ADMIN') });
        expect(screen.getByText('team')).toBeInTheDocument();
    });

    it('a platform admin goes to /admin; a tenant user cannot open /admin', () => {
        renderApp(appRoutes, { user: makeUser('PLATFORM_ADMIN') });
        expect(screen.getByText('admin')).toBeInTheDocument();
    });

    it('a tenant user cannot open /admin', () => {
        renderApp(appRoutes, { path: '/admin', user: makeUser('ADMIN') });
        expect(screen.getByText('dashboard')).toBeInTheDocument();
    });

    it('two-factor setup required: only the security page', () => {
        renderApp(appRoutes, { user: makeUser('AGENT', { mfa_setup_required: true }) });
        expect(screen.getByText('security')).toBeInTheDocument();
    });

    it('PublicRoute sends a signed-in user to the app', () => {
        renderApp(appRoutes, { path: '/login', user: makeUser('AGENT') });
        expect(screen.getByText('dashboard')).toBeInTheDocument();
    });
});

describe('session end (refresh refused, suspended)', () => {
    it('signs out, shows a "session expired" notice and lands on login with the reason', () => {
        renderApp(appRoutes);
        expect(screen.getByText('home')).toBeInTheDocument();
        act(() => { reportSession({ type: 'ended', reason: 'expired' }); });
        expect(screen.getByText('login page')).toBeInTheDocument();
        expect(screen.getByTestId('where')).toHaveTextContent('/login?reason=expired');
        expect(screen.getByTestId('toast-info')).toHaveTextContent(/session expired/i);
        expect(localStorage.getItem('user')).toBeNull();
    });

    it('a refreshed user replaces the cached one (role change)', async () => {
        renderApp(appRoutes);
        act(() => { reportSession({ type: 'refreshed', user: { first_name: 'Renamed', role: 'ADMIN', permissions: null } }); });
        expect(await screen.findByText('Renamed')).toBeInTheDocument();
        expect(screen.getByTestId('roles')).toHaveTextContent('admin');
    });

    it('a 401 whose refresh is refused ends in the signed-out state (end to end through http.js)', async () => {
        vi.spyOn(axios, 'post').mockRejectedValue(Object.assign(new Error('401'), {
            response: { status: 401, data: { detail: { code: 'SESSION_EXPIRED', message: 'x' } }, headers: {} },
        }));
        apiClient.defaults.adapter = (config) => Promise.reject(Object.assign(new Error('401'), {
            config, response: { status: 401, data: { detail: 'expired' }, headers: {}, config },
        }));
        renderApp(appRoutes);
        await act(async () => { await apiClient.get('/campaigns').catch(() => {}); });
        expect(screen.getByText('login page')).toBeInTheDocument();
        expect(screen.getByTestId('toast-info')).toBeInTheDocument();
        delete apiClient.defaults.adapter;
        vi.restoreAllMocks();
    });
});

describe('sign-in and sign-out actions', () => {
    let calls;
    beforeEach(() => {
        calls = [];
        apiV1Client.defaults.adapter = (config) => {
            calls.push(`${config.method.toUpperCase()} ${config.url}`);
            const data = config.url === '/auth/login'
                ? (JSON.parse(config.data).password === 'two-factor' ? { mfa_required: true, mfa_token: 'm-1' } : { user: makeUser('ADMIN', { first_name: 'Lia' }) })
                : config.url === '/auth/mfa/verify' ? { user: makeUser('AGENT', { first_name: 'Mo' }) } : null;
            return Promise.resolve({ data, status: config.url === '/auth/logout' ? 204 : 200, headers: {}, config });
        };
    });
    afterEach(() => { delete apiV1Client.defaults.adapter; });

    function Actions() {
        const auth = useAuth();
        return (
            <div>
                <p data-testid="status">{auth.status}</p>
                <p data-testid="name">{auth.user?.first_name || ''}</p>
                <button onClick={() => auth.login('a@b.c', 'pw')}>login</button>
                <button onClick={() => auth.login('a@b.c', 'two-factor')}>login-mfa</button>
                <button onClick={() => auth.verifyMfa({ code: '123456' })}>verify</button>
                <button onClick={() => auth.logout()}>logout</button>
            </div>
        );
    }

    it('login → signed-in; logout revokes server side → signed-out (no notice)', async () => {
        renderApp(<Actions />, { user: null });
        expect(screen.getByTestId('status')).toHaveTextContent('signed-out');
        await act(async () => { screen.getByText('login').click(); });
        expect(screen.getByTestId('status')).toHaveTextContent('signed-in');
        expect(screen.getByTestId('name')).toHaveTextContent('Lia');
        await act(async () => { screen.getByText('logout').click(); });
        expect(screen.getByTestId('status')).toHaveTextContent('signed-out');
        expect(calls).toEqual(['POST /auth/login', 'POST /auth/logout']);
        expect(screen.queryByTestId('toast-info')).toBeNull();
    });

    it('two-factor: status mfa-required until the code is verified with the held mfa_token', async () => {
        let verifyBody;
        const base = apiV1Client.defaults.adapter;
        apiV1Client.defaults.adapter = (config) => {
            if (config.url === '/auth/mfa/verify') verifyBody = JSON.parse(config.data);
            return base(config);
        };
        renderApp(<Actions />, { user: null });
        await act(async () => { screen.getByText('login-mfa').click(); });
        expect(screen.getByTestId('status')).toHaveTextContent('mfa-required');
        await act(async () => { screen.getByText('verify').click(); });
        expect(verifyBody).toMatchObject({ mfa_token: 'm-1', code: '123456' });
        expect(screen.getByTestId('status')).toHaveTextContent('signed-in');
        expect(screen.getByTestId('name')).toHaveTextContent('Mo');
    });
});

describe('idle timeout warning', () => {
    beforeEach(() => { resetActivity(); vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); resetActivity(); delete apiV1Client.defaults.adapter; vi.restoreAllMocks(); });

    it('warns before the idle limit, "Stay signed in" refreshes the session', async () => {
        const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
        renderApp(appRoutes, { idleTimeout: true });
        expect(screen.queryByTestId('idle-warning')).toBeNull();
        act(() => { vi.advanceTimersByTime(IDLE_LIMIT_MS - WARNING_MS - 10000); });
        expect(screen.queryByTestId('idle-warning')).toBeNull();
        act(() => { vi.advanceTimersByTime(15000); });
        expect(screen.getByTestId('idle-warning')).toHaveTextContent(/signed out in/i);
        await act(async () => { screen.getByRole('button', { name: 'Stay signed in' }).click(); });
        expect(screen.queryByTestId('idle-warning')).toBeNull();
        expect(refresh).toHaveBeenCalledTimes(1);
        expect(refresh.mock.calls[0][0]).toMatch(/\/auth\/refresh$/);
        expect(refresh.mock.calls[0][2].headers['X-User-Activity']).toBe('0'); // reported as user activity
        expect(screen.getByText('home')).toBeInTheDocument();
    });

    it('signs out at the idle limit (server revocation) with the idle notice', async () => {
        const calls = [];
        apiV1Client.defaults.adapter = (config) => { calls.push(config.url); return Promise.resolve({ data: null, status: 204, headers: {}, config }); };
        renderApp(appRoutes, { idleTimeout: true });
        await act(async () => { vi.advanceTimersByTime(IDLE_LIMIT_MS + 5000); });
        expect(calls).toContain('/auth/logout');
        expect(screen.getByText('login page')).toBeInTheDocument();
        expect(screen.getByTestId('where')).toHaveTextContent('/login?reason=idle');
        expect(screen.getByTestId('toast-info')).toHaveTextContent(/inactivity/i);
    });

    it('activity hides the warning', () => {
        renderApp(appRoutes, { idleTimeout: true });
        act(() => { vi.advanceTimersByTime(IDLE_LIMIT_MS - WARNING_MS + 5000); });
        expect(screen.getByTestId('idle-warning')).toBeInTheDocument();
        act(() => { window.dispatchEvent(new Event('keydown')); vi.advanceTimersByTime(5000); });
        expect(screen.queryByTestId('idle-warning')).toBeNull();
    });
});
