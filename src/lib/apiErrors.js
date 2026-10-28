// Helpers for showing an API failure to the user (axios errors normalised by api/http.js), review rule F-23:
// every failure the user sees is a plain sentence plus the request reference (X-Request-ID) for support.
//
//   errorMessage(error)    the sentence to show: the server's detail when it is a human message, else a plain
//                          sentence for the kind of failure (network, 401, 403, 404, 409, 422, 429, 5xx)
//   errorReference(error)  the request id, or undefined
//   errorText(error)       errorMessage + " (Reference: …)" for places that show one line of text

/** HTTP status of a failed request, or undefined (network error, thrown in code, ...). */
export function errorStatus(error) {
    return error?.response?.status ?? (typeof error?.status === 'number' ? error.status : undefined);
}

/** True when the request failed with 404, i.e. the record really does not exist (or is not visible). */
export function isNotFound(error) {
    return errorStatus(error) === 404;
}

// HTTP reason phrases and framework defaults: not worth showing, the plain sentence for the status is better
const GENERIC_DETAIL = new Set([
    'bad request', 'unauthorized', 'not authenticated', 'forbidden', 'not found', 'method not allowed',
    'conflict', 'unprocessable entity', 'unprocessable content', 'too many requests', 'internal server error',
    'bad gateway', 'service unavailable', 'gateway timeout', 'error', 'unknown error',
]);
const TECHNICAL_DETAIL = /traceback|exception|sqlalchemy|pymysql|stack trace|<html|errno|cannot read propert|is not a function|is not defined/i;

/** True when `text` reads like a message written for people (not a reason phrase, not a stack trace). */
function isHumanText(text) {
    if (typeof text !== 'string') return false;
    const t = text.trim();
    if (!t || t.length > 300) return false;
    if (GENERIC_DETAIL.has(t.toLowerCase().replace(/[.!]+$/, ''))) return false;
    return !TECHNICAL_DETAIL.test(t);
}

// FastAPI 422: detail is a list of { loc, msg }; name the first field that failed
function validationSentence(detail) {
    const first = Array.isArray(detail) ? detail.find(d => d && typeof d.msg === 'string') : null;
    if (!first) return null;
    const loc = Array.isArray(first.loc) ? first.loc.filter(p => p !== 'body' && p !== 'query' && typeof p === 'string') : [];
    const field = loc.length ? loc[loc.length - 1].replace(/_/g, ' ') : null;
    const msg = first.msg.replace(/^Value error,\s*/i, '');
    return field ? `${field[0].toUpperCase()}${field.slice(1)}: ${msg}` : msg;
}

/** The server's own message when it is one a person can read. */
function serverDetail(data) {
    const detail = data?.detail;
    if (isHumanText(detail)) return detail.trim();
    if (detail && typeof detail === 'object' && !Array.isArray(detail) && isHumanText(detail.message)) return detail.message.trim();
    if (isHumanText(data?.message)) return data.message.trim();
    if (isHumanText(data?.error)) return data.error.trim();
    return null;
}

const STATUS_TEXT = {
    400: 'The request could not be processed. Check the values and try again.',
    401: 'Your session has expired. Sign in again to continue.',
    403: "You don't have permission to do this. Ask an admin if you need access.",
    404: 'This item could not be found. It may have been deleted or you may not have access to it.',
    409: 'This was changed by someone else in the meantime. Reload and try again.',
    413: 'The file or request is too large.',
    422: 'Some of the values are not valid. Check the form and try again.',
    429: 'Too many requests right now. Wait a moment and try again.',
};
const SERVER_TEXT = 'Something went wrong on our side. Try again in a moment; if it keeps happening, contact support with the reference.';
export const NETWORK_TEXT = 'Could not reach the server. Check your connection and try again.';
const TIMEOUT_TEXT = 'The server took too long to answer. Try again in a moment.';

/** The message to show for a failed request (or any thrown error). */
export function errorMessage(error, fallback = 'Something went wrong. Try again.') {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    const response = error.response;
    if (!response) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return TIMEOUT_TEXT;
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') return NETWORK_TEXT;
        // An ApiError (useApiQuery) already carries its mapped message
        if (error.name === 'ApiError' && error.message) return error.message;
        return isHumanText(error.message) ? error.message : fallback;
    }
    const status = response.status;
    const human = serverDetail(response.data);
    if (human) return human;
    if (status === 422) return validationSentence(response.data?.detail) || STATUS_TEXT[422];
    if (STATUS_TEXT[status]) return STATUS_TEXT[status];
    if (status >= 500) return SERVER_TEXT;
    return fallback;
}

/** The request id the API returns in X-Request-ID (app/core/observability.py), for support to find the logs. */
export function errorReference(error) {
    if (error?.reference) return String(error.reference);
    const headers = error?.response?.headers;
    if (!headers) return undefined;
    const id = typeof headers.get === 'function' ? headers.get('x-request-id') : headers['x-request-id'];
    return id ? String(id) : undefined;
}

/** One line for the user: the message plus the request reference when there is one. */
export function errorText(error, fallback) {
    const message = errorMessage(error, fallback);
    const reference = errorReference(error);
    return reference ? `${message} (Reference: ${reference})` : message;
}
