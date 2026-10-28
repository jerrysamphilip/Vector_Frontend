import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MergeDuplicatesModal from './MergeDuplicatesModal';
import { renderPage } from '../../test/renderPage';
import { contact } from '../../test/fixtures/crm';

const groups = { total_groups: 1, mergeable_properties: [], groups: [{
    pair_id: 'p1', score: 100, confidence: 'HIGH', status: 'OPEN', reasons: ['Same email address (ignoring capitals, +tags and Gmail dots)'],
    contacts: [contact('a', { full_name: 'Jane Doe' }), contact('b', { full_name: 'J Doe' })] }] };

describe('Find duplicates modal', () => {
    it('shows stored pairs with confidence, dismisses and links to the review page', async () => {
        const { http } = renderPage(<MergeDuplicatesModal onClose={vi.fn()} />, {
            http: { 'GET /contacts/duplicates': groups, 'POST /contacts/duplicates/:id/dismiss': { status: 'DISMISSED' } } });
        expect(await screen.findByText('High confidence')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /duplicates review page/i })).toHaveAttribute('href', '/app/contacts/duplicates');
        await userEvent.click(screen.getByRole('button', { name: /not the same person/i }));
        await waitFor(() => expect(http.requests.some(r => r.path === '/contacts/duplicates/p1/dismiss')).toBe(true));
    });

    it('opens the merge preview before merging', async () => {
        renderPage(<MergeDuplicatesModal onClose={vi.fn()} />, { http: {
            'GET /contacts/duplicates': groups,
            'POST /contacts/merge/preview': { survivor: contact('a'), merging: [contact('b')], properties: [], moves: {}, warnings: [], tags: [] },
        } });
        await screen.findByText('High confidence');
        await userEvent.click(screen.getByRole('button', { name: /^merge 1$/i }));
        const dialog = await screen.findByRole('dialog', { name: 'Review merge' });
        expect(await within(dialog).findByText(/No conflicting values/)).toBeInTheDocument();
    });
});
