import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Below the lg breakpoint (1024px: phones and tablets) the sidebar is an off-canvas drawer opened by the
// hamburger in the top bar. It closes on route change, Escape and a click on the backdrop. From lg up the
// sidebar is always shown, as before.
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
        if (!open) return undefined;
        // focus into the drawer, Escape closes it and gives focus back to the hamburger
        const first = drawerRef.current?.querySelector('[data-drawer-close]') || drawerRef.current?.querySelector('a[href],button');
        first?.focus({ preventScroll: true });
        const onKey = (e) => {
            if (e.key === 'Escape') { setOpen(false); toggleRef.current?.focus({ preventScroll: true }); }
        };
        document.addEventListener('keydown', onKey);
        // no page scroll behind the open drawer
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
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
