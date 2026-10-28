import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it } from 'vitest';
import { apiClient } from '../api/http';
import { errorMessage, isNotFound } from './apiErrors';
import { ApiError, apiQueryFn, toApiError, useApiQuery } from './useApiQuery';

function makeWrapper() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    return { client, wrapper };
}

function deferred() {
    let resolve; let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}

const httpError = (status, data, headers = {}) => {
    const error = new Error(`Request failed with status code ${status}`);
    error.response = { status, data, headers };
    return error;
};

afterEach(() => { delete apiClient.defaults.adapter; });

describe('useApiQuery', () => {
    it('aborts the superseded request when the key changes (signal reaches axios)', async () => {
        const seen = {};
        apiClient.defaults.adapter = (config) => {
            const id = config.url.split('/').pop();
            seen[id] = config.signal;
            if (id === 'a') return new Promise(() => {}); // never answers on its own
            return Promise.resolve({ data: { id }, status: 200, statusText: 'OK', headers: {}, config });
        };
        const { wrapper } = makeWrapper();
        // The API helper takes no signal: runWithSignal hands it to the request
        const fetchItem = async id => (await apiClient.get(`/items/${id}`)).data;
        const { result, rerender } = renderHook(({ id }) => useApiQuery(['item', id], () => fetchItem(id)),
            { wrapper, initialProps: { id: 'a' } });
        await waitFor(() => expect(seen.a).toBeDefined());
        expect(seen.a.aborted).toBe(false);

        rerender({ id: 'b' });
        await waitFor(() => expect(result.current.data).toEqual({ id: 'b' }));
        expect(seen.a.aborted).toBe(true);
        expect(seen.b.aborted).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('never shows a late answer for a stale key', async () => {
        const answers = { a: deferred(), b: deferred() };
        const { wrapper } = makeWrapper();
        const { result, rerender } = renderHook(({ id }) => useApiQuery(['late', id], () => answers[id].promise),
            { wrapper, initialProps: { id: 'a' } });
        rerender({ id: 'b' });
        await act(async () => { answers.b.resolve('answer b'); });
        await waitFor(() => expect(result.current.data).toBe('answer b'));

        // The first request ignored its signal and answers late: it must not replace the current data
        await act(async () => { answers.a.resolve('answer a'); });
        expect(result.current.data).toBe('answer b');
        expect(result.current.error).toBeNull();
    });

    it('drops an answer that arrives after its request was aborted', async () => {
        const controller = new AbortController();
        const answer = deferred();
        const run = apiQueryFn(() => answer.promise)({ signal: controller.signal, queryKey: ['x'] });
        controller.abort();
        answer.resolve('too late');
        await expect(run).rejects.toThrow();
        await expect(run).rejects.not.toBeInstanceOf(ApiError);
    });

    it('normalises errors: message, status, code, request reference; apiErrors helpers still work', async () => {
        const { wrapper } = makeWrapper();
        const failure = httpError(404, { detail: 'Contact not found', code: 'NOT_FOUND' }, { 'x-request-id': 'req-42' });
        const { result } = renderHook(() => useApiQuery(['missing'], () => Promise.reject(failure)), { wrapper });
        await waitFor(() => expect(result.current.error).not.toBeNull());
        const error = result.current.error;
        expect(error).toBeInstanceOf(ApiError);
        expect(error.message).toBe('Contact not found');
        expect(error.status).toBe(404);
        expect(error.code).toBe('NOT_FOUND');
        expect(error.reference).toBe('req-42');
        expect(error.cause).toBe(failure);
        expect(isNotFound(error)).toBe(true);
        expect(errorMessage(error)).toBe('Contact not found');
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toBeUndefined();
    });

    it('gives network failures and thrown errors a readable message', () => {
        expect(toApiError(Object.assign(new Error('Network Error'))).message)
            .toMatch(/could not reach the server/i);
        expect(toApiError({}, 'Could not load the data').message).toBe('Could not load the data');
        const once = toApiError(new Error('x'));
        expect(toApiError(once)).toBe(once);
    });

    it('exposes data, isLoading, isFetching and refetch', async () => {
        let n = 0;
        const { wrapper } = makeWrapper();
        const { result } = renderHook(() => useApiQuery(['count'], async () => { n += 1; return n; }), { wrapper });
        expect(result.current.isLoading).toBe(true);
        await waitFor(() => expect(result.current.data).toBe(1));
        expect(result.current.isFetching).toBe(false);
        let refetched;
        await act(async () => { refetched = await result.current.refetch(); });
        expect(n).toBe(2);
        expect(refetched.data).toBe(2);
        await waitFor(() => expect(result.current.data).toBe(2));
    });

    it('does not report a cancelled request as an error', async () => {
        const { wrapper, client } = makeWrapper();
        const { result } = renderHook(() => useApiQuery(['slow'], ({ signal }) => new Promise((_, reject) => {
            signal.addEventListener('abort', () => reject(Object.assign(new Error('canceled'), { name: 'CanceledError', code: 'ERR_CANCELED' })));
        })), { wrapper });
        await waitFor(() => expect(result.current.isFetching).toBe(true));
        await act(async () => { await client.cancelQueries({ queryKey: ['slow'] }); });
        expect(result.current.error).toBeNull();
    });
});
