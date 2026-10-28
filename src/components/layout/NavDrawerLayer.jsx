import { DismissableLayer } from '@radix-ui/react-dismissable-layer';
import { FocusScope } from '@radix-ui/react-focus-scope';

// The mobile nav drawer on the same Radix primitives as DialogPanel (FocusScope + DismissableLayer), without
// remounting the sidebar when it opens: the sidebar stays in the page at every width and is a modal dialog only
// while the drawer is open.
//   <NavDrawerBackdrop onClose={close} />          rendered only while open; joins the Radix layer stack, so Escape
//                                                  closes the drawer unless a menu / dialog opened on top owns it
//   <NavDrawerScope open={drawerOpen}><aside .../></NavDrawerScope>
//                                                  Tab / Shift+Tab trapped (and looping) inside while open
// useNavDrawer moves focus to the first link on open and back to the hamburger on close.

const preventDefault = (event) => event.preventDefault();

export function NavDrawerBackdrop({ onClose }) {
    return (
        <DismissableLayer
            asChild
            onPointerDownOutside={preventDefault}
            onFocusOutside={preventDefault}
            onDismiss={() => onClose?.()}
        >
            <div className="fixed top-0 right-0 bottom-0 left-0 z-40 bg-slate-900/50 lg:hidden" onClick={onClose} aria-hidden="true" />
        </DismissableLayer>
    );
}

export function NavDrawerScope({ open, children }) {
    return (
        <FocusScope asChild trapped={open} loop={open} onMountAutoFocus={preventDefault} onUnmountAutoFocus={preventDefault}>
            {children}
        </FocusScope>
    );
}
