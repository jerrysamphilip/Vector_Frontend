import { describe, expect, it } from 'vitest';
import { errorMessage, errorReference, errorText, isNotFound, NETWORK_TEXT } from './apiErrors';

const httpError = (status, data = {}, headers = { 'x-request-id': 'req-123' }) => ({
    message: `Request failed with status code ${status}`,
    response: { status, data, headers },
});

describe('apiErrors', () => {
    it('reads the API detail, status and X-Request-ID of a failed request', () => {
        const err = httpError(500, { detail: 'Database unavailable' });
        expect(errorMessage(err)).toBe('Database unavailable');
        expect(errorReference(err)).toBe('req-123');
        expect(isNotFound(err)).toBe(false);
    });

    it('tells a 404 apart and explains it in a plain sentence', () => {
        const err = httpError(404, {}, {});
        expect(isNotFound(err)).toBe(true);
        expect(errorMessage(err)).toMatch(/could not be found/);
        expect(errorReference(err)).toBeUndefined();
    });

    it('explains a network error and a timeout', () => {
        expect(errorMessage({ message: 'Network Error' })).toBe(NETWORK_TEXT);
        expect(errorMessage({ message: 'x', code: 'ERR_NETWORK' })).toBe(NETWORK_TEXT);
        expect(errorMessage({ message: 'timeout of 30000ms exceeded', code: 'ECONNABORTED' })).toMatch(/too long/);
        expect(errorReference(new Error('x'))).toBeUndefined();
    });

    it.each([
        [401, /session has expired/i],
        [403, /permission/i],
        [404, /could not be found/i],
        [409, /changed by someone else/i],
        [422, /not valid/i],
        [429, /too many requests/i],
        [500, /went wrong on our side/i],
        [502, /went wrong on our side/i],
        [503, /went wrong on our side/i],
    ])('maps a %i without a human detail to a plain sentence', (status, text) => {
        expect(errorMessage(httpError(status))).toMatch(text);
        // FastAPI / Starlette reason phrases are not shown as such
        const phrase = { 401: 'Not authenticated', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict', 422: 'Unprocessable Entity',
            429: 'Too Many Requests', 500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable' }[status];
        expect(errorMessage(httpError(status, { detail: phrase }))).toMatch(text);
    });

    it("keeps the server's detail when it is a human message", () => {
        expect(errorMessage(httpError(403, { detail: 'Only admins can delete campaigns' }))).toBe('Only admins can delete campaigns');
        expect(errorMessage(httpError(409, { detail: { code: 'STALE_VERSION', message: 'Someone else saved this contact' } })))
            .toBe('Someone else saved this contact');
        expect(errorMessage(httpError(400, { error: 'The file is empty' }))).toBe('The file is empty');
    });

    it('does not show a technical detail', () => {
        expect(errorMessage(httpError(500, { detail: 'Traceback (most recent call last): ...' }))).toMatch(/went wrong on our side/);
        expect(errorMessage(httpError(500, { detail: 'sqlalchemy.exc.OperationalError (2006)' }))).toMatch(/went wrong on our side/);
    });

    it('names the first invalid field of a 422', () => {
        const err = httpError(422, { detail: [{ loc: ['body', 'email_address'], msg: 'value is not a valid email address', type: 'value_error' }] });
        expect(errorMessage(err)).toBe('Email address: value is not a valid email address');
        expect(errorMessage(httpError(422, { detail: [{ loc: ['body'], msg: 'Value error, end before start' }] }))).toBe('end before start');
    });

    it('uses the fallback for errors without a readable message', () => {
        expect(errorMessage(undefined, 'Could not save')).toBe('Could not save');
        expect(errorMessage({}, 'Could not save')).toBe('Could not save');
        expect(errorMessage(new Error('Cannot read properties of undefined (reading "x")'), 'Could not save')).toBe('Could not save');
        expect(errorMessage(new Error('Pick a list first'))).toBe('Pick a list first');
        expect(errorMessage(httpError(418), 'Could not save')).toBe('Could not save');
    });

    it('always exposes the request reference', () => {
        expect(errorText(httpError(500))).toMatch(/\(Reference: req-123\)$/);
        expect(errorText(httpError(404, {}, {}))).not.toMatch(/Reference/);
        expect(errorReference({ reference: 'req-9' })).toBe('req-9');
        const fetchHeaders = { get: (k) => (k === 'x-request-id' ? 'req-7' : null) };
        expect(errorReference({ response: { status: 500, headers: fetchHeaders } })).toBe('req-7');
    });
});
