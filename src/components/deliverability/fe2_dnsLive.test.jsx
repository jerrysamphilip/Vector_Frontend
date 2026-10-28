// S-25: the DNS records dialog compares each record with live DNS: status (icon + word), current value,
// value to publish (copyable), summary and when DNS was checked.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DnsRecordsPanel, { liveSummaryText } from './DnsRecordsPanel';
import DomainDnsModal from './DomainDnsModal';
import { renderPage } from '../../test/renderPage';

const RECORDS = [
    { kind: 'DKIM', type: 'CNAME', host: 'tok._domainkey.acme.com', value: 'tok.dkim.amazonses.com', required: true,
        status: 'OK', current_value: 'tok.dkim.amazonses.com', current_values: ['tok.dkim.amazonses.com'], suggested_value: 'tok.dkim.amazonses.com' },
    { kind: 'SPF', type: 'TXT', host: 'mail.acme.com', value: 'v=spf1 include:amazonses.com ~all', required: true,
        status: 'UPDATE', current_value: 'v=spf1 include:_spf.google.com ~all', current_values: ['v=spf1 include:_spf.google.com ~all'],
        suggested_value: 'v=spf1 include:_spf.google.com include:amazonses.com ~all' },
    { kind: 'MAIL_FROM', type: 'MX', host: 'mail.acme.com', value: '10 feedback-smtp.eu-west-1.amazonses.com', required: false,
        status: 'ADD', current_value: null, current_values: [], suggested_value: '10 feedback-smtp.eu-west-1.amazonses.com' },
    { kind: 'DMARC', type: 'TXT', host: '_dmarc.acme.com', value: 'v=DMARC1; p=none', required: true,
        status: 'UNKNOWN', current_value: null, current_values: [], suggested_value: 'v=DMARC1; p=none' },
];
const SUMMARY = { OK: 1, ADD: 1, UPDATE: 1, UNKNOWN: 1 };

describe('live DNS comparison (S-25)', () => {
    it('summarises the counts', () => {
        expect(liveSummaryText(SUMMARY)).toBe('1 OK · 1 to add · 1 to update · 1 unknown');
        expect(liveSummaryText({ OK: 3, ADD: 0, UPDATE: 0, UNKNOWN: 0 })).toBe('3 OK');
        expect(liveSummaryText(null)).toBe('');
    });

    it('shows each status with a word, the current and the suggested value', async () => {
        const user = userEvent.setup();
        const writeText = vi.fn().mockResolvedValue();
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
        render(<DnsRecordsPanel domainName="acme.com" records={RECORDS} dkimTokensAvailable liveSummary={SUMMARY} liveCheckedAt="2026-10-28T09:15:00" />);
        expect(screen.getByRole('columnheader', { name: 'Current value' })).toBeInTheDocument();
        const rows = screen.getAllByRole('row').slice(1);
        expect(within(rows[0]).getByText('OK')).toBeInTheDocument();
        expect(within(rows[1]).getByText('Update')).toBeInTheDocument();
        expect(within(rows[1]).getByText('v=spf1 include:_spf.google.com ~all')).toBeInTheDocument();
        expect(within(rows[1]).getByText('v=spf1 include:_spf.google.com include:amazonses.com ~all')).toBeInTheDocument();
        expect(within(rows[2]).getByText('Add')).toBeInTheDocument();
        expect(within(rows[2]).getByText('None')).toBeInTheDocument();
        expect(within(rows[3]).getByText('Unknown')).toBeInTheDocument();
        expect(within(rows[3]).getByText('Not checked')).toBeInTheDocument();
        const summary = screen.getByTestId('dns-live-summary');
        expect(summary).toHaveTextContent('Live DNS: 1 OK · 1 to add · 1 to update · 1 unknown');
        expect(summary).toHaveTextContent(/checked Oct 28, 2026/);
        await user.click(screen.getByRole('button', { name: 'Copy SPF value to publish' }));
        expect(writeText).toHaveBeenCalledWith('v=spf1 include:_spf.google.com include:amazonses.com ~all');
    });

    it('keeps the guidance layout without live statuses (right after adding a domain)', () => {
        const plain = RECORDS.map(({ kind, type, host, value, required }) => ({ kind, type, host, value, required }));
        render(<DnsRecordsPanel domainName="acme.com" records={plain} dkimTokensAvailable />);
        expect(screen.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: 'Status' })).toBeNull();
        expect(screen.queryByTestId('dns-live-summary')).toBeNull();
    });

    it('passes the live summary from the dns-records endpoint', async () => {
        renderPage(<DomainDnsModal domainName="acme.com" canManage onClose={vi.fn()} />, {
            http: {
                'GET /deliverability/domains/:name/dns-records': {
                    domain_name: 'acme.com', dns_records: RECORDS, dkim_tokens_available: true, spf_status: 'PASS',
                    dkim_status: 'PASS', dmarc_status: 'FAIL', live_summary: SUMMARY, live_checked_at: '2026-10-28T09:15:00',
                },
            },
        });
        expect(await screen.findByTestId('dns-live-summary')).toHaveTextContent('1 to update');
    });
});
