import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactIdentityCard from './ContactIdentityCard';
import { renderPage } from '../../../test/renderPage';

const http = (over = {}) => ({
    'GET /contacts/:id/emails': { current: 'ann@new.test', items: [
        { email: 'ann@old.test', status: 'RETIRED', source: 'EMAIL_CHANGE', updated_at: '2026-10-01T10:00:00Z' },
        { email: 'a.lee@dup.test', status: 'MERGED', source: 'MERGE', updated_at: '2026-10-02T10:00:00Z' }] },
    'GET /contacts/:id/merges': { items: [{
        merge_id: 'm1', merged_at: '2026-10-02T10:00:00Z', merged_by_name: 'Ada Lovelace', merged_ids: ['d1'],
        merged: [{ prospect_id: 'd1', name: 'Annie Lee', email: 'a.lee@dup.test' }], choices: { first_name: 'd1' },
        moved: { lists: 1, emails: 2, activities: 0 }, snapshot: {} }] },
    ...over,
});

describe('Contact identity card', () => {
    it('shows past addresses and merge history', async () => {
        renderPage(<ContactIdentityCard prospectId="c1" />, { http: http() });
        expect(await screen.findByText('ann@old.test')).toBeInTheDocument();
        expect(screen.getByText(/From a merged record/)).toBeInTheDocument();
        await userEvent.click(await screen.findByRole('button', { name: /Merged Annie Lee/ }));
        expect(screen.getByText('Moved: 1 lists, 2 emails')).toBeInTheDocument();
        expect(screen.getByText(/Values taken from merged records: first_name/)).toBeInTheDocument();
    });

    it('renders nothing without history', async () => {
        const { http: rec } = renderPage(<ContactIdentityCard prospectId="c1" />, {
            http: http({ 'GET /contacts/:id/emails': { current: 'a@b.c', items: [] }, 'GET /contacts/:id/merges': { items: [] } }) });
        await screen.findByTestId('contact-identity');
        expect(rec.requests.map(r => r.path).sort()).toEqual(['/contacts/c1/emails', '/contacts/c1/merges']);
        expect(screen.queryByText(/Merge history/)).toBeNull();
    });
});
