// Optimistic concurrency (rule T-3, backend app/core/concurrency.py).
//
// Contacts, companies, leads, deals, proposals (incl. quote lines and discount approval), campaigns and
// sequence steps carry a `row_version`. Every edit or state change sends back the version the screen
// loaded as `expected_version`; when someone else changed the record in between the API answers
//   409 {"detail": {"code": "STALE_VERSION", "current_version": N, "message": "This record was changed ..."}}
// instead of silently overwriting their change. The QueryClient's MutationCache (App.jsx) passes every
// mutation error to handleStaleVersionError: on STALE_VERSION it refetches and StaleVersionBanner shows
// the message with a Reload action.
//
// Forms that edit several fields capture the version when editing starts (not at submit time), so a
// background refetch cannot turn a stale form into a silent overwrite.

export const STALE_VERSION = 'STALE_VERSION';
export const STALE_VERSION_MESSAGE = 'This record was changed by someone else. Reload to see the latest version.';

/** The 409 the API returns for a stale row_version (before or after http.js normalizeError). */
export function isStaleVersion(error) {
    const res = error?.response;
    if (!res || res.status !== 409) return false;
    const data = res.data || {};
    return data.code === STALE_VERSION || data.detail_data?.code === STALE_VERSION || data.detail?.code === STALE_VERSION;
}

/** The record's current version reported by a STALE_VERSION error, if any. */
export function currentVersionOf(error) {
    const data = error?.response?.data || {};
    const detail = data.detail_data || (typeof data.detail === 'object' ? data.detail : null);
    return Number.isInteger(detail?.current_version) ? detail.current_version : null;
}

/** The version a record was loaded with: a record ({row_version}) or the number itself. */
export function versionOf(recordOrVersion) {
    const v = typeof recordOrVersion === 'number' ? recordOrVersion : recordOrVersion?.row_version;
    return Number.isInteger(v) ? v : null;
}

/** payload plus expected_version (unchanged when the version is unknown, e.g. an older API). */
export function withVersion(payload, recordOrVersion) {
    const v = versionOf(recordOrVersion);
    return v === null ? { ...(payload || {}) } : { ...(payload || {}), expected_version: v };
}

// ── Notice shown by StaleVersionBanner ───────────────────────────────

const listeners = new Set();

/** Subscribe to stale-version notices; returns the unsubscribe function. */
export function subscribeStaleVersion(listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

/** Announce a stale-version error to the banner; true when the error was one. */
export function reportStaleVersion(error) {
    if (!isStaleVersion(error)) return false;
    listeners.forEach(listener => listener({ message: STALE_VERSION_MESSAGE, currentVersion: currentVersionOf(error) }));
    return true;
}

/** MutationCache onError: on STALE_VERSION, show the notice and refetch so screens show the latest data. */
export function handleStaleVersionError(queryClient) {
    return (error) => {
        if (reportStaleVersion(error)) queryClient.invalidateQueries();
    };
}
