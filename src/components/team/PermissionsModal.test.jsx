// UAT2 F-06c: the permission editor lists Export Contacts (BR-CM-31) for admins and managers only, next to
// Export Reports (export_data), and saves the toggled keys.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PermissionsModal from './PermissionsModal';
import { permissionsForRole, PERMISSION_LIST } from './teamShared';

const member = (role, permissions) => ({ user_id: 'u-2', first_name: 'Grace', last_name: 'Hopper',
    email: 'grace@example.com', role, permissions });

describe('PermissionsModal', () => {
    it('shows a manager the contact export permission they hold by default, separate from report exports', () => {
        render(<PermissionsModal user={member('MANAGER', ['manage_campaigns', 'manage_templates', 'view_analytics', 'export_contacts'])}
            onClose={() => {}} onSave={() => {}} onReset={() => {}} />);
        expect(screen.getByText('Export Contacts')).toBeInTheDocument();
        expect(screen.getByText('Export Reports')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Save Permissions/ })).toBeDisabled();
    });

    it('does not offer contact export to an agent', () => {
        render(<PermissionsModal user={member('AGENT', ['manage_campaigns'])} onClose={() => {}} onSave={() => {}} onReset={() => {}} />);
        expect(screen.queryByText('Export Contacts')).not.toBeInTheDocument();
        expect(screen.getByText('Export Reports')).toBeInTheDocument();
    });

    it('saves the toggled keys', async () => {
        const onSave = vi.fn();
        render(<PermissionsModal user={member('MANAGER', ['view_analytics'])} onClose={() => {}} onSave={onSave} onReset={() => {}} />);
        await userEvent.click(screen.getByText('Export Contacts'));
        await userEvent.click(screen.getByRole('button', { name: /Save Permissions/ }));
        expect(onSave).toHaveBeenCalledWith(expect.arrayContaining(['view_analytics', 'export_contacts']));
    });

    it('permissionsForRole filters by role', () => {
        expect(permissionsForRole('ADMIN')).toHaveLength(PERMISSION_LIST.length);
        expect(permissionsForRole('AGENT').map(p => p.key)).not.toContain('export_contacts');
    });
});
