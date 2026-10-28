import { useEffect, useId, useRef, useState } from 'react';
import { DismissableLayer } from '@radix-ui/react-dismissable-layer';
import { FocusScope } from '@radix-ui/react-focus-scope';
import { focusElement, initialFocusTarget } from './focus';

/**
 * The panel of an overlay dialog (F5: on Radix UI primitives - the FocusScope and DismissableLayer that
 * @radix-ui/react-dialog is built from, so the caller keeps its own overlay markup and backdrop).
 *
 *   {open && (
 *       <div className="fixed inset-0 ...">
 *           <div className="absolute inset-0 bg-black/40" onClick={close} />
 *           <DialogPanel onClose={close} labelledBy="my-title" className="relative ...">
 *               <h2 id="my-title">...</h2> ...
 *           </DialogPanel>
 *       </div>
 *   )}
 *
 * - role="dialog" + aria-modal + aria-labelledby={labelledBy}
 * - focus moves in when it opens ([autofocus]/[data-autofocus], else the first form field, else the first control)
 * - Tab / Shift+Tab stay inside (Radix FocusScope, trapped + loop)
 * - Escape closes it (Radix DismissableLayer: only the top-most layer - a dialog, menu or select opened on top of
 *   it - reacts); closeOnEscape=false ignores Escape. An open combobox / menu button inside keeps its Escape.
 * - a click outside does nothing by itself: the caller's backdrop decides (onClick={close} or not)
 * - focus returns to the control that opened it, or returnFocusRef when that control is gone
 * `as` renders another element (e.g. motion.div); it must forward its ref.
 */
export default function DialogPanel({
    as: Tag = 'div', onClose, closeOnEscape = true, returnFocusRef, labelledBy, className = '', children, ...rest
}) {
    const generatedId = useId();
    // An aria-label (and no labelledBy) names the dialog instead of a title element
    const titleId = labelledBy || (rest['aria-label'] ? undefined : `dialog-title-${generatedId.replace(/:/g, '')}`);
    const panelRef = useRef(null);
    // The opener: read while rendering, before this dialog (or an autoFocus field in it) takes focus
    const [opener] = useState(() => (typeof document !== 'undefined' ? document.activeElement : null));
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    const onEscapeKeyDown = (event) => {
        if (!closeOnEscape || !onCloseRef.current || innerWidgetOwnsEscape(event.target, panelRef.current)) {
            event.preventDefault();
        }
    };

    const onMountAutoFocus = (event) => {
        event.preventDefault();
        if (panelRef.current) focusElement(initialFocusTarget(panelRef.current));
    };

    const onUnmountAutoFocus = (event) => {
        event.preventDefault();
        const node = panelRef.current;
        // Only when the dialog really left the page (not a StrictMode effect re-run)
        if (node && node.isConnected) return;
        const back = opener && opener.isConnected && opener !== document.body ? opener : returnFocusRef?.current;
        if (back && back.isConnected) focusElement(back);
    };

    return (
        <DismissableLayer
            asChild
            onEscapeKeyDown={onEscapeKeyDown}
            onPointerDownOutside={(event) => event.preventDefault()}
            onFocusOutside={(event) => event.preventDefault()}
            onDismiss={() => onCloseRef.current?.()}
        >
            <FocusScope asChild trapped loop onMountAutoFocus={onMountAutoFocus} onUnmountAutoFocus={onUnmountAutoFocus}>
                <Tag
                    {...rest}
                    ref={panelRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    className={`${className} outline-none`}
                >
                    {children}
                </Tag>
            </FocusScope>
        </DismissableLayer>
    );
}

/** An open combobox / menu inside the dialog closes itself on Escape instead of the dialog. */
function innerWidgetOwnsEscape(target, panel) {
    if (!panel || !target || target === panel || !panel.contains(target) || typeof target.closest !== 'function') return false;
    if (target.matches('[role="combobox"][aria-expanded="true"],[aria-haspopup]:not([aria-haspopup="false"])[aria-expanded="true"]')) return true;
    const popup = target.closest('[role="listbox"],[role="menu"]');
    return Boolean(popup && panel.contains(popup));
}
