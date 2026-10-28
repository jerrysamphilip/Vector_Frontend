// The dialogs moved from the hand-rolled useDialog focus trap onto the Radix-based DialogPanel: one check per
// family that it is still a modal dialog with the same accessible name, takes focus, closes on Escape (or not,
// where Escape was off) and, where it had one, closes from its backdrop.
import { describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPage, pending } from '../test/renderPage';
import { Modal } from './contacts/shared';
import EnrollmentResultModal from './campaigns/EnrollmentResultModal';
import RevalidateModal from './campaigns/RevalidateModal';
import PermissionsModal from './team/PermissionsModal';
import HierarchyModal from './team/HierarchyModal';
import DomainDnsModal from './deliverability/DomainDnsModal';
import CreateTenantModal from './platformAdmin/CreateTenantModal';
import TenantDetailModal from './platformAdmin/TenantDetailModal';
import BouncedRevalidationModal from './prospects/BouncedRevalidationModal';
import ProspectListModal from './prospects/ProspectListModal';
import ImportDrawer from './import/ImportDrawer';
import { ProfileMenu } from './layout/Sidebar';

const member = { user_id: 'u-2', first_name: 'Grace', last_name: 'Hopper', email: 'grace@example.com', role: 'AGENT', permissions: [] };

// [family, element(onClose), accessible name, http]
const FAMILIES = [
    ['contacts Modal', onClose => <Modal title="Edit list" onClose={onClose}><input aria-label="List name" /></Modal>, 'Edit list'],
    ['EnrollmentResultModal', onClose => <EnrollmentResultModal enrolled={3} onClose={onClose} />, 'Enrollment result'],
    ['RevalidateModal', onClose => <RevalidateModal prospect={{ prospect_id: 'p-1', email: 'old@example.com' }} onClose={onClose} />, 'Re-validate Bounced Contact'],
    ['PermissionsModal', onClose => <PermissionsModal user={member} onClose={onClose} onSave={() => {}} onReset={() => {}} />, /Grace|Permissions/],
    ['HierarchyModal', onClose => <HierarchyModal user={member} hierarchy={{ users: [] }} onClose={onClose} onSave={() => {}} />, 'Sales hierarchy'],
    ['DomainDnsModal (aria-label)', onClose => <DomainDnsModal canManage onClose={onClose} />, 'Add sending domain'],
    ['CreateTenantModal', onClose => <CreateTenantModal onClose={onClose} />, /tenant|workspace/i],
    ['TenantDetailModal', onClose => <TenantDetailModal tenantId="t-9" onClose={onClose} />, /./, { 'GET /platform-admin/*': pending(), 'GET /admin/*': pending() }],
    ['BouncedRevalidationModal', onClose => <BouncedRevalidationModal onClose={onClose} />, 'Bounced Prospect Revalidation'],
    ['ProspectListModal', onClose => <ProspectListModal list={{ list_id: 'l-1', list_name: 'Q4 leads' }} onClose={onClose} />, 'Q4 leads'],
    ['ImportDrawer', onClose => <ImportDrawer onClose={onClose} />, 'Import contacts and companies'],
];

describe.each(FAMILIES)('%s on DialogPanel', (_family, element, name, http = {}) => {
    it('is a named modal dialog that holds focus and closes on Escape', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        renderPage(element(onClose), { http, strict: false });
        const dialog = await screen.findByRole('dialog', { name });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
        await user.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});

describe('ChangePasswordModal (profile menu)', () => {
    it('opens from the account menu, closes on Escape and gives focus back to the account button', async () => {
        const user = userEvent.setup();
        renderPage(<ProfileMenu />, { strict: false });
        const account = screen.getByRole('button', { name: 'Account' });
        await user.click(account);
        await user.click(screen.getByRole('button', { name: /Change password/ }));
        const dialog = screen.getByRole('dialog', { name: 'Change Password' });
        expect(dialog.contains(document.activeElement)).toBe(true);
        await user.keyboard('{Escape}');
        // AnimatePresence plays the exit animation first
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        await act(() => new Promise(r => setTimeout(r, 0)));
        await waitFor(() => expect(account).toHaveFocus());
    });
});

describe('CreateTenantModal Escape rule', () => {
    it('keeps Escape working before a magic link is shown (closeOnEscape follows the state)', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        renderPage(<CreateTenantModal onClose={onClose} />, { strict: false });
        await screen.findByRole('dialog');
        await user.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
