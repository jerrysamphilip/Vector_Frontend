import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Duplicates from './Duplicates';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';
import { contact } from '../test/fixtures/crm';

const pair = (id, extra = {}) => ({
    pair_id: id, score: 95, confidence: 'HIGH', status: 'OPEN', reasons: ['Same LinkedIn profile'],
    contacts: [contact(`${id}-a`, { full_name: 'Bob Smith' }), contact(`${id}-b`, { full_name: 'Robert Smith' })],
    created_at: '2026-10-20T10:00:00Z', resolved_at: null, resolved_by_name: null, ...extra,
});
const preview = {
    survivor: contact('p1-a', { full_name: 'Bob Smith' }), merging: [contact('p1-b', { full_name: 'Robert Smith' })],
    properties: [
        { field: 'first_name', label: 'First name', differs: true, default: 'p1-a',
            values: [{ prospect_id: 'p1-a', value: 'Bob', display: 'Bob' }, { prospect_id: 'p1-b', value: 'Robert', display: 'Robert' }] },
        { field: 'phone', label: 'Phone', differs: false, default: 'p1-a',
            values: [{ prospect_id: 'p1-a', value: '1', display: '1' }, { prospect_id: 'p1-b', value: null, display: null }] },
    ],
    moves: { lists: 1, emails: 3, activities: 0 }, warnings: ['One of the records is unsubscribed: the merged contact stays unsubscribed.'],
    tags: ['vip'],
};
const http = (over = {}) => ({
    'GET /contacts/duplicates/pairs': (req) => ({ items: req.query.status === 'DISMISSED' ? [pair('p9', { status: 'DISMISSED', resolved_by_name: 'Ada Lovelace' })] : [pair('p1')], total: 1, page: 1, page_size: 20 }),
    ...over,
});
const opts = (over, role) => ({ route: '/app/contacts/duplicates', role, http: http(over) });

describe('Duplicates page', () => {
    it('lists suggestions with confidence and reasons', async () => {
        renderPage(<Duplicates />, opts());
        expect(await screen.findByText('Same LinkedIn profile')).toBeInTheDocument();
        expect(screen.getByText(/High confidence · 95/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Bob Smith' })).toHaveAttribute('href', '/app/contacts/p1-a');
    });

    it('shows a spinner while loading and reports a failed load', async () => {
        renderPage(<Duplicates />, opts({ 'GET /contacts/duplicates/pairs': pending() }));
        expectLoading();
    });

    it('reports a failed load', async () => {
        renderPage(<Duplicates />, opts({ 'GET /contacts/duplicates/pairs': fail(500) }));
        await expectLoadError({ emptyText: /no duplicates to review/i });
    });

    it('dismisses a pair as not the same person', async () => {
        const { http: rec } = renderPage(<Duplicates />, opts({ 'POST /contacts/duplicates/:id/dismiss': { pair_id: 'p1', status: 'DISMISSED' } }));
        await userEvent.click(await screen.findByRole('button', { name: /not the same person/i }));
        await waitFor(() => expect(rec.requests.some(r => r.method === 'POST' && r.path === '/contacts/duplicates/p1/dismiss')).toBe(true));
    });

    it('reopens a dismissed pair', async () => {
        const { http: rec } = renderPage(<Duplicates />, opts({ 'POST /contacts/duplicates/:id/reopen': { pair_id: 'p9', status: 'OPEN' } }));
        await screen.findByText('Same LinkedIn profile');
        await userEvent.click(screen.getByRole('tab', { name: 'Not duplicates' }));
        await userEvent.click(await screen.findByRole('button', { name: /reopen/i }));
        await waitFor(() => expect(rec.requests.some(r => r.path === '/contacts/duplicates/p9/reopen')).toBe(true));
    });

    it('previews and merges, keeping the chosen record', async () => {
        const { http: rec } = renderPage(<Duplicates />, opts({
            'POST /contacts/merge/preview': preview,
            'POST /contacts/merge': { status: 'merged', merged: 1 },
        }));
        await screen.findByText('Same LinkedIn profile');
        await userEvent.click(screen.getByRole('button', { name: /review & merge/i }));
        const dialog = await screen.findByRole('dialog', { name: 'Review merge' });
        expect(await within(dialog).findByText(/1 list memberships, 3 emails/)).toBeInTheDocument();
        expect(within(dialog).getByText(/stays unsubscribed/)).toBeInTheDocument();
        expect(within(dialog).queryByText('Phone')).toBeNull(); // same value: nothing to choose
        await userEvent.click(within(dialog).getByRole('radio', { name: 'First name: Robert' }));
        await userEvent.click(within(dialog).getByRole('button', { name: /merge 2 records/i }));
        await waitFor(() => expect(rec.requests.find(r => r.path === '/contacts/merge')?.body).toEqual(
            { primary_id: 'p1-a', duplicate_ids: ['p1-b'], choices: { first_name: 'p1-b' } }));
        expect(rec.requests.find(r => r.path === '/contacts/merge/preview').body).toEqual({ primary_id: 'p1-a', duplicate_ids: ['p1-b'] });
        expect(await screen.findByText(/Merged\. The other record was removed/)).toBeInTheDocument();
    });

    it('runs a scan on demand', async () => {
        renderPage(<Duplicates />, opts({ 'POST /contacts/duplicates/scan': { pairs_found: 4, new: 2 } }));
        await screen.findByText('Same LinkedIn profile');
        await userEvent.click(screen.getByRole('button', { name: /scan now/i }));
        expect(await screen.findByText(/4 possible duplicate pairs \(2 new\)/)).toBeInTheDocument();
    });

    it('is closed to users without manage_prospects', async () => {
        renderPage(<Duplicates />, opts({}, 'AGENT'));
        expect(screen.getByText(/needs the “manage prospects” permission/)).toBeInTheDocument();
    });
});
