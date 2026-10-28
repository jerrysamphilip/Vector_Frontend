// Client side of the session idle limit (backend SESSION_IDLE_MINUTES, app/services/session_limits.py).
// The server signs a session out after the idle window without *reported* user activity (X-User-Activity
// on refresh, api/activity.js). This hook warns WARNING_MS before that point ("Stay signed in") and signs
// out at the limit, so the user is not surprised by a refused refresh. Interaction in any tab counts
// (activity.js shares the last interaction time through localStorage).
import { useCallback, useEffect, useRef, useState } from 'react';
import { lastInteractionAt, SESSION_IDLE_MINUTES } from '../api/activity';

export const IDLE_LIMIT_MS = SESSION_IDLE_MINUTES * 60 * 1000;
export const WARNING_MS = Math.min(2 * 60 * 1000, Math.floor(IDLE_LIMIT_MS / 4));
export const CHECK_EVERY_MS = 5000;

/** { warningUntil: epoch ms of the sign-out while the warning shows, else null; dismiss() }. */
export function useIdleTimeout({ enabled, onTimeout, idleLimitMs = IDLE_LIMIT_MS, warningMs = WARNING_MS }) {
    const [warningUntil, setWarningUntil] = useState(null);
    const onTimeoutRef = useRef(onTimeout);
    useEffect(() => { onTimeoutRef.current = onTimeout; }, [onTimeout]);

    useEffect(() => {
        if (!enabled) {
            setWarningUntil(null);
            return undefined;
        }
        const startedAt = Date.now(); // a fresh page load or sign-in counts as activity
        let fired = false;
        const check = () => {
            if (fired) return;
            const last = Math.max(lastInteractionAt() || 0, startedAt);
            const deadline = last + idleLimitMs;
            const now = Date.now();
            if (now >= deadline) {
                fired = true;
                setWarningUntil(null);
                onTimeoutRef.current?.();
            } else if (deadline - now <= warningMs) {
                setWarningUntil((prev) => (prev === deadline ? prev : deadline));
            } else {
                setWarningUntil(null); // the user came back (in this or another tab)
            }
        };
        check();
        const timer = setInterval(check, CHECK_EVERY_MS);
        return () => clearInterval(timer);
    }, [enabled, idleLimitMs, warningMs]);

    const dismiss = useCallback(() => setWarningUntil(null), []);
    return { warningUntil, dismiss };
}
