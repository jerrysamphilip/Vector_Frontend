// Bridge between the HTTP layer (api/http.js, no React) and the AuthProvider (React state, toasts).
//
// http.js reports session changes here; a mounted AuthProvider listens and turns them into state
// (signed-out with a reason, refreshed user, two-factor setup required). With no listener (no provider
// mounted, e.g. a bare module test) report() returns false and http.js falls back to a full-page redirect.
//
// Once the provider has handled "session ended", the session stays ended until a sign-in succeeds:
// http.js then neither refreshes (a dead refresh token must not be replayed) nor reports again.

const listeners = new Set();
let ended = false;

/** Listen for { type: 'ended', reason } | { type: 'refreshed', user } | { type: 'mfa-setup-required' }. */
export function subscribeSession(listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
        if (!listeners.size) ended = false;
    };
}

/** Deliver an event to the listeners; false when nobody listens. */
export function reportSession(event) {
    if (!listeners.size) return false;
    if (event.type === 'ended') {
        if (ended) return true;
        ended = true;
    }
    listeners.forEach((listener) => {
        try { listener(event); } catch { /* a broken listener must not break the request chain */ }
    });
    return true;
}

/** The session was ended (signed out, expired, suspended) and no sign-in happened since. */
export function isSessionEnded() {
    return ended;
}

/** A sign-in (or a successful refresh) started a live session. */
export function markSessionActive() {
    ended = false;
}

/** Mark the session ended without notifying (explicit sign-out handled by the provider itself). */
export function markSessionEnded() {
    ended = true;
}
