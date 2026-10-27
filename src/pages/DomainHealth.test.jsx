import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import DomainHealth from './DomainHealth';
import { fail, pending, renderPage } from '../test/renderPage';
import { bug, expectLoadError, expectLoading } from '../test/pageAssertions';

const domain = { domain_name: 'acme.test', current_reputation_score: 92, account_reputation_score: 90, is_blacklisted: false,
    ses_reputation_status: 'HEALTHY', associated_inboxes: 2, active_campaigns: 1, spf_status: 'PASS', dkim_status: 'PASS', dmarc_status: 'PASS' };
const http = (over = {}) => ({
    'GET /deliverability/domains': [domain],
    'GET /deliverability/alerts': [],
    'GET /deliverability/statistics': [],
    ...over,
});
const opts = (over, role) => ({ route: '/app/domain-health', role, http: http(over) });

describe('DomainHealth page', () => {
    it('lists connected domains', async () => {
        renderPage(<DomainHealth />, opts());
        expect(await screen.findByRole('heading', { name: 'Domain Health' })).toBeInTheDocument();
        expect((await screen.findAllByText('acme.test')).length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: /add domain/i })).toBeInTheDocument();
    });

    it('shows a loading skeleton', () => {
        renderPage(<DomainHealth />, opts({ 'GET /deliverability/domains': pending() }));
        expectLoading();
    });

    it('hides "Add domain" from an AGENT', async () => {
        renderPage(<DomainHealth />, opts({}, 'AGENT'));
        await screen.findAllByText('acme.test');
        expect(screen.queryByRole('button', { name: /add domain/i })).toBeNull();
    });

    bug('reports a failed load instead of "No domains connected"', 'the page deliberately shows no domains on a failed load (comment in DomainHealth.jsx)', async () => {
        renderPage(<DomainHealth />, opts({ 'GET /deliverability/domains': fail(500) }));
        await expectLoadError({ emptyText: /no domains connected/i });
    });
});
