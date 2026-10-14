import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentReturnPath, safeReturnPath } from './returnTo';

describe('safeReturnPath (open-redirect safety)', () => {
    it.each([
        ['/app', '/app'],
        ['/app/deals?view=list', '/app/deals?view=list'],
        ['/app/contacts/42#notes', '/app/contacts/42#notes'],
        ['/admin/tenants', '/admin/tenants'],
        ['  /app/campaigns  ', '/app/campaigns'],
    ])('accepts the internal app path %s', (raw, expected) => {
        expect(safeReturnPath(raw)).toBe(expected);
    });

    it.each([
        ['protocol-relative URL', '//evil.example.com/app'],
        ['absolute URL', 'https://evil.example.com/app'],
        ['javascript: URL', 'javascript:alert(1)'],
        ['backslash trick', '/\\evil.example.com'],
        ['backslash inside the path', '/app\\..\\login'],
        ['control character', '/app/\u0000deals'],
        ['newline', '/app\n/x'],
        ['public page', '/login'],
        ['root', '/'],
        ['look-alike prefix', '/application'],
        ['look-alike admin prefix', '/administrator'],
        ['relative path', 'app/deals'],
    ])('rejects a %s', (_label, raw) => {
        expect(safeReturnPath(raw)).toBeNull();
    });

    it('rejects empty and non-string values', () => {
        expect(safeReturnPath('')).toBeNull();
        expect(safeReturnPath(null)).toBeNull();
        expect(safeReturnPath(undefined)).toBeNull();
        expect(safeReturnPath({ toString: () => '/app' })).toBeNull();
    });
});

describe('safeReturnPath under a deployment base path (/vector)', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('strips the base and still validates the rest', async () => {
        vi.stubEnv('BASE_URL', '/vector/');
        vi.resetModules();
        const { safeReturnPath: withBase } = await import('./returnTo');
        expect(withBase('/vector/app/deals')).toBe('/app/deals');
        expect(withBase('/app/deals')).toBe('/app/deals');
        expect(withBase('/vector')).toBeNull();
        expect(withBase('/vector//evil.example.com')).toBeNull();
        expect(withBase('/vectorx/app')).toBeNull();
    });
});

describe('currentReturnPath', () => {
    afterEach(() => window.history.replaceState(null, '', '/'));

    it('returns the current app location with query and hash', () => {
        window.history.replaceState(null, '', '/app/deals?stage=won#top');
        expect(currentReturnPath()).toBe('/app/deals?stage=won#top');
    });

    it('is null outside the app screens', () => {
        window.history.replaceState(null, '', '/login?next=/app');
        expect(currentReturnPath()).toBeNull();
    });
});
