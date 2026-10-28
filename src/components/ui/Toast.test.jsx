import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './Toast';

let api;
function Grab() { api = useToast(); return null; }
const setup = () => render(<ToastProvider><Grab /></ToastProvider>);
const apiError = (status, detail) => ({
    message: `Request failed with status code ${status}`,
    response: { status, data: { detail }, headers: { 'x-request-id': 'req-42' } },
});

afterEach(() => { vi.useRealTimers(); });

describe('Toast', () => {
    it('announces success / info politely and errors assertively', () => {
        setup();
        act(() => { api.success('Report saved'); api.info('Sync started'); api.error('Export failed'); });
        const polite = screen.getByTestId('toast-region-polite');
        const assertive = screen.getByTestId('toast-region-assertive');
        expect(polite).toHaveAttribute('aria-live', 'polite');
        expect(assertive).toHaveAttribute('aria-live', 'assertive');
        expect(within(polite).getByText('Report saved')).toBeInTheDocument();
        expect(within(polite).getByText('Sync started')).toBeInTheDocument();
        expect(within(assertive).getByText('Export failed')).toBeInTheDocument();
    });

    it('shows an API error as a plain sentence with the request reference', () => {
        setup();
        act(() => { api.error(apiError(500, 'Internal Server Error'), { title: 'Could not save' }); });
        const toast = screen.getByTestId('toast-error');
        expect(within(toast).getByText('Could not save')).toBeInTheDocument();
        expect(within(toast).getByText(/went wrong on our side/i)).toBeInTheDocument();
        expect(within(toast).getByText('req-42')).toBeInTheDocument();
    });

    it('keeps the server message when it is a human one', () => {
        setup();
        act(() => { api.error(apiError(403, 'Only admins can export')); });
        expect(screen.getByText('Only admins can export')).toBeInTheDocument();
    });

    it('dismisses automatically (errors stay longer) and on the close button', async () => {
        vi.useFakeTimers();
        setup();
        act(() => { api.success('Saved'); api.error('Failed'); });
        act(() => { vi.advanceTimersByTime(5100); });
        expect(screen.queryByText('Saved')).toBeNull();
        expect(screen.getByText('Failed')).toBeInTheDocument();
        act(() => { vi.advanceTimersByTime(5000); });
        expect(screen.queryByText('Failed')).toBeNull();
        vi.useRealTimers();

        act(() => { api.info('Stays until closed', { duration: 0 }); });
        await userEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
        expect(screen.queryByText('Stays until closed')).toBeNull();
    });

    it('does nothing without a provider', () => {
        render(<Grab />);
        expect(() => api.error('x')).not.toThrow();
    });
});
