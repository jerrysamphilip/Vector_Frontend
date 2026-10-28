import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider, useConfirm } from './ConfirmDialog';

function Asker({ options, onResult }) {
    const confirm = useConfirm();
    return <button type="button" onClick={async () => onResult(await confirm(options))}>Delete it</button>;
}
const setup = (options = { title: 'Delete report?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true }) => {
    const onResult = vi.fn();
    render(<ConfirmProvider><Asker options={options} onResult={onResult} /></ConfirmProvider>);
    return onResult;
};

afterEach(() => { vi.restoreAllMocks(); });

describe('useConfirm', () => {
    it('opens an accessible dialog and resolves true on confirm', async () => {
        const onResult = setup();
        await userEvent.click(screen.getByRole('button', { name: 'Delete it' }));
        const dialog = screen.getByRole('dialog', { name: 'Delete report?' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAccessibleDescription('This cannot be undone.');
        // focus starts on the safe choice
        expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
        await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
        await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('resolves false on Cancel and on Escape, and focus returns to the opener', async () => {
        const onResult = setup('Delete this task?');
        const opener = screen.getByRole('button', { name: 'Delete it' });
        await userEvent.click(opener);
        expect(screen.getByRole('dialog', { name: 'Are you sure?' })).toHaveTextContent('Delete this task?');
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        await waitFor(() => expect(onResult).toHaveBeenLastCalledWith(false));

        await userEvent.click(opener);
        await userEvent.keyboard('{Escape}');
        await waitFor(() => expect(onResult).toHaveBeenCalledTimes(2));
        expect(onResult).toHaveBeenLastCalledWith(false);
        await waitFor(() => expect(opener).toHaveFocus());
    });

    it('falls back to window.confirm without a provider', async () => {
        const spy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        const onResult = vi.fn();
        render(<Asker options={{ title: 'Delete?', message: 'Sure?' }} onResult={onResult} />);
        await userEvent.click(screen.getByRole('button', { name: 'Delete it' }));
        await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
        expect(spy).toHaveBeenCalledWith('Delete?\n\nSure?');
    });
});
