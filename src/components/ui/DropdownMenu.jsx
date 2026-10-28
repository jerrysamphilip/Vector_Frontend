import { forwardRef } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';

// Dropdown / actions menu (F5, shadcn/ui style on @radix-ui/react-dropdown-menu):
//
//   <DropdownMenu>
//       <DropdownMenuTrigger asChild><button>Views</button></DropdownMenuTrigger>
//       <DropdownMenuContent aria-label="Saved views" className="w-72 bg-white ...">
//           <DropdownMenuItem onSelect={apply}>All companies</DropdownMenuItem>
//       </DropdownMenuContent>
//   </DropdownMenu>
//
// role=menu / menuitem, aria-expanded + aria-haspopup on the trigger, arrow keys / Home / End / typeahead,
// Escape and a click outside close it, focus goes back to the trigger. Non-modal by default (no scroll lock or
// page-wide pointer block, so the page looks and behaves as before while it is open). Unstyled: callers keep
// their Tailwind classes. Items render a <button> unless asChild is given.

export function DropdownMenu({ modal = false, ...props }) {
    return <Menu.Root modal={modal} {...props} />;
}

export const DropdownMenuTrigger = Menu.Trigger;

export const DropdownMenuContent = forwardRef(function DropdownMenuContent(
    { className = '', sideOffset = 8, align = 'start', portal = true, ...props }, ref,
) {
    // An explicit aria-label names the menu (Radix otherwise labels it by the trigger)
    const labelled = props['aria-label'] && !props['aria-labelledby'] ? { 'aria-labelledby': undefined } : {};
    const content = (
        <Menu.Content ref={ref} sideOffset={sideOffset} align={align} className={`outline-none ${className}`} {...props} {...labelled} />
    );
    return portal ? <Menu.Portal>{content}</Menu.Portal> : content;
});

export const DropdownMenuItem = forwardRef(function DropdownMenuItem({ asChild, children, className = '', ...props }, ref) {
    return (
        <Menu.Item ref={ref} asChild {...props}>
            {asChild ? children : <button type="button" className={`outline-none focus-visible:bg-slate-50 data-[highlighted]:bg-slate-50 ${className}`}>{children}</button>}
        </Menu.Item>
    );
});

export const DropdownMenuSeparator = Menu.Separator;
export const DropdownMenuLabel = Menu.Label;
export const DropdownMenuGroup = Menu.Group;

export default DropdownMenu;
