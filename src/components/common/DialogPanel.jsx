import { useDialog } from './useDialog';

/**
 * The panel of a hand-built overlay dialog, with the useDialog behaviour: role=dialog, aria-modal,
 * aria-labelledby={labelledBy}, focus moved in, Tab trap, Escape closes (top-most dialog only), focus back to the opener.
 * Drop-in for the panel element of an inline `{open && (<div className="fixed inset-0 ...">...)}` overlay: it mounts
 * with the overlay, so the hook runs when the dialog opens. `as` renders another element (e.g. motion.div).
 */
export default function DialogPanel({
    as: Tag = 'div', onClose, closeOnEscape = true, returnFocusRef, labelledBy, className = '', children, ...rest
}) {
    const { dialogProps } = useDialog({ onClose, closeOnEscape, returnFocusRef, labelledBy });
    return (
        <Tag {...rest} {...dialogProps} className={`${className} outline-none`}>
            {children}
        </Tag>
    );
}
