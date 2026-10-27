// Helpers for showing an API failure to the user (axios errors normalised by api/http.js).

/** HTTP status of a failed request, or undefined (network error, thrown in code, ...). */
export function errorStatus(error) {
    return error?.response?.status;
}

/** True when the request failed with 404, i.e. the record really does not exist (or is not visible). */
export function isNotFound(error) {
    return errorStatus(error) === 404;
}

/** The message to show: the API's detail text when it has one, else the error's own message. */
export function errorMessage(error, fallback = 'Something went wrong') {
    const detail = error?.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (!error?.response && error?.message === 'Network Error') return 'Could not reach the server. Check your connection and try again.';
    return error?.message || fallback;
}

/** The request id the API returns in X-Request-ID (app/core/observability.py), for support to find the logs. */
export function errorReference(error) {
    const headers = error?.response?.headers;
    if (!headers) return undefined;
    const id = typeof headers.get === 'function' ? headers.get('x-request-id') : headers['x-request-id'];
    return id ? String(id) : undefined;
}
