import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getStoredUser, hasPermission } from '../../lib/authStorage';
import { authApi } from '../../api/auth';

const SECURITY_PATH = '/app/account/security';
const ADMIN_SECURITY_PATH = '/admin/security';

// Once per page load, confirm the cookie session with the API and refresh the stored user
// (role, permissions, two-factor state). A dead session ends on the login page via the
// http.js 401 → refresh → redirect path.
let sessionCheck = null;
function checkSessionOnce() {
    if (!sessionCheck) {
        sessionCheck = authApi.session()
            .then(() => window.dispatchEvent(new Event('auth-user-changed')))
            .catch(() => { sessionCheck = null; });
    }
    return sessionCheck;
}

/** The stored user, re-read whenever it changes (session check, two-factor enabled, ...). */
function useStoredUser() {
    const [user, setUser] = useState(() => getStoredUser());
    useEffect(() => {
        const update = () => setUser(getStoredUser());
        window.addEventListener('auth-user-changed', update);
        window.addEventListener('storage', update);
        if (isAuthenticated()) checkSessionOnce();
        return () => {
            window.removeEventListener('auth-user-changed', update);
            window.removeEventListener('storage', update);
        };
    }, []);
    return user;
}

export function ProtectedRoute({ children }) {
    const location = useLocation();
    const user = useStoredUser();

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

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
    const user = useStoredUser();

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user.role !== 'PLATFORM_ADMIN') {
        return <Navigate to="/app/dashboard" replace />;
    }

    if (user.mfa_setup_required && location.pathname !== ADMIN_SECURITY_PATH) {
        return <Navigate to={ADMIN_SECURITY_PATH} replace />;
    }

    return children;
}

export function PublicRoute({ children }) {
    const user = getStoredUser();

    if (user) {
        // PLATFORM_ADMIN goes to admin panel, others go to app
        if (user.role === 'PLATFORM_ADMIN') {
            return <Navigate to="/admin" replace />;
        }
        return <Navigate to="/app/dashboard" replace />;
    }
    return children;
}

/**
 * Redirects to /app/dashboard if the current user lacks the required permission.
 * This guards routes at the router level so that even direct URL navigation is blocked.
 */
export function PermissionRoute({ permission, children }) {
    if (!hasPermission(permission)) {
        return <Navigate to="/app/dashboard" replace />;
    }
    return children;
}
