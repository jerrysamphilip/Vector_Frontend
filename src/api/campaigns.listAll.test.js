import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from './http';
import { campaignApi, LIST_ALL_MAX_PAGES, LIST_ALL_PAGE_SIZE } from './campaigns';

// campaignApi.listAll walks GET /campaigns page by page (page_size 100, the API's max).
let sent;
function serve(totalItems) {
    apiClient.defaults.adapter = (config) => {
        sent.push(config);
        const { page, page_size: size } = config.params;
        const start = (page - 1) * size;
        const items = Array.from({ length: Math.max(0, Math.min(size, totalItems - start)) }, (_, i) => ({ campaign_id: `c-${start + i}` }));
        const data = { items, total: totalItems, page, page_size: size, total_pages: Math.max(1, Math.ceil(totalItems / size)) };
        return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config });
    };
}
beforeEach(() => { sent = []; });
afterEach(() => { delete apiClient.defaults.adapter; });

describe('campaignApi.listAll', () => {
    it('fetches every page and returns all items with the total', async () => {
        serve(250);
        const res = await campaignApi.listAll({ status: 'ACTIVE' });
        expect(sent.map(c => c.params.page)).toEqual([1, 2, 3]);
        expect(sent.every(c => c.url === '/campaigns' && c.params.page_size === LIST_ALL_PAGE_SIZE && c.params.status === 'ACTIVE')).toBe(true);
        expect(res.items).toHaveLength(250);
        expect(res.items[249].campaign_id).toBe('c-249');
        expect(res.total).toBe(250);
    });

    it('stops after one request when everything fits on the first page', async () => {
        serve(7);
        const res = await campaignApi.listAll();
        expect(sent).toHaveLength(1);
        expect(res.items).toHaveLength(7);
    });

    it('stops after one request for an empty workspace', async () => {
        serve(0);
        const res = await campaignApi.listAll();
        expect(sent).toHaveLength(1);
        expect(res).toMatchObject({ items: [], total: 0 });
    });

    it('stops at the hard page cap', async () => {
        serve(LIST_ALL_PAGE_SIZE * (LIST_ALL_MAX_PAGES + 10));
        const res = await campaignApi.listAll();
        expect(sent).toHaveLength(LIST_ALL_MAX_PAGES);
        expect(res.items).toHaveLength(LIST_ALL_PAGE_SIZE * LIST_ALL_MAX_PAGES);
    });
});
