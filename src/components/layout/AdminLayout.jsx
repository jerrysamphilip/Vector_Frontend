import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NavLink, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Building2, Users, LogOut,
    ChevronUp, KeyRound, Eye, EyeOff, X, CheckCircle, Shield, ShieldCheck,
} from 'lucide-react';
import logo from '../../assets/logo.png';
import { authApi } from '../../api/auth';
import { clearAuthSession, getStoredUser } from '../../lib/authStorage';

const adminNav = [
    { name: 'Dashboard',  href: '/admin',         icon: LayoutDashboard }
];

const sidebarVariants = {
    initial: { x: -64, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const logoVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};
const navItemVariants = {
    initial: { x: -20, opacity: 0 },
    animate: (i) => ({ x: 0, opacity: 1, transition: { delay: 0.3 + i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] } }),
};

function getInitials(user) {
    if (user?.first_name || user?.last_name) {
        return `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase();
    }
    return ((user?.email || '')[0] || '?').toUpperCase();
}

// ── Change Password Modal ──────────────────────────────────
function ChangePasswordModal({ currentUser, onClose }) {
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (newPw.length < 8) { setError('New password must be at least 8 characters'); return; }
        if (newPw !== confirmPw) { setError('Passwords do not match'); return; }
        setLoading(true);
        try {
            await authApi.changePassword(currentPw, newPw);
            setSuccess(true);
            setTimeout(onClose, 2000);
        } catch (err) {
            setError(err?.response?.data?.detail || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <KeyRound className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">Change Password</h2>
                            <p className="text-xs text-slate-500">Update your account password</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
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
                            <input type={showCurrent ? 'text' : 'password'} value={currentPw}
                                onChange={(e) => setCurrentPw(e.target.value)} required placeholder="Enter your current password"
                                className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                            <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {forgotMsg && <p className="text-xs text-emerald-600 mt-1.5">{forgotMsg}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
                        <div className="relative">
                            <input type={showNew ? 'text' : 'password'} value={newPw}
                                onChange={(e) => setNewPw(e.target.value)} required placeholder="At least 8 characters"
                                className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                            <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm new password</label>
                        <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required
                            placeholder="Repeat new password"
                            className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 ${
                                confirmPw && confirmPw !== newPw ? 'border-rose-300 bg-rose-50' : 'border-slate-200'
                            }`} />
                        {confirmPw && confirmPw !== newPw && <p className="text-xs text-rose-500 mt-1">Passwords do not match</p>}
                    </div>
                    {error && <div className="px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>}
                    {success && (
                        <div className="px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Password changed successfully!
                        </div>
                    )}
                    <button type="submit" disabled={loading || !currentPw || !newPw || !confirmPw}
                        className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors mt-2">
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

// ── Main Admin Layout ──────────────────────────────────────
export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const currentUser = getStoredUser();

    const [profileOpen, setProfileOpen] = useState(false);
    const [changePwOpen, setChangePwOpen] = useState(false);

    const queryClient = useQueryClient();
    const handleLogout = async () => {
        try { await authApi.logout(); } catch {}
        clearAuthSession();
        queryClient.clear();
        navigate('/login', { replace: true });
    };

    return (
        <>
            <motion.aside
                className="fixed top-0 left-0 w-64 h-screen z-40 flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-blue-600 text-white"
                variants={sidebarVariants}
                initial="initial"
                animate="animate"
            >
                {/* Logo + Admin badge */}
                <motion.div
                    className="h-20 flex items-center px-6 border-b border-white/10"
                    variants={logoVariants} initial="initial" animate="animate"
                >
                    <div className="flex items-center gap-3 w-full cursor-pointer" onClick={() => navigate('/admin')}>
                        <motion.img src={logo} alt="Logo" className="max-w-[180px] h-auto object-contain"
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }} />
                    </div>
                </motion.div>

                {/* Admin label */}
                <div className="px-5 py-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/10">
                        <Shield className="w-4 h-4 text-blue-200" />
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-200">Platform Admin</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-2 space-y-1 px-3 overflow-y-auto">
                    {adminNav.map((item, index) => {
                        const isActive = location.pathname === item.href ||
                            (item.href !== '/admin' && location.pathname.startsWith(item.href));
                        const isExactAdmin = item.href === '/admin' && location.pathname === '/admin';
                        const active = isExactAdmin || (item.href !== '/admin' && isActive);
                        return (
                            <motion.div
                                key={item.name}
                                variants={navItemVariants} initial="initial" animate="animate" custom={index}
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            >
                                <NavLink to={item.href}
                                    className={`group flex items-center gap-3 px-3 py-4 rounded-xl text-sm font-medium transition-all duration-300 relative ${
                                        active
                                            ? 'bg-blue-500/25 text-white border border-blue-400/30'
                                            : 'text-slate-400 hover:bg-white/10 hover:text-white border border-transparent'
                                    }`}
                                >
                                    {active && (
                                        <motion.div
                                            className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-blue-400"
                                            layoutId="adminActiveIndicator"
                                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                    <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${active ? 'text-blue-300' : 'text-blue-300/60 group-hover:text-blue-200'}`} />
                                    <span className="tracking-wide">{item.name}</span>
                                </NavLink>
                            </motion.div>
                        );
                    })}
                </nav>

                {/* Profile trigger */}
                <div className="px-3 pb-4 border-t border-white/10 pt-3">
                    <button
                        onClick={() => setProfileOpen(v => !v)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {getInitials(currentUser)}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-medium text-white truncate leading-tight">
                                {currentUser?.first_name} {currentUser?.last_name}
                            </p>
                            <p className="text-xs text-blue-200 truncate leading-tight">Platform Admin</p>
                        </div>
                        <ChevronUp className={`w-4 h-4 text-blue-300 flex-shrink-0 transition-transform duration-200 ${profileOpen ? '' : 'rotate-180'}`} />
                    </button>
                </div>
            </motion.aside>

            {/* Profile popup */}
            <AnimatePresence>
                {profileOpen && (
                    <>
                        <div className="fixed inset-0" style={{ zIndex: 49 }} onClick={() => setProfileOpen(false)} />
                        <motion.div
                            className="fixed bottom-4 left-[268px] w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                            style={{ zIndex: 50 }}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                        >
                            <div className="px-5 pt-5 pb-4 flex flex-col items-center text-center border-b border-slate-100">
                                <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold mb-3">
                                    {getInitials(currentUser)}
                                </div>
                                <p className="text-sm font-semibold text-slate-900">{currentUser?.first_name} {currentUser?.last_name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{currentUser?.email}</p>
                                <span className="mt-2 inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                    Platform Admin
                                </span>
                            </div>
                            <div className="py-1.5">
                                {currentUser?.auth_provider !== 'google' && (
                                    <button onClick={() => { setProfileOpen(false); setChangePwOpen(true); }}
                                        className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                        <KeyRound className="w-4 h-4 text-slate-400" /> Change Password
                                    </button>
                                )}
                                <button onClick={() => { setProfileOpen(false); navigate('/admin/security'); }}
                                    className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                    <ShieldCheck className="w-4 h-4 text-slate-400" /> Security (two-factor)
                                </button>
                                <button onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors">
                                    <LogOut className="w-4 h-4" /> Sign out
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Change Password modal */}
            <AnimatePresence>
                {changePwOpen && <ChangePasswordModal currentUser={currentUser} onClose={() => setChangePwOpen(false)} />}
            </AnimatePresence>

            {/* Main content */}
            <main className="ml-64 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
                <Outlet />
            </main>
        </>
    );
}
