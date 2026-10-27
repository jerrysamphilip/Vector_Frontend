import { getStoredUser } from '../../../lib/authStorage';

// Backend role gates: launch / pause / resume need MANAGER or above, delete needs ADMIN or above
// (app/routers/campaign_router.py); rename / duplicate need the manage_campaigns permission.
export const STATE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
export const DELETE_ROLES = ['SUPER_ADMIN', 'ADMIN'];

/** The actions offered for a campaign, in menu order: [{ action, label, divider? }]. */
export function menuItems(campaign, { showView = false, role = getStoredUser()?.role } = {}) {
    const items = [
        { action: 'rename', label: 'Rename' },
        { action: 'duplicate', label: 'Duplicate' },
    ];
    if (showView) items.push({ action: 'view', label: 'View details' });
    if (STATE_ROLES.includes(role)) {
        const state = { DRAFT: ['launch', 'Launch'], ACTIVE: ['pause', 'Pause'], PAUSED: ['resume', 'Resume'] }[campaign.status];
        if (state) items.push({ action: state[0], label: state[1], divider: true });
    }
    if (DELETE_ROLES.includes(role)) items.push({ action: 'delete', label: 'Delete', divider: true });
    return items;
}
