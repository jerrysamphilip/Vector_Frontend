import { useRef, useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DialogPanel from './DialogPanel';
import { ConfirmProvider, useConfirm } from './ConfirmDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './DropdownMenu';

const tick = () => act(() => new Promise(r => setTimeout(r, 0)));

function Harness({ onCloseSpy = () => {}, closeOnEscape, backdropCloses = true, children }) {
    const [open, setOpen] = useState(false);
    const close = () => { onCloseSpy(); setOpen(false); };
    return (
        <>
            <button onClick={() => setOpen(true)}>Open dialog</button>
            <button>Behind the dialog</button>
            {open && (
                <div>
                    <div data-testid="backdrop" onClick={backdropCloses ? close : undefined} />
                    <DialogPanel onClose={close} closeOnEscape={closeOnEscape} labelledBy="dp-title">
                        <h2 id="dp-title">Edit rule</h2>
                        <button>Help</button>
                        <input aria-label="Name" />
                        <button onClick={close}>Save</button>
                        {children}
                    </DialogPanel>
                </div>
            )}
        </>
    );
}

async function open(user, props) {
    render(<Harness {...props} />);
    const opener = screen.getByRole('button', { name: 'Open dialog' });
    await user.click(opener);
    return opener;
}

describe('DialogPanel (Radix FocusScope + DismissableLayer)', () => {
    it('is a modal dialog named by its title, with focus on the first form field', async () => {
        const user = userEvent.setup();
        await open(user);
        const dialog = screen.getByRole('dialog', { name: 'Edit rule' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(screen.getByLabelText('Name')).toHaveFocus();
    });

    it('traps Tab and Shift+Tab', async () => {
        const user = userEvent.setup();
        await open(user);
        act(() => screen.getByRole('button', { name: 'Save' }).focus());
        await user.tab();
        expect(screen.getByRole('button', { name: 'Help' })).toHaveFocus();
        await user.tab({ shift: true });
        expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
    });

    it('closes on Escape and returns focus to the opener', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        const opener = await open(user, { onCloseSpy: onClose });
        await user.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await tick();
        expect(opener).toHaveFocus();
    });

    it('ignores Escape with closeOnEscape=false', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        await open(user, { onCloseSpy: onClose, closeOnEscape: false });
        await user.keyboard('{Escape}');
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('leaves outside clicks to the caller backdrop', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        await open(user, { onCloseSpy: onClose, backdropCloses: false });
        await user.click(screen.getByTestId('backdrop'));
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes from a backdrop that closes', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        await open(user, { onCloseSpy: onClose });
        await user.click(screen.getByTestId('backdrop'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('focuses an [data-autofocus] control first', () => {
        render(<DialogPanel labelledBy="x"><input aria-label="First" /><button data-autofocus>Cancel</button></DialogPanel>);
        expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    });

    it('returns focus to returnFocusRef when the opener is gone', async () => {
        const user = userEvent.setup();
        function Gone() {
            const fallback = useRef(null);
            const [state, setState] = useState('opener');
            return (
                <>
                    <button ref={fallback}>Fallback</button>
                    {state === 'opener' && <button onClick={() => setState('open')}>Transient opener</button>}
                    {state === 'open' && (
                        <DialogPanel onClose={() => setState('closed')} returnFocusRef={fallback} labelledBy="g">
                            <h2 id="g">Gone</h2><button>Inside</button>
                        </DialogPanel>
                    )}
                </>
            );
        }
        render(<Gone />);
        await user.click(screen.getByRole('button', { name: 'Transient opener' }));
        expect(screen.getByRole('button', { name: 'Inside' })).toHaveFocus();
        await user.keyboard('{Escape}');
        await tick();
        expect(screen.getByRole('button', { name: 'Fallback' })).toHaveFocus();
    });

    it('Escape closes only the top-most layer (a menu opened inside, then the dialog)', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(
            <DialogPanel onClose={onClose} labelledBy="m">
                <h2 id="m">With menu</h2>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><button>Actions</button></DropdownMenuTrigger>
                    <DropdownMenuContent aria-label="Actions"><DropdownMenuItem>Rename</DropdownMenuItem></DropdownMenuContent>
                </DropdownMenu>
            </DialogPanel>,
        );
        await user.click(screen.getByRole('button', { name: 'Actions' }));
        expect(screen.getByRole('menu')).toBeInTheDocument();
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
        await user.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});

describe('DialogPanel (former useDialog behaviour)', () => {
    it('only the top-most of nested dialogs reacts to Escape', async () => {
        const user = userEvent.setup();
        const outerClose = vi.fn();
        const innerClose = vi.fn();
        function Nested() {
            const [inner, setInner] = useState(false);
            return (
                <DialogPanel onClose={outerClose} labelledBy="outer">
                    <h2 id="outer">Outer</h2>
                    <button onClick={() => setInner(true)}>More options</button>
                    {inner && (
                        <DialogPanel onClose={() => { innerClose(); setInner(false); }} labelledBy="inner">
                            <h2 id="inner">Inner</h2>
                            <input aria-label="Inner field" />
                        </DialogPanel>
                    )}
                </DialogPanel>
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

    it('is named by an aria-label when no labelledBy is given', () => {
        render(<DialogPanel aria-label="DNS records for example.com"><button>Done</button></DialogPanel>);
        const dialog = screen.getByRole('dialog', { name: 'DNS records for example.com' });
        expect(dialog).not.toHaveAttribute('aria-labelledby');
    });
});

describe('ConfirmDialog over a DialogPanel modal', () => {
    function LegacyModal({ onClose }) {
        const titleId = 'legacy-title';
        const confirm = useConfirm();
        const [answer, setAnswer] = useState('');
        return (
            <DialogPanel onClose={onClose} labelledBy={titleId}>
                <h2 id={titleId}>Legacy</h2>
                <input aria-label="Legacy field" />
                <button onClick={async () => setAnswer(String(await confirm({ title: 'Really?', confirmLabel: 'Yes' })))}>Ask</button>
                <p>answer:{answer}</p>
            </DialogPanel>
        );
    }

    it('owns Tab and Escape while open, then gives focus back inside the modal', async () => {
        const user = userEvent.setup();
        const legacyClose = vi.fn();
        render(<ConfirmProvider><LegacyModal onClose={legacyClose} /></ConfirmProvider>);
        const ask = screen.getByRole('button', { name: 'Ask' });
        await user.click(ask);
        const cancel = screen.getByRole('button', { name: 'Cancel' });
        expect(cancel).toHaveFocus();
        await user.tab();
        expect(screen.getByRole('button', { name: 'Yes' })).toHaveFocus();
        await user.tab();
        expect(cancel).toHaveFocus();
        await user.keyboard('{Escape}');
        expect(legacyClose).not.toHaveBeenCalled();
        expect(await screen.findByText('answer:false')).toBeInTheDocument();
        await tick();
        expect(ask).toHaveFocus();
    });
});
