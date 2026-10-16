// User activity for the session idle timeout (backend ADR 0007, app/services/session_limits.py).
//
// The API signs a session out after SESSION_IDLE_MINUTES without *user* activity. Background polling
// (react-query refetchInterval, inbox sync, ...) must not keep a session alive, so the server only
// counts activity that the app reports: on POST /auth/refresh, http.js sends
//   X-User-Activity: <seconds since the last pointer / keyboard / scroll / tab-visible event>
// and leaves the header out when the user has not interacted within the idle window.
//
// The last interaction time is shared between tabs through localStorage: the tab that happens to
// refresh (whichever hits the expired access token first) reports the activity of every tab.

export const SESSION_IDLE_MINUTES = Number(import.meta.env.VITE_SESSION_IDLE_MINUTES) || 30;
export const ACTIVITY_HEADER = 'X-User-Activity';
export const ACTIVITY_STORAGE_KEY = 'last_user_activity';
// Listeners fire constantly (pointermove, scroll); record at most once per THROTTLE_MS.
export const THROTTLE_MS = 5000;

const EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'scroll', 'touchstart'];

let lastInteraction = null;
let stopTracking = null;

function readShared() {
    try {
        const value = Number(localStorage.getItem(ACTIVITY_STORAGE_KEY));
        return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
        return null;
    }
}

function writeShared(at) {
    try {
        localStorage.setItem(ACTIVITY_STORAGE_KEY, String(at));
    } catch { /* storage unavailable: this tab's own record still counts */ }
}

/** Record a user interaction (throttled). */
export function recordInteraction(now = Date.now()) {
    if (lastInteraction !== null && now - lastInteraction < THROTTLE_MS) return;
    lastInteraction = now;
    writeShared(now);
}

/** Epoch ms of the latest interaction in any tab, or null when there was none. */
export function lastInteractionAt() {
    const shared = readShared();
    if (lastInteraction === null) return shared;
    return shared === null ? lastInteraction : Math.max(lastInteraction, shared);
}

/** Headers for POST /auth/refresh: the activity report when the user interacted within the idle window. */
export function activityHeaders(now = Date.now()) {
    const at = lastInteractionAt();
    if (at === null) return {};
    const seconds = Math.max(0, Math.floor((now - at) / 1000));
    if (seconds > SESSION_IDLE_MINUTES * 60) return {};
    return { [ACTIVITY_HEADER]: String(seconds) };
}

/** Listen for user interaction (idempotent). Returns a function that stops listening. */
export function startActivityTracking(target = typeof window === 'undefined' ? null : window) {
    if (!target || stopTracking) return stopTracking || (() => {});
    const onInteraction = () => recordInteraction();
    const onVisibility = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') recordInteraction();
    };
    const options = { capture: true, passive: true };
    EVENTS.forEach((type) => target.addEventListener(type, onInteraction, options));
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
    stopTracking = () => {
        EVENTS.forEach((type) => target.removeEventListener(type, onInteraction, options));
        if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
        stopTracking = null;
    };
    return stopTracking;
}

/** Forget the recorded interaction (sign-out, tests). */
export function resetActivity() {
    lastInteraction = null;
    try {
        localStorage.removeItem(ACTIVITY_STORAGE_KEY);
    } catch { /* storage unavailable */ }
}
