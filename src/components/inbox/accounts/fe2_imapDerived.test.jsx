// S-26: mailboxes say whether replies can be read and when the IMAP settings are derived from SMTP.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ConnectionPanel from './ConnectionPanel';
import InboxRow, { ImapBadge } from './InboxRow';
import { inboxesApi } from '../../../api/inboxes';

const inbox = (extra = {}) => ({
    inbox_id: 'i1', email_address: 'me@acme.com', provider: 'SMTP', status: 'ACTIVE', warmup_enabled: false,
    smtp_host: 'smtp.acme.com', smtp_port: 587, has_smtp_password: true, imap_host: null, has_imap_password: false,
    imap_configured: true, imap_derived_from_smtp: true, ...extra,
});
const noop = () => {};

describe('IMAP derived from SMTP (S-26)', () => {
    it('shows the derived settings on the mailbox detail and allows the test', async () => {
        const user = userEvent.setup();
        vi.spyOn(inboxesApi, 'testImap').mockResolvedValue({
            status: 'connected', imap_host: 'imap.acme.com', imap_port: 993, imap_derived_from_smtp: true, inbox_message_count_last_7d: 4,
        });
        render(<ConnectionPanel inbox={inbox()} onEdit={noop} />);
        expect(screen.getByTestId('imap-derived')).toHaveTextContent('IMAP: derived from SMTP settings');
        expect(screen.getByText('From SMTP server')).toBeInTheDocument();
        expect(screen.getAllByText('Configured')).toHaveLength(2);
        await user.click(screen.getByRole('button', { name: /test receiving sign-in/i }));
        const status = await screen.findByRole('status');
        expect(status).toHaveTextContent('Signed in to the mailbox. 4 emails');
        expect(status).toHaveTextContent('IMAP: derived from SMTP settings (imap.acme.com:993).');
    });

    it('marks IMAP as incomplete when the API says it is not configured', () => {
        render(<ConnectionPanel inbox={inbox({ imap_configured: false, imap_derived_from_smtp: false, smtp_host: null })} onEdit={noop} />);
        expect(screen.queryByTestId('imap-derived')).toBeNull();
        expect(screen.getAllByText('Incomplete')).toHaveLength(2);
        expect(screen.getByRole('button', { name: /test receiving sign-in/i })).toBeDisabled();
    });

    it('labels the mailbox row', () => {
        render(<InboxRow inbox={inbox()} isSelected={false} onSelect={noop} onEdit={noop} onDelete={noop} onToggleWarmup={noop} onConnectMs365={noop} />);
        expect(screen.getByText('IMAP: derived from SMTP')).toBeInTheDocument();
        const { container } = render(<ImapBadge inbox={inbox({ imap_configured: false, imap_derived_from_smtp: false })} />);
        expect(container).toHaveTextContent('IMAP: not set up');
        const saved = render(<ImapBadge inbox={inbox({ imap_derived_from_smtp: false })} />);
        expect(saved.container).toBeEmptyDOMElement();
    });
});
