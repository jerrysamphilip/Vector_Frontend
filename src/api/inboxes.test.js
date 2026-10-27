import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from './http';
import { conversationsApi, inboxesApi } from './inboxes';

let sent;
beforeEach(() => {
    sent = [];
    apiClient.defaults.adapter = (config) => {
        sent.push(config);
        return Promise.resolve({ data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config });
    };
});
afterEach(() => { delete apiClient.defaults.adapter; });

describe('inbox round endpoints', () => {
    it('resumes a paused mailbox and pages / searches conversations on the server', async () => {
        await inboxesApi.resume('i-9');
        await conversationsApi.list({ search: 'pat', page: 2, page_size: 30, label: 'POSITIVE' });
        expect(sent.map(c => `${c.method} ${c.url}`)).toEqual(['post /inboxes/i-9/resume', 'get /conversations']);
        expect(sent[1].params).toEqual({ search: 'pat', page: 2, page_size: 30, label: 'POSITIVE' });
    });
});
