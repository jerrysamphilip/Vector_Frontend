import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Settings, KeyRound, User, CheckCircle, Eye, EyeOff } from 'lucide-react';
import PageTransition from '../components/layout/PageTransition';
import { Button } from '../components/ui/Button';
import { authApi } from '../api/auth';
import { getStoredUser, setAuthSession } from '../lib/authStorage';

export default function SettingsPage() {
    const currentUser = getStoredUser();

    // ── Profile form ─────────────────────────────────────
    const [firstName, setFirstName] = useState(currentUser?.first_name || '');
    const [lastName, setLastName] = useState(currentUser?.last_name || '');
    const [profileSuccess, setProfileSuccess] = useState(false);
    const [profileError, setProfileError] = useState('');

    const profileMutation = useMutation({
        mutationFn: () => authApi.updateProfile({ first_name: firstName.trim(), last_name: lastName.trim() }),
        onSuccess: (data) => {
            // Update stored user
            const stored = getStoredUser();
            if (stored) {
                setAuthSession({ user: { ...stored, first_name: data.first_name, last_name: data.last_name } });
            }
            setProfileSuccess(true);
            setProfileError('');
            setTimeout(() => setProfileSuccess(false), 3000);
        },
        onError: (err) => {
            setProfileError(err?.response?.data?.detail || 'Failed to update profile');
            setProfileSuccess(false);
        },
    });

    // ── Password form ─────────────────────────────────────
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [pwSuccess, setPwSuccess] = useState(false);
    const [pwError, setPwError] = useState('');

    const [forgotMsg, setForgotMsg] = useState('');
    const forgotPwMutation = useMutation({
        mutationFn: () => authApi.forgotPassword(currentUser?.email),
        onSuccess: () => {
            setForgotMsg('Password reset link sent to your email.');
            setTimeout(() => setForgotMsg(''), 5000);
        },
        onError: (err) => {
            setForgotMsg(err?.response?.data?.detail || 'Failed to send reset link');
            setTimeout(() => setForgotMsg(''), 5000);
        },
    });

    const passwordMutation = useMutation({
        mutationFn: () => authApi.changePassword(currentPw, newPw),
        onSuccess: () => {
            setPwSuccess(true);
            setPwError('');
            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');
            setTimeout(() => setPwSuccess(false), 4000);
        },
        onError: (err) => {
            setPwError(err?.response?.data?.detail || 'Failed to change password');
            setPwSuccess(false);
        },
    });

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        setPwError('');
        if (newPw.length < 8) {
            setPwError('New password must be at least 8 characters');
            return;
        }
        if (newPw !== confirmPw) {
            setPwError('New passwords do not match');
            return;
        }
        passwordMutation.mutate();
    };

    const isGoogleUser = currentUser?.auth_provider === 'google';

    return (
        <PageTransition>
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-700 rounded-xl flex items-center justify-center">
                        <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Account Settings</h1>
                        <p className="text-slate-500 text-sm">Manage your profile and security preferences</p>
                    </div>
                </div>

                {/* Profile Section */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                        <User className="w-4 h-4 text-slate-500" />
                        <h2 className="text-base font-semibold text-slate-800">Profile</h2>
                    </div>
                    <div className="px-6 py-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">First name</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Last name</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                            <input
                                type="email"
                                value={currentUser?.email || ''}
                                disabled
                                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-400 cursor-not-allowed"
                            />
                            <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
                        </div>

                        {profileError && (
                            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">{profileError}</p>
                        )}
                        {profileSuccess && (
                            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" /> Profile updated successfully
                            </p>
                        )}

                        <div className="flex justify-end">
                            <Button
                                onClick={() => profileMutation.mutate()}
                                disabled={profileMutation.isPending || (!firstName.trim() && !lastName.trim())}
                                isLoading={profileMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-9 px-5 text-sm"
                            >
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Password Section */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                        <KeyRound className="w-4 h-4 text-slate-500" />
                        <h2 className="text-base font-semibold text-slate-800">Change Password</h2>
                    </div>

                    {isGoogleUser ? (
                        <div className="px-6 py-8 text-center">
                            <p className="text-sm text-slate-500">
                                Your account uses Google Sign-In. Password management is handled by Google.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handlePasswordSubmit} className="px-6 py-5 space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-medium text-slate-700">Current password</label>
                                    <button
                                        type="button"
                                        onClick={() => forgotPwMutation.mutate()}
                                        disabled={forgotPwMutation.isPending}
                                        className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                                    >
                                        {forgotPwMutation.isPending ? 'Sending...' : 'Forgot password?'}
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showCurrentPw ? 'text' : 'password'}
                                        value={currentPw}
                                        onChange={(e) => setCurrentPw(e.target.value)}
                                        required
                                        placeholder="Enter your current password"
                                        className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPw((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {forgotMsg && (
                                    <p className="text-xs text-emerald-600 mt-1.5">{forgotMsg}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
                                <div className="relative">
                                    <input
                                        type={showNewPw ? 'text' : 'password'}
                                        value={newPw}
                                        onChange={(e) => setNewPw(e.target.value)}
                                        required
                                        placeholder="At least 8 characters"
                                        className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPw((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm new password</label>
                                <input
                                    type="password"
                                    value={confirmPw}
                                    onChange={(e) => setConfirmPw(e.target.value)}
                                    required
                                    placeholder="Repeat new password"
                                    className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 ${
                                        confirmPw && confirmPw !== newPw
                                            ? 'border-rose-300 bg-rose-50'
                                            : 'border-slate-200'
                                    }`}
                                />
                                {confirmPw && confirmPw !== newPw && (
                                    <p className="text-xs text-rose-500 mt-1">Passwords do not match</p>
                                )}
                            </div>

                            {pwError && (
                                <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">{pwError}</p>
                            )}
                            {pwSuccess && (
                                <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" /> Password changed successfully
                                </p>
                            )}

                            <div className="flex justify-end pt-1">
                                <Button
                                    type="submit"
                                    disabled={passwordMutation.isPending || !currentPw || !newPw || !confirmPw}
                                    isLoading={passwordMutation.isPending}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-9 px-5 text-sm"
                                >
                                    Change Password
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </PageTransition>
    );
}
