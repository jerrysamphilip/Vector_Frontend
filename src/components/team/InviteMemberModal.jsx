import { Button } from '../ui/Button';
import DialogPanel from '../common/DialogPanel';
import { hierarchyError } from '../../lib/hierarchy';
import { HierarchyFields } from './HierarchyModal';
import { Crown, Mail, UserPlus, X } from 'lucide-react';
import { INVITE_ROLES } from './teamShared';
import { errorText } from '../../lib/apiErrors';

// Invite dialog: email, role and optional sales level / manager.
export default function InviteMemberModal({ team }) {
    const {
        currentRole, handleInvite, hierarchy, inviteEmail, inviteLevel, inviteManager, inviteMutation, inviteRole,
        setInviteEmail, setInviteLevel, setInviteManager, setInviteRole, setIsInviteOpen
    } = team;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsInviteOpen(false)} />
            <DialogPanel onClose={() => setIsInviteOpen(false)} labelledBy="invite-member-title"
                className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

                {/* Gradient header */}
                <div className="px-6 py-5 flex items-center justify-between"
                    style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                            <UserPlus className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 id="invite-member-title" className="font-semibold !text-white">Invite Team Member</h3>
                            <p className="text-xs text-white/70">They'll receive login credentials via email</p>
                        </div>
                    </div>
                    <button onClick={() => setIsInviteOpen(false)} aria-label="Close" className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleInvite} className="px-6 py-5 space-y-5">
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1.5">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="email" required
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                                placeholder="colleague@company.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">Role</label>
                        <div className="space-y-2">
                            {INVITE_ROLES.filter(r => !r.superAdminOnly || currentRole === 'SUPER_ADMIN').map(r => (
                                <label key={r.value}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                                        inviteRole === r.value
                                            ? r.value === 'SUPER_ADMIN' ? 'border-violet-400 bg-violet-50' : 'border-blue-400 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <input type="radio" name="role" value={r.value}
                                        checked={inviteRole === r.value}
                                        onChange={() => setInviteRole(r.value)}
                                        className={r.value === 'SUPER_ADMIN' ? 'accent-violet-600' : 'accent-blue-600'}
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                                            {r.value === 'SUPER_ADMIN' && <Crown className="w-3.5 h-3.5 text-violet-600" />}
                                            {r.label}
                                        </p>
                                        <p className="text-xs text-gray-500">{r.desc}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Sales hierarchy <span className="text-xs font-normal text-gray-400">(optional)</span></p>
                        <HierarchyFields hierarchy={hierarchy} userId={null} level={inviteLevel} managerId={inviteManager}
                            onChange={(l, m) => { setInviteLevel(l); setInviteManager(m); }} />
                    </div>

                    {inviteMutation.isError && (
                        <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
                            {errorText(inviteMutation.error, 'Failed to invite user. Please try again.')}
                        </div>
                    )}

                    <div className="flex items-center gap-3 pt-1">
                        <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsInviteOpen(false)}>
                            Cancel
                        </Button>
                        <button type="submit" disabled={inviteMutation.isPending || !!hierarchyError(hierarchy?.users || [], null, inviteLevel, inviteManager)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                            <UserPlus className="w-4 h-4" />
                            {inviteMutation.isPending ? 'Sending…' : 'Send Invite'}
                        </button>
                    </div>
                </form>
            </DialogPanel>
        </div>
    );
}
