import { describe, expect, it } from 'vitest';
import { deliveryLabel, nextEmailLabel, parseUtc, stepsLabel } from './leadTiming';
import { settingsError, settingsFormFrom, settingsPayload } from './settingsForm';

describe('lead-list timing columns', () => {
    it('reads API timestamps as UTC', () => {
        expect(parseUtc('2026-11-02T09:00:00').toISOString()).toBe('2026-11-02T09:00:00.000Z');
        expect(parseUtc('2026-11-02T09:00:00+00:00').toISOString()).toBe('2026-11-02T09:00:00.000Z');
        expect(parseUtc(null)).toBeNull();
    });

    it('labels steps, delivery and the next email', () => {
        expect(stepsLabel({ steps_sent: 1, steps_total: 3 })).toBe('1 / 3');
        expect(stepsLabel({ steps_total: 0 })).toBe('—');
        expect(deliveryLabel({ bounce_reason: 'Permanent: General', delivered_at: 'x' })).toMatchObject({ text: 'Bounced', tone: 'red' });
        expect(deliveryLabel({ delivered_at: 'x', ooo: true }).text).toBe('Delivered · Out of office');
        expect(deliveryLabel({}).text).toBe('—');
        expect(nextEmailLabel({ removed: true })).toBe('Removed');
        expect(nextEmailLabel({ stopped_reason: 'Replied' })).toBe('Stopped');
        expect(nextEmailLabel({ steps_sent: 3, steps_total: 3 })).toBe('Sequence done');
        expect(nextEmailLabel({ next_email_at: '2026-11-02T09:00:00' })).not.toBe('—');
    });
});

describe('settings form', () => {
    const campaign = {
        sender_name: 'Ann', sender_title: 'CTO', cta_link: 'https://cal.example.com', send_window_start: '08:30:00',
        send_window_end: '16:00:00', campaign_timezone: 'Europe/London', sending_mode: 'spread', min_gap_minutes: 2,
        batch_size: null, batch_gap_minutes: 30, daily_batch_size: 50, start_date: '2030-01-01', end_date: null,
        sending_inboxes: [{ inbox_id: 'i1' }],
    };

    it('round-trips and clears emptied optional fields with null', () => {
        const form = settingsFormFrom(campaign);
        expect(form.send_window_start).toBe('08:30');
        const body = settingsPayload({ ...form, sender_title: ' ', cta_link: '', daily_batch_size: '', start_date: '' });
        expect(body).toMatchObject({
            sender_name: 'Ann', sender_title: null, cta_link: null, daily_batch_size: null, start_date: null,
            end_date: null, batch_size: null, campaign_timezone: 'Europe/London', inbox_ids: ['i1'],
        });
    });

    it('validates window, dates, batch size and inboxes', () => {
        const form = settingsFormFrom(campaign);
        expect(settingsError(form)).toBeNull();
        expect(settingsError({ ...form, send_window_end: '08:00' })).toMatch(/window/);
        expect(settingsError({ ...form, end_date: '2029-01-01' })).toMatch(/end date/);
        expect(settingsError({ ...form, sending_mode: 'batch' })).toMatch(/batch/);
        expect(settingsError({ ...form, inbox_ids: [] })).toMatch(/inbox/);
    });
});
