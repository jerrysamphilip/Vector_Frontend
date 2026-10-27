import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, ExternalLink, MoreVertical, Pause, PenLine, Play, Rocket, Trash2 } from 'lucide-react';
import { menuItems } from './menuItems';

const MENU_WIDTH = 240;
const GAP = 6;
const EDGE = 8;

const ICONS = { rename: PenLine, duplicate: Copy, view: ExternalLink, launch: Rocket, pause: Pause, resume: Play, delete: Trash2 };
const TONES = { launch: 'text-emerald-600', resume: 'text-emerald-600', pause: 'text-amber-600', delete: 'text-rose-600' };

/**
 * The "⋮" actions menu of a campaign (campaign rows and the CampaignDetails header): Rename, Duplicate,
 * Launch (drafts), Pause / Resume, Delete, offered by role (menuItems.js). Calls onAction(action, campaign, event).
 * Rendered in a portal with position: fixed so the table's sticky, scrolling Actions column cannot clip it.
 * Keyboard: Enter / Space opens, arrows move, Escape closes and returns focus to the button.
 */
export default function CampaignActionsMenu({ campaign, onAction, disabled = false, showView = false, role }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);
    const menuRef = useRef(null);
    const items = open ? menuItems(campaign, { showView, role }) : [];

    useLayoutEffect(() => {
        if (!open || !buttonRef.current || !menuRef.current) return;
        const btn = buttonRef.current.getBoundingClientRect();
        const height = menuRef.current.scrollHeight;
        const below = btn.bottom + GAP + height + EDGE <= window.innerHeight;
        const top = below ? btn.bottom + GAP : Math.max(EDGE, btn.top - GAP - height);
        const left = Math.min(Math.max(EDGE, btn.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - EDGE);
        setPos({ top, left });
        menuRef.current.querySelector('[role="menuitem"]')?.focus();
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const close = () => setOpen(false);
        const onDown = (e) => {
            if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) close();
        };
        const onKey = (e) => {
            if (e.key === 'Escape') { close(); buttonRef.current?.focus(); }
        };
        const onScroll = (e) => { if (!menuRef.current?.contains(e.target)) close(); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', close);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', close);
        };
    }, [open]);

    const onMenuKey = (e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const all = [...menuRef.current.querySelectorAll('[role="menuitem"]')];
        const i = all.indexOf(document.activeElement);
        all[e.key === 'ArrowDown' ? (i + 1) % all.length : (i - 1 + all.length) % all.length]?.focus();
    };

    const select = (action, e) => {
        e.stopPropagation();
        setOpen(false);
        onAction(action, campaign, e);
    };

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                disabled={disabled}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`More actions for ${campaign.campaign_name}`}
                title="More actions"
                onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
                className={`w-8 h-8 inline-flex items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${open ? 'border-indigo-200 bg-indigo-50 text-indigo-600' : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
                <MoreVertical className="w-4 h-4" />
            </button>
            {open && createPortal(
                <div
                    ref={menuRef}
                    role="menu"
                    aria-label={`Actions for ${campaign.campaign_name}`}
                    onKeyDown={onMenuKey}
                    onClick={(e) => e.stopPropagation()}
                    style={{ position: 'fixed', top: pos.top, left: pos.left, width: MENU_WIDTH }}
                    className="z-[100] bg-white rounded-xl border border-slate-200 shadow-xl py-1.5"
                >
                    {items.map(({ action, label, divider }) => {
                        const Icon = ICONS[action];
                        return (
                            <div key={action} className={divider ? 'border-t border-slate-100 mt-1 pt-1' : ''}>
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={(e) => select(action, e)}
                                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-left text-sm hover:bg-slate-50 focus:bg-slate-50 focus:outline-none ${TONES[action] || 'text-slate-700'}`}
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    {label}
                                </button>
                            </div>
                        );
                    })}
                </div>,
                document.body,
            )}
        </>
    );
}
