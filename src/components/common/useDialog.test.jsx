import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDialog } from './useDialog';
import DialogPanel from './DialogPanel';

function Dialog({ onClose, closeOnEscape, children }) {
    const { titleId, dialogProps } = useDialog({ onClose, closeOnEscape });
    return (
        <div {...dialogProps}>
            <h2 id={titleId}>Edit contact</h2>
            {children}
        </div>
    );
}

function Harness({ onCloseSpy = () => {}, closeOnEscape }) {
    const [open, setOpen] = useState(false);
    const close = () => { onCloseSpy(); setOpen(false); };
    return (
        <>
            <button onClick={() => setOpen(true)}>Open dialog</button>
            <button>Behind the dialog</button>
            {open && (
                <Dialog onClose={close} closeOnEscape={closeOnEscape}>
                    <button>Help</button>
                    <input aria-label="Name" />
                    <input aria-label="Email" />
                    <button onClick={close}>Save</button>
                </Dialog>
            )}
        </>
    );
}

async function openDialog(user, props) {
    render(<Harness {...props} />);
    const opener = screen.getByRole('button', { name: 'Open dialog' });
    await user.click(opener);
    return opener;
}

describe('useDialog', () => {
    afterEach(() => vi.useRealTimers());

    it('labels the panel as a modal dialog by its title', async () => {
        const user = userEvent.setup();
        await openDialog(user);
        const dialog = screen.getByRole('dialog', { name: 'Edit contact' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('moves focus to the first form field when it opens', async () => {
        const user = userEvent.setup();
        await openDialog(user);
        expect(screen.getByLabelText('Name')).toHaveFocus();
    });

    it('traps Tab and Shift+Tab inside the dialog', async () => {
        const user = userEvent.setup();
        await openDialog(user);
        screen.getByRole('button', { name: 'Save' }).focus();
        await user.tab();
        expect(screen.getByRole('button', { name: 'Help' })).toHaveFocus();
        await user.tab({ shift: true });
        expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
    });

    it('closes on Escape and returns focus to the opener', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        const opener = await openDialog(user, { onCloseSpy: onClose });
        await user.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await act(() => new Promise(r => setTimeout(r, 0)));
        expect(opener).toHaveFocus();
    });

    it('ignores Escape when closeOnEscape is false', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        await openDialog(user, { onCloseSpy: onClose, closeOnEscape: false });
        await user.keyboard('{Escape}');
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('pulls focus back when it escapes to the page behind', async () => {
        const user = userEvent.setup();
        await openDialog(user);
        act(() => screen.getByRole('button', { name: 'Behind the dialog' }).focus());
        expect(screen.getByLabelText('Name')).toHaveFocus();
    });

    it('only the top-most of nested dialogs reacts to Escape', async () => {
        const user = userEvent.setup();
        const outerClose = vi.fn();
        const innerClose = vi.fn();
        function Nested() {
            const [inner, setInner] = useState(false);
            return (
                <Dialog onClose={outerClose}>
                    <button onClick={() => setInner(true)}>More options</button>
                    {inner && (
                        <Dialog onClose={() => { innerClose(); setInner(false); }}>
                            <input aria-label="Inner field" />
                        </Dialog>
                    )}
                </Dialog>
            );
        }
        render(<Nested />);
        await user.click(screen.getByRole('button', { name: 'More options' }));
        expect(screen.getByLabelText('Inner field')).toHaveFocus();
        await user.keyboard('{Escape}');
        expect(innerClose).toHaveBeenCalledTimes(1);
        expect(outerClose).not.toHaveBeenCalled();
        await user.keyboard('{Escape}');
        expect(outerClose).toHaveBeenCalledTimes(1);
    });
});

describe('DialogPanel', () => {
    it('renders a labelled dialog panel that closes on Escape', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(
            <DialogPanel onClose={onClose} labelledBy="t" className="panel">
                <h3 id="t">Delete prospect?</h3>
                <button>Delete</button>
            </DialogPanel>,
        );
        const dialog = screen.getByRole('dialog', { name: 'Delete prospect?' });
        expect(dialog).toHaveClass('panel', 'outline-none');
        expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
        await user.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
