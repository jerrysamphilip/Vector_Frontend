import { afterEach, describe, expect, it } from 'vitest';
import { apiClient, apiV1Client, isRequestCanceled, runWithSignal } from './http';

const ok = config => Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config });

afterEach(() => { delete apiClient.defaults.adapter; delete apiV1Client.defaults.adapter; });

describe('http signal support (W-9)', () => {
    it('hands the ambient signal to requests started inside runWithSignal, for every method', async () => {
        const seen = [];
        apiClient.defaults.adapter = (config) => { seen.push([config.method, config.signal]); return ok(config); };
        const controller = new AbortController();
        await runWithSignal(controller.signal, () => Promise.all([
            apiClient.get('/a'), apiClient.delete('/b'), apiClient.post('/c', {}), apiClient.put('/d', {}), apiClient.patch('/e', {}),
        ]));
        expect(seen).toHaveLength(5);
        seen.forEach(([, signal]) => expect(signal).toBe(controller.signal));
    });

    it('keeps an explicit signal and adds none outside runWithSignal', async () => {
        const seen = [];
        apiV1Client.defaults.adapter = (config) => { seen.push(config.signal); return ok(config); };
        const ambient = new AbortController();
        const own = new AbortController();
        await runWithSignal(ambient.signal, () => apiV1Client.get('/x', { signal: own.signal }));
        await apiV1Client.get('/y');
        expect(seen[0]).toBe(own.signal);
        expect(seen[1]).toBeUndefined();
    });

    it('an aborted request rejects as cancelled (not retried through the session refresh)', async () => {
        const controller = new AbortController();
        controller.abort();
        apiClient.defaults.adapter = ok;
        const error = await runWithSignal(controller.signal, () => apiClient.get('/z')).catch(e => e);
        expect(isRequestCanceled(error)).toBe(true);
        expect(isRequestCanceled(new Error('boom'))).toBe(false);
    });
});
