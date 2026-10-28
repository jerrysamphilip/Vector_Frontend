// Focus helpers shared by the dialog primitives.

export const FOCUSABLE = [
    'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])', 'textarea:not([disabled])', 'iframe', 'audio[controls]', 'video[controls]',
    '[contenteditable]:not([contenteditable="false"])', '[tabindex]:not([tabindex="-1"])',
].join(',');

/** The focusable controls in root that are rendered (not inert, hidden or display:none). */
export function focusables(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll(FOCUSABLE)).filter(el => {
        if (el.closest('[inert]')) return false;
        const style = window.getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') return false;
        return el.getClientRects().length > 0;
    });
}

/**
 * Where focus goes when a dialog opens: an [autofocus] / [data-autofocus] control, else the first form field,
 * else the first control, else the panel itself.
 */
export function initialFocusTarget(root) {
    const all = focusables(root);
    const auto = root.querySelector('[autofocus],[data-autofocus]');
    if (auto && all.includes(auto)) return auto;
    return all.find(el => el.matches('input:not([type="checkbox"]):not([type="radio"]),select,textarea')) || all[0] || root;
}

/** Focus el; a panel without tabindex gets tabindex=-1 first so it can take focus. */
export function focusElement(el) {
    if (!el || typeof el.focus !== 'function') return;
    if (el.matches?.('[role="dialog"],[role="alertdialog"]') && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
}
