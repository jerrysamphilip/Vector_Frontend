import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { activateModal } from '../common/useDialog';

// Below the lg breakpoint (1024px: phones and tablets) the sidebar is an off-canvas drawer opened by the
// hamburger in the top bar. It closes on route change, Escape and a click on the backdrop. While open it is a modal
// dialog (the layouts put role="dialog" aria-modal on it only then): focus moves to its first link, Tab / Shift+Tab
// stay inside (the useDialog stack, so a dialog opened on top of it takes over), and focus goes back to the hamburger
// when it closes. From lg up the sidebar is always shown, as before, and is not a dialog.
export const DESKTOP_QUERY = '(min-width: 1024px)';

export function useMediaQuery(query) {
    const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : true);
    const [matches, setMatches] = useState(get);
    useEffect(() => {
        if (!window.matchMedia) return undefined;
        const mql = window.matchMedia(query);
        const onChange = () => setMatches(mql.matches);
        onChange();
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, [query]);
    return matches;
}

/** { isDesktop, open, openDrawer, closeDrawer, toggleRef, drawerRef } for Layout / AdminLayout. */
export function useNavDrawer() {
    const isDesktop = useMediaQuery(DESKTOP_QUERY);
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const toggleRef = useRef(null);
    const drawerRef = useRef(null);

    // Route change (a nav link was followed) or growing to desktop width closes it
    useEffect(() => { setOpen(false); }, [location.pathname, location.search, location.hash]);
    useEffect(() => { if (isDesktop) setOpen(false); }, [isDesktop]);

    useEffect(() => {
        const node = drawerRef.current;
        if (!open || !node) return undefined;
        // focus to the first nav link, Tab trapped inside, Escape (top-most dialog only) closes
        const deactivate = activateModal(node, {
            onEscape: () => setOpen(false),
            initialFocus: n => Array.from(n.querySelectorAll('a[href]')).find(a => a.getClientRects().length > 0),
        });
        // no page scroll behind the open drawer
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            deactivate();
            document.body.style.overflow = prev;
            // closed (Escape, backdrop, close button, a link followed): focus back to the hamburger, unless focus has
            // already moved somewhere else on purpose or the hamburger is gone (grown to desktop width)
            const toggle = toggleRef.current;
            const active = document.activeElement;
            if (toggle && toggle.isConnected && toggle.getClientRects().length > 0
                && (!active || active === document.body || node.contains(active))) {
                toggle.focus({ preventScroll: true });
            }
        };
    }, [open]);

    return {
        isDesktop,
        open,
        openDrawer: () => setOpen(true),
        closeDrawer: () => setOpen(false),
        toggleRef,
        drawerRef,
    };
}
