import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { safeReturnPath } from '../../lib/returnTo';

const SECURITY_PATH = '/app/account/security';
const ADMIN_SECURITY_PATH = '/admin/security';

function SessionCheck() {
    return <div role="status" className="p-8 text-sm text-slate-400">Checking your session…</div>;
}

/** To the login page, remembering the page (route state) and why the session ended (?reason=). */
function ToLogin({ reason }) {
    const location = useLocation();
    return (
        <Navigate
            to={{ pathname: '/login', search: reason ? `?reason=${encodeURIComponent(reason)}` : '' }}
            state={{ from: location }}
            replace
        />
    );
}

/** Tenant routes (/app): signed in, not a platform admin, two-factor set up when the workspace requires it. */
export function ProtectedRoute({ children }) {
    const location = useLocation();
    const { user, status, endReason } = useAuth();

    if (status === 'loading') return <SessionCheck />;
    if (!user) return <ToLogin reason={endReason} />;

    // PLATFORM_ADMIN should never access tenant routes — redirect to admin panel
    if (user.role === 'PLATFORM_ADMIN' && !location.pathname.startsWith('/admin')) {
        return <Navigate to="/admin" replace />;
    }

    // The workspace requires two-factor: nothing else until it is set up
    if (user.mfa_setup_required && location.pathname !== SECURITY_PATH) {
        return <Navigate to={SECURITY_PATH} replace />;
    }

    return children;
}

export function PlatformAdminRoute({ children }) {
    const location = useLocation();
    const { user, status, endReason, hasRole } = useAuth();

    if (status === 'loading') return <SessionCheck />;
    if (!user) return <ToLogin reason={endReason} />;

    if (!hasRole('PLATFORM_ADMIN')) {
        return <Navigate to="/app/dashboard" replace />;
    }

    if (user.mfa_setup_required && location.pathname !== ADMIN_SECURITY_PATH) {
        return <Navigate to={ADMIN_SECURITY_PATH} replace />;
    }

    return children;
}

/** Sign-in pages: a signed-in user goes on to the app (or the ?next= page). */
export function PublicRoute({ children }) {
    const location = useLocation();
    const { user, status } = useAuth();

    if (status === 'signed-in' && user) {
        if (user.role === 'PLATFORM_ADMIN') {
            return <Navigate to="/admin" replace />;
        }
        const next = safeReturnPath(new URLSearchParams(location.search).get('next'));
        return <Navigate to={next && next.startsWith('/app') ? next : '/app/dashboard'} replace />;
    }
    return children;
}

/**
 * Redirects to /app/dashboard if the current user lacks the required permission.
 * This guards routes at the router level so that even direct URL navigation is blocked.
 */
export function PermissionRoute({ permission, children }) {
    const { hasPermission } = useAuth();
    if (!hasPermission(permission)) {
        return <Navigate to="/app/dashboard" replace />;
    }
    return children;
}

/** Renders children only for one of `roles` (else `fallback`, default nothing). */
export function RoleGate({ roles, fallback = null, children }) {
    const { hasRole } = useAuth();
    return hasRole(roles) ? children : fallback;
}
