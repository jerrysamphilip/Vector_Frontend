import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlatformAdmin from './PlatformAdmin';
import { fail, pending, renderPage } from '../test/renderPage';
import { bug, expectLoadError, expectLoading } from '../test/pageAssertions';

const tenants = [
    { tenant_id: 'tenant-0001', tenant_name: 'Acme', status: 'ACTIVE', user_count: 3, campaign_count: 2, created_at: '2026-01-01T00:00:00Z' },
    { tenant_id: 'tenant-0002', tenant_name: 'Globex', status: 'SUSPENDED', user_count: 1, campaign_count: 0, created_at: '2026-02-01T00:00:00Z' },
];
const http = (over = {}) => ({
    'GET /api/admin/stats': { active_tenants: 1, active_users: 4, total_campaigns: 2, suspended_tenants: 1 },
    'GET /api/admin/tenants': (req) => tenants.filter(t => !req.query.search || t.tenant_name.toLowerCase().includes(req.query.search.toLowerCase())),
    'GET /scheduler/status': { running: true, paused: false },
    'GET /api/admin/users': [{ user_id: 'u-9', email: 'bob@acme.test', first_name: 'Bob', last_name: 'B', role: 'AGENT', tenant_name: 'Acme', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z' }],
    ...over,
});
const opts = (over) => ({ route: '/admin', role: 'PLATFORM_ADMIN', http: http(over) });

describe('PlatformAdmin page', () => {
    it('shows the console with the tenant roster', async () => {
        renderPage(<PlatformAdmin />, opts());
        expect(screen.getByRole('heading', { name: 'Platform Administration' })).toBeInTheDocument();
        expect(await screen.findByText('Acme')).toBeInTheDocument();
        expect(screen.getByText('Globex')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /suspend/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument();
    });

    it('shows a loading roster while tenants load', () => {
        renderPage(<PlatformAdmin view="tenants" />, opts({ 'GET /api/admin/tenants': pending() }));
        expect(screen.getByRole('heading', { name: 'Tenants' })).toBeInTheDocument();
        expectLoading();
    });

    it('searches tenants on the server', async () => {
        const { http: h } = renderPage(<PlatformAdmin view="tenants" />, opts());
        await screen.findByText('Acme');
        await userEvent.type(screen.getByLabelText('Search tenants'), 'glob');
        expect(await screen.findByText('Globex')).toBeInTheDocument();
        await screen.findByText(/1 visible tenants/);
        expect(screen.queryByText('Acme')).toBeNull();
        expect(h.requests.some(r => r.query.search === 'glob')).toBe(true);
    });

    it('lists platform users', async () => {
        renderPage(<PlatformAdmin view="users" />, opts());
        expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
        expect(await screen.findByText('bob@acme.test')).toBeInTheDocument();
    });

    it('reports a failed users load', async () => {
        renderPage(<PlatformAdmin view="users" />, opts({ 'GET /api/admin/users': fail(500) }));
        await expectLoadError({ emptyText: /no users/i });
    });

    bug('reports a failed tenants load instead of "no tenants found"', 'TenantRosterCard ignores the query error and shows the empty roster', async () => {
        renderPage(<PlatformAdmin view="tenants" />, opts({ 'GET /api/admin/tenants': fail(500) }));
        await expectLoadError({ emptyText: /no tenants found/i });
    });
});
