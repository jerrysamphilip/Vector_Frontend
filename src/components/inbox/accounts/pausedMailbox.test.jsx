import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import InboxRow, { sendingCapacity } from './InboxRow';
import { PausedBadge, ResumeButton } from './PausedMailbox';
import AlertPreferencesModal, { LABELS } from '../AlertPreferencesModal';

const inbox = (extra = {}) => ({
    inbox_id: 'i1', email_address: 'me@acme.com', provider: 'SMTP', status: 'ACTIVE', warmup_enabled: false,
    current_daily_limit: 500, emails_sent_today: 3, ...extra,
});

const noop = () => {};

describe('paused mailbox (F-20)', () => {
    it('computes capacity from the server fields, with a fallback', () => {
        expect(sendingCapacity(inbox({ daily_capacity: 144, sent_today: 44, remaining_today: 100 })))
            .toEqual({ sent: 44, capacity: 144, pct: 31, remaining: 100 });
        expect(sendingCapacity(inbox())).toEqual({ sent: 3, capacity: 500, pct: 1, remaining: 497 });
    });

    it('shows the badge with the reason and resumes', async () => {
        const onResume = vi.fn();
        render(<InboxRow inbox={inbox({ status: 'PAUSED', paused_reason: 'SES refused the sender', daily_capacity: 144, sent_today: 0 })}
            isSelected={false} onSelect={noop} onEdit={noop} onDelete={noop} onToggleWarmup={noop}
            onConnectMs365={noop} onResume={onResume} />);
        expect(screen.getByTestId('paused-badge')).toHaveAttribute('title', expect.stringContaining('SES refused the sender'));
        expect(screen.getByText('SES refused the sender')).toBeInTheDocument();
        expect(screen.getByText('0 / 144')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Resume sending' }));
        expect(onResume).toHaveBeenCalledWith(expect.objectContaining({ inbox_id: 'i1' }));
    });

    it('has no badge or resume action for an active mailbox', () => {
        render(<InboxRow inbox={inbox()} isSelected={false} onSelect={noop} onEdit={noop} onDelete={noop}
            onToggleWarmup={noop} onConnectMs365={noop} onResume={noop} />);
        expect(screen.queryByTestId('paused-badge')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Resume sending' })).toBeNull();
    });

    it('badge and button render on their own', () => {
        render(<><PausedBadge inbox={{ paused_reason: null }} /><ResumeButton onResume={noop} busy /></>);
        expect(screen.getByTestId('paused-badge')).toHaveTextContent('Paused');
        expect(screen.getByRole('button', { name: 'Resume sending' })).toBeDisabled();
    });
});

describe('alert preferences modal', () => {
    it('lists the sending-pipeline alert types', () => {
        const types = ['NO_ACTIVE_MAILBOX', 'INBOX_LIMIT_REACHED', 'SEND_FAILURE_RATE', 'DELIVERY_EVENTS_MISSING',
            'SES_UNAVAILABLE', 'STUCK_SENDING'];
        const data = {
            tenant_preferences: types.map(t => ({ scope_type: 'TENANT', scope_id: null, alert_type: t, enabled: true,
                email_enabled: false, cooldown_minutes: 360 })),
            inbox_preferences: [],
        };
        render(<AlertPreferencesModal isOpen onClose={noop} data={data} onSave={noop} />);
        for (const t of types) expect(screen.getByText(LABELS[t])).toBeInTheDocument();
        expect(screen.getByText(/Warning at 5 % failed sends/)).toBeInTheDocument();
    });
});
