import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Mail, Users, Activity, MessageSquare, Inbox, BarChart3, Shield, KeyRound, Eye, EyeOff, CheckCircle,
  LogOut, X, ArrowLeft, Contact, Building2, ListChecks, CheckSquare, Gauge, Target, Inbox as InboxIcon,
  Briefcase, TrendingUp, PieChart, Network, Crosshair, FileText, Settings2, CalendarSync, ChevronDown, Sparkles, Star, LifeBuoy, ShieldCheck,
} from 'lucide-react';
import logoMark from '../../assets/logo-mark.png';
import { authApi } from '../../api/auth';
import { tasksApi, viewsApi } from '../../api/contacts';
import { BUILT_IN_VIEWS, contactViewHref } from '../../lib/contactViews';
import { clearAuthSession, getStoredUser, hasPermission, setAuthSession } from '../../lib/authStorage';

// Grouped navigation. permission: null = everyone; admin: admins only.
const NAV = [
  { items: [
    { name: 'Home', href: '/app/dashboard', icon: Home },
    { name: 'Inbox', href: '/app/inbox', icon: MessageSquare },
    { name: 'Tasks', href: '/app/tasks', icon: CheckSquare, badge: 'tasks' },
  ] },
  { title: 'Outreach', items: [
    { name: 'Campaigns', href: '/app/campaigns', icon: Mail, permission: 'manage_campaigns' },
    { name: 'Campaign analytics', href: '/app/analytics', icon: BarChart3 },
    { name: 'Templates', href: '/app/templates', icon: FileText },
    { name: 'AI email writer', href: '/app/ai-email', icon: Sparkles },
    { name: 'Email accounts', href: '/app/inboxes', icon: Inbox, permission: 'manage_inboxes' },
    { name: 'Domain health', href: '/app/domain-health', icon: Activity },
    { name: 'Reports', href: '/app/reports', icon: PieChart, permission: 'view_analytics' },
  ] },
  { title: 'CRM', items: [
    { name: 'Contacts', href: '/app/contacts', icon: Contact },
    { name: 'Companies', href: '/app/accounts', icon: Building2 },
    { name: 'Lists', href: '/app/lists', icon: ListChecks },
    { name: 'Prospect lists', href: '/app/prospects', icon: Users, permission: 'manage_prospects' },
  ] },
  { title: 'Sales', items: [
    { name: 'Overview', href: '/app/sales', icon: Gauge },
    { name: 'Leads', href: '/app/leads', icon: Target },
    { name: 'SQL queue', href: '/app/sql-queue', icon: InboxIcon },
    { name: 'Deals', href: '/app/deals', icon: Briefcase },
    { name: 'Pipeline', href: '/app/pipeline', icon: TrendingUp },
    { name: 'Sales reports', href: '/app/sales-reports', icon: PieChart },
    { name: 'Targets', href: '/app/sales-targets', icon: Crosshair },
  ] },
  { title: 'Workspace', items: [
    { name: 'Team', href: '/app/team', icon: Shield, permission: 'manage_team', admin: true },
    { name: 'Sales team', href: '/app/sales-team', icon: Network },
    { name: 'Sales settings', href: '/app/sales-settings', icon: Settings2, admin: true },
    { name: 'Calendar sync', href: '/app/connections', icon: CalendarSync },
  ] },
];

const ROLE_LABELS = {
  PLATFORM_ADMIN: 'Platform Admin',
  SUPER_ADMIN:    'Super Admin',
  ADMIN:          'Admin',
  MANAGER:        'Manager',
  AGENT:          'Agent',
};
const ROLE_COLORS = {
  PLATFORM_ADMIN: 'bg-rose-100 text-rose-700',
  SUPER_ADMIN:    'bg-violet-100 text-violet-700',
  ADMIN:          'bg-blue-100 text-blue-700',
  MANAGER:        'bg-emerald-100 text-emerald-700',
  AGENT:          'bg-amber-100 text-amber-700',
};

function getInitials(user) {
  if (user?.first_name || user?.last_name) {
    return `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase();
  }
  return ((user?.email || '')[0] || '?').toUpperCase();
}

// ── Change Password Modal (full-screen overlay) ────────────
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
        {/* Header */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Current password */}
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
                type={showCurrent ? 'text' : 'password'}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
                placeholder="Enter your current password"
                className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {forgotMsg && (
              <p className="text-xs text-emerald-600 mt-1.5">{forgotMsg}</p>
            )}
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                placeholder="At least 8 characters"
                className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm new password</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
              placeholder="Repeat new password"
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 ${
                confirmPw && confirmPw !== newPw ? 'border-rose-300 bg-rose-50' : 'border-slate-200'
              }`}
            />
            {confirmPw && confirmPw !== newPw && (
              <p className="text-xs text-rose-500 mt-1">Passwords do not match</p>
            )}
          </div>

          {error && (
            <div className="px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>
          )}
          {success && (
            <div className="px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Password changed successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !currentPw || !newPw || !confirmPw}
            className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors mt-2"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}


export function getUserInitials(user) { return getInitials(user); }

const isActiveHref = (pathname, href) => pathname === href || (href !== '/app/dashboard' && pathname.startsWith(href + '/'));

function NavItem({ item, badge, children }) {
  return (
    <>
      <NavLink to={item.href} end={item.href === '/app/dashboard'}
        className={({ isActive }) => `relative flex items-center gap-2.5 px-2.5 h-8 rounded-lg text-[13px] font-medium transition-colors border ${
          isActive ? 'bg-blue-500/25 text-white border-blue-400/30' : 'text-slate-300 border-transparent hover:bg-white/10 hover:text-white'}`}>
        {({ isActive }) => (<>
          {isActive && <span className="absolute -left-1 top-1.5 bottom-1.5 w-1 rounded-full bg-[#73C8D2]" />}
          <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#73C8D2]' : 'text-slate-400'}`} />
          <span className="truncate">{item.name}</span>
          {badge > 0 && <span className="ml-auto text-[11px] font-semibold tabular-nums px-1.5 rounded-md bg-white/10 text-slate-100">{badge}</span>}
        </>)}
      </NavLink>
      {children}
    </>
  );
}

/** Contacts' views (built-in and saved) as sub-items under Contacts. */
function ContactViews({ isAdmin }) {
  const location = useLocation();
  const [showAll, setShowAll] = useState(false);
  const { data: saved = [] } = useQuery({ queryKey: ['views', 'CONTACT'], queryFn: () => viewsApi.list('CONTACT'), staleTime: 60000 });
  const params = new URLSearchParams(location.search);
  const current = location.pathname === '/app/contacts' ? (params.get('view') || 'all') : null;
  const canManage = isAdmin || hasPermission('manage_prospects');
  const views = [...BUILT_IN_VIEWS.filter(v => !v.manageOnly || canManage).map(v => ({ id: v.id, name: v.name })),
    ...saved.map(v => ({ id: v.view_id, name: v.name, saved: true }))];
  const shown = showAll ? views : views.slice(0, 7);
  return (
    <div className="ml-[18px] pl-3 border-l border-white/10 my-0.5 space-y-0.5">
      {shown.map(v => (
        <Link key={v.id} to={contactViewHref(v.id)}
          className={`flex items-center gap-1.5 px-2 h-7 rounded-md text-[12.5px] truncate ${current === v.id ? 'text-white bg-white/10 font-medium' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
          {v.saved && <Star className="w-3 h-3 shrink-0 opacity-70" />}<span className="truncate">{v.name}</span>
        </Link>
      ))}
      {views.length > 7 && (
        <button onClick={() => setShowAll(v => !v)} className="px-2 h-6 text-[11.5px] font-medium text-slate-400 hover:text-white">
          {showAll ? 'Show fewer' : `${views.length - 7} more views`}
        </button>
      )}
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────
export default function Sidebar() {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const role = currentUser?.role || '';
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(role);
  const { data: dueTasks } = useQuery({ queryKey: ['tasks', 'nav-due'], queryFn: () => tasksApi.list({ due: 'today', page_size: 1 }), refetchInterval: 120000 });
  const badges = { tasks: dueTasks?.total || 0 };

  useEffect(() => {
    const user = getStoredUser();
    if (user?.tenant_id && !user.tenant_name) {
      authApi.me().then(fresh => { if (fresh) { setAuthSession({ user: fresh }); setCurrentUser(fresh); } }).catch(() => {});
    }
  }, []);

  const groups = NAV.map(g => ({ ...g, items: g.items.filter(i => (!i.permission || hasPermission(i.permission)) && (!i.admin || isAdmin)) }))
    .filter(g => g.items.length);
  // One section open at a time (the one you are in), so the menu fits without scrolling
  const activeGroup = groups.find(g => g.title && g.items.some(i => isActiveHref(location.pathname, i.href)))?.title || null;
  const [open, setOpen] = useState(activeGroup);
  useEffect(() => { if (activeGroup) setOpen(activeGroup); }, [activeGroup]);

  return (
    <aside className="fixed top-0 left-0 w-60 h-screen z-40 flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-blue-600 text-white">
      <div className="h-14 flex items-center gap-2.5 px-4 shrink-0 border-b border-white/10">
        <img src={logoMark} alt="" className="w-7 h-7" />
        <span className="text-[15px] font-bold tracking-tight text-white">OUTREACH360<span className="text-[#73C8D2]">.AI</span></span>
      </div>
      <div className="mx-3 mt-3 mb-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
        <p className="text-[13px] font-semibold text-white truncate">{currentUser?.tenant_name || 'Workspace'}</p>
        <p className="text-[11px] text-slate-400">{ROLE_LABELS[role] || role}</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((g, gi) => {
          const isOpen = !g.title || open === g.title;
          const hasActive = g.title === activeGroup;
          return (
            <div key={g.title || gi} className={gi ? 'mt-2' : 'mt-1'}>
              {g.title && (
                <button onClick={() => setOpen(o => (o === g.title ? null : g.title))} aria-expanded={isOpen}
                  className={`w-full flex items-center justify-between px-2.5 h-7 rounded-md text-[10.5px] font-semibold uppercase tracking-wider ${hasActive ? 'text-slate-200' : 'text-slate-400'} hover:text-white hover:bg-white/5`}>
                  <span className="flex items-center gap-1.5">{g.title}{!isOpen && hasActive && <span className="w-1.5 h-1.5 rounded-full bg-[#73C8D2]" />}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                </button>
              )}
              {isOpen && (
                <div className="space-y-0.5 mt-0.5">
                  {g.items.map(i => (
                    <NavItem key={i.href} item={i} badge={badges[i.badge]}>
                      {i.href === '/app/contacts' && location.pathname.startsWith('/app/contacts') && <ContactViews isAdmin={isAdmin} />}
                    </NavItem>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="shrink-0 px-3 py-2.5 border-t border-white/10">
        <NavLink to="/app/help" className={({ isActive }) => `flex items-center gap-2.5 px-2.5 h-8 rounded-lg text-[13px] font-medium ${isActive || location.pathname.startsWith('/app/help') ? 'bg-blue-500/25 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
          <LifeBuoy className="w-4 h-4 text-[#73C8D2]" /> Help Center
          <span className="ml-auto text-[10px] font-semibold px-1.5 rounded border border-white/20 text-slate-300">?</span>
        </NavLink>
      </div>
    </aside>
  );
}

// ── Profile menu (top bar avatar) ──────────────────────────
export function ProfileMenu() {
  const navigate = useNavigate();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const currentUser = getStoredUser();
  const role = currentUser?.role || '';
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const queryClient = useQueryClient();
  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearAuthSession();
    queryClient.clear(); // don't leave this user's data cached for the next sign-in
    navigate('/login', { replace: true });
  };
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} aria-label="Account" className="w-9 h-9 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center hover:ring-4 hover:ring-blue-100">
        {getInitials(currentUser)}
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="px-4 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">{currentUser?.first_name} {currentUser?.last_name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{currentUser?.email}</p>
            <span className={`mt-2 inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[role] || 'bg-slate-100 text-slate-600'}`}>{ROLE_LABELS[role] || role}</span>
          </div>
          <div className="py-1">
            {currentUser?.auth_provider !== 'google' && (
              <button onClick={() => { setOpen(false); setChangePwOpen(true); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                <KeyRound className="w-4 h-4 text-slate-400" /> Change password
              </button>
            )}
            <button onClick={() => { setOpen(false); navigate('/app/account/security'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
              <ShieldCheck className="w-4 h-4 text-slate-400" /> Security (two-factor)
              {currentUser?.mfa_enabled && <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">On</span>}
            </button>
            <button onClick={() => { setOpen(false); navigate('/app/connections'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
              <CalendarSync className="w-4 h-4 text-slate-400" /> Calendar and email sync
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      )}
      <AnimatePresence>
        {changePwOpen && <ChangePasswordModal currentUser={currentUser} onClose={() => setChangePwOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
