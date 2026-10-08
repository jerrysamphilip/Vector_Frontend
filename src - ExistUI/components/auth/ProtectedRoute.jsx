import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getStoredUser, hasPermission } from '../../lib/authStorage';

export function ProtectedRoute({ children }) {
    const location = useLocation();
    const user = getStoredUser();

    if (!isAuthenticated()) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // PLATFORM_ADMIN should never access tenant routes — redirect to admin panel
    if (user?.role === 'PLATFORM_ADMIN' && !location.pathname.startsWith('/admin')) {
        return <Navigate to="/admin" replace />;
    }

    return children;
}

export function PlatformAdminRoute({ children }) {
    const location = useLocation();
    const user = getStoredUser();

    if (!isAuthenticated()) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user?.role !== 'PLATFORM_ADMIN') {
        return <Navigate to="/app/dashboard" replace />;
    }

    return children;
}

export function PublicRoute({ children }) {
    const user = getStoredUser();

    if (isAuthenticated()) {
        // PLATFORM_ADMIN goes to admin panel, others go to app
        if (user?.role === 'PLATFORM_ADMIN') {
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
