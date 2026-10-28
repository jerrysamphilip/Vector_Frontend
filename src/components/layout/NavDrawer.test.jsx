import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useNavDrawer } from './useNavDrawer';
import { NavDrawerBackdrop, NavDrawerScope } from './NavDrawerLayer';

const tick = () => act(() => new Promise(r => setTimeout(r, 0)));

// setup.js: window.matchMedia reports no match, so this is the mobile (drawer) layout
function Shell() {
    const drawer = useNavDrawer();
    const open = !drawer.isDesktop && drawer.open;
    return (
        <>
            {open && <NavDrawerBackdrop onClose={drawer.closeDrawer} />}
            <NavDrawerScope open={open}>
                <aside ref={drawer.drawerRef} aria-label={open ? 'Navigation' : 'Main navigation'}
                    role={open ? 'dialog' : undefined} aria-modal={open ? 'true' : undefined}
                    inert={!open ? true : undefined}>
                    <Link to="/a">Dashboard</Link>
                    <Link to="/b">Contacts</Link>
                    <button type="button" onClick={drawer.closeDrawer}>Close navigation menu</button>
                </aside>
            </NavDrawerScope>
            <button type="button" ref={drawer.toggleRef} onClick={drawer.openDrawer}>Open navigation menu</button>
            <button type="button">Page button</button>
        </>
    );
}

async function openDrawer(user) {
    render(<MemoryRouter><Shell /></MemoryRouter>);
    const toggle = screen.getByRole('button', { name: 'Open navigation menu' });
    await user.click(toggle);
    return toggle;
}

describe('mobile nav drawer (Radix FocusScope + DismissableLayer)', () => {
    it('is a modal dialog only while open and focuses the first link', async () => {
        const user = userEvent.setup();
        render(<MemoryRouter><Shell /></MemoryRouter>);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Open navigation menu' }));
        expect(screen.getByRole('dialog', { name: 'Navigation' })).toHaveAttribute('aria-modal', 'true');
        expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveFocus();
    });

    it('traps Tab inside while open', async () => {
        const user = userEvent.setup();
        await openDrawer(user);
        act(() => screen.getByRole('button', { name: 'Close navigation menu' }).focus());
        await user.tab();
        expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveFocus();
        await user.tab({ shift: true });
        expect(screen.getByRole('button', { name: 'Close navigation menu' })).toHaveFocus();
    });

    it('closes on Escape and returns focus to the hamburger', async () => {
        const user = userEvent.setup();
        const toggle = await openDrawer(user);
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await tick();
        expect(toggle).toHaveFocus();
    });

    it('closes on a link followed (route change)', async () => {
        const user = userEvent.setup();
        await openDrawer(user);
        await user.click(screen.getByRole('link', { name: 'Contacts' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not swallow Escape while closed', async () => {
        const user = userEvent.setup();
        render(<MemoryRouter><Shell /></MemoryRouter>);
        let prevented = null;
        const onKey = (e) => { if (e.key === 'Escape') prevented = e.defaultPrevented; };
        document.addEventListener('keydown', onKey);
        act(() => screen.getByRole('button', { name: 'Page button' }).focus());
        await user.keyboard('{Escape}');
        document.removeEventListener('keydown', onKey);
        expect(prevented).toBe(false);
    });
});
