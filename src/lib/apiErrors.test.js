import { describe, expect, it } from 'vitest';
import { errorMessage, errorReference, isNotFound } from './apiErrors';

describe('apiErrors', () => {
    it('reads the API detail, status and X-Request-ID of a failed request', () => {
        const err = { message: 'Request failed with status code 500', response: { status: 500, data: { detail: 'Database unavailable' }, headers: { 'x-request-id': 'req-123' } } };
        expect(errorMessage(err)).toBe('Database unavailable');
        expect(errorReference(err)).toBe('req-123');
        expect(isNotFound(err)).toBe(false);
    });

    it('tells a 404 apart and falls back to the error message', () => {
        const err = { message: 'Request failed with status code 404', response: { status: 404, data: {}, headers: {} } };
        expect(isNotFound(err)).toBe(true);
        expect(errorMessage(err)).toBe('Request failed with status code 404');
        expect(errorReference(err)).toBeUndefined();
    });

    it('explains a network error', () => {
        expect(errorMessage({ message: 'Network Error' })).toMatch(/Could not reach the server/);
        expect(errorReference(new Error('x'))).toBeUndefined();
    });
});
