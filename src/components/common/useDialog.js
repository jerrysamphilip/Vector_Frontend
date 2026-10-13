import { useEffect, useId, useRef, useState } from 'react';

// Accessible modal behaviour shared by every overlay dialog (contacts/shared Modal, change password,
// platform admin dialogs ...):
//   - role="dialog" + aria-modal + aria-labelledby (spread `dialogProps` on the panel, put `titleId` on its title)
//   - focus moves into the dialog when it opens (first form field, else first control, else the panel)
//   - Tab / Shift+Tab stay inside (focus trap)
//   - Escape closes it
//   - focus returns to the control that opened it (or `returnFocusRef` when that control is gone,
//     e.g. a menu item of a menu that closed)
// Nested dialogs: only the top-most one reacts to Escape / Tab.

const FOCUSABLE = [
    'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])', 'textarea:not([disabled])', 'iframe', 'audio[controls]', 'video[controls]',
    '[contenteditable]:not([contenteditable="false"])', '[tabindex]:not([tabindex="-1"])',
].join(',');

const stack = [];

function focusables(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll(FOCUSABLE)).filter(el => {
        if (el.closest('[inert]')) return false;
        const style = window.getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') return false;
        return el.getClientRects().length > 0;
    });
}

function initialTarget(root) {
    const all = focusables(root);
    const auto = root.querySelector('[autofocus],[data-autofocus]');
    if (auto && all.includes(auto)) return auto;
    return all.find(el => el.matches('input:not([type="checkbox"]):not([type="radio"]),select,textarea')) || all[0] || root;
}

/**
 * Low-level modal behaviour on an element that is already in the page (used by useDialog and the mobile nav drawer):
 * joins the dialog stack, moves focus in (initialFocus(node) or the default target), traps Tab / Shift+Tab, pulls
 * escaped focus back and calls onEscape on Escape - all only while it is the top-most entry.
 * @returns {() => void} deactivate (does not move focus; the caller restores it)
 */
export function activateModal(node, { onEscape, initialFocus } = {}) {
    const entry = { node };
    stack.push(entry);
    const isTop = () => stack[stack.length - 1] === entry;
    const startTarget = () => (initialFocus && initialFocus(node)) || initialTarget(node);

    if (!node.contains(document.activeElement)) {
        const target = startTarget();
        if (target === node && !node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
    }

    const onKeyDown = (e) => {
        if (!isTop()) return;
        if (e.key === 'Escape' && onEscape && !e.defaultPrevented) {
            onEscape(e);
            return;
        }
        if (e.key !== 'Tab') return;
        const items = focusables(node);
        if (!items.length) { e.preventDefault(); node.focus(); return; }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        const inside = node.contains(active);
        if (e.shiftKey && (active === first || !inside || active === node)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (active === last || !inside)) { e.preventDefault(); first.focus(); }
    };
    // Focus that escapes (mouse click on the page behind, programmatic focus) is pulled back
    const onFocusIn = (e) => {
        if (!isTop() || node.contains(e.target)) return;
        // another dialog / popup rendered elsewhere (portals) may legitimately take focus
        if (e.target.closest && e.target.closest('[role="dialog"],[role="alertdialog"],[role="listbox"],[role="menu"]')) return;
        startTarget().focus({ preventScroll: true });
    };
    // bubble phase: a control inside the dialog (open menu, combobox) can handle Escape first and stop it
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('focusin', onFocusIn);
        const i = stack.indexOf(entry);
        if (i >= 0) stack.splice(i, 1);
    };
}

/**
 * @param {object} opts
 * @param {() => void} [opts.onClose]        called on Escape (omit / closeOnEscape=false to ignore Escape)
 * @param {boolean} [opts.closeOnEscape=true]
 * @param {React.RefObject} [opts.returnFocusRef] where focus goes on close when the opener is no longer in the page
 * @param {string} [opts.labelledBy]         id of an existing title element (default: the generated titleId)
 * @returns {{ dialogRef, titleId, dialogProps }}
 */
export function useDialog({ onClose, closeOnEscape = true, returnFocusRef, labelledBy } = {}) {
    const dialogRef = useRef(null);
    const generatedId = useId();
    const titleId = labelledBy || `dialog-title-${generatedId.replace(/:/g, '')}`;
    // The opener: read while rendering, before this dialog (or an autoFocus field in it) takes focus
    const [opener] = useState(() => (typeof document !== 'undefined' ? document.activeElement : null));
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    useEffect(() => {
        const node = dialogRef.current;
        if (!node) return undefined;
        const deactivate = activateModal(node, {
            onEscape: closeOnEscape ? () => onCloseRef.current?.() : null,
        });
        return () => {
            deactivate();
            const back = opener && opener.isConnected && opener !== document.body ? opener : returnFocusRef?.current;
            if (back && typeof back.focus === 'function') {
                // After the unmount commit. Only when the dialog really left the page: a re-run of this effect
                // (options changed, StrictMode's mount check) keeps the dialog open and focus where it is.
                setTimeout(() => {
                    if (!node.isConnected && back.isConnected) back.focus({ preventScroll: true });
                }, 0);
            }
        };
    }, [closeOnEscape, opener, returnFocusRef]);

    const dialogProps = {
        ref: dialogRef,
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': titleId,
    };
    return { dialogRef, titleId, dialogProps };
}

