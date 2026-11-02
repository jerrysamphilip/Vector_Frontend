// Browser-storage names for this app. localStorage is shared by every app on the same origin, so
// when Outreach 360 runs next to another app under a sub-path (e.g. /vector/), plain names such as
// "user" or "access_token" would read, overwrite or delete the other app's values. Every key this
// app stores goes through storageKey(), which prefixes it with the app name and its base path.
const BASE = (import.meta.env?.BASE_URL || '/').replace(/\/+$/, '') || '/';

export const STORAGE_PREFIX = `outreach360:${BASE}:`;

export const storageKey = (name) => `${STORAGE_PREFIX}${name}`;

/** Served at the origin root: earlier builds of this app owned the plain names there. */
export const OWNS_ROOT_STORAGE = BASE === '/';
