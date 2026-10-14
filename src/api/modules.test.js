import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from './http';
import { uploadsApi } from './uploads';
import { conversationsApi, inboxesApi } from './inboxes';
import deliverabilityApi from './deliverability';

// The API modules go through the shared client (base URL, cookies, CSRF, error normalisation).
let sent;
beforeEach(() => {
    sent = [];
    apiClient.defaults.adapter = (config) => {
        sent.push(config);
        return Promise.resolve({ data: { records: [], list_id: 'l-1', ok: true }, status: 200, statusText: 'OK', headers: {}, config });
    };
});
afterEach(() => { delete apiClient.defaults.adapter; });

describe('uploadsApi', () => {
    it('validates a file as multipart form data', async () => {
        const file = new File(['email\na@b.co'], 'leads.csv', { type: 'text/csv' });
        await uploadsApi.validateFile(file);
        expect(sent[0].method).toBe('post');
        expect(sent[0].url).toBe('/uploads/validations');
        expect(sent[0].baseURL).toBe('/api');
        expect(sent[0].data).toBeInstanceOf(FormData);
        expect(sent[0].data.get('file').name).toBe('leads.csv');
    });

    it('re-validates and confirms records of an upload', async () => {
        await uploadsApi.revalidate('u-1', [{ email: 'a@b.co' }]);
        const created = await uploadsApi.confirm('u-1', { title: 'Q4', records: [{ email: 'a@b.co', status: 'ACCEPTED' }] });
        expect(sent[0].url).toBe('/uploads/u-1/revalidations');
        expect(JSON.parse(sent[0].data)).toEqual({ records: [{ email: 'a@b.co' }] });
        expect(sent[1].url).toBe('/uploads/u-1/confirmations');
        expect(JSON.parse(sent[1].data)).toEqual({ upload_id: 'u-1', title: 'Q4', records: [{ email: 'a@b.co', status: 'ACCEPTED' }] });
        expect(created.list_id).toBe('l-1');
    });
});

describe('inboxesApi / conversationsApi / deliverabilityApi', () => {
    it('map to the inbox, conversation and statistics endpoints', async () => {
        await inboxesApi.sync('i-1');
        await inboxesApi.update('i-1', { daily_limit: 50 });
        await conversationsApi.list({ campaign_id: 'c-1', page_size: 100 });
        await conversationsApi.reply('conv-1', 'Thanks!');
        await deliverabilityApi.getStatistics({ domain: 'acme.com' });
        expect(sent.map(c => `${c.method} ${c.url}`)).toEqual([
            'post /inboxes/i-1/sync',
            'put /inboxes/i-1',
            'get /conversations',
            'post /conversations/conv-1/reply',
            'get /deliverability/statistics',
        ]);
        expect(JSON.parse(sent[0].data)).toEqual({ days: 30 });
        expect(sent[2].params).toEqual({ campaign_id: 'c-1', page_size: 100 });
        expect(JSON.parse(sent[3].data)).toEqual({ body_text: 'Thanks!' });
        expect(sent[4].params).toEqual({ domain: 'acme.com' });
    });
});
