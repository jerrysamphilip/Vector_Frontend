/**
 * useApiQuery: the one read hook for API data (review rule W-9).
 *
 *   const { data, error, isLoading, isFetching, refetch } = useApiQuery(
 *       ['deliverability-statistics', domain],          // query key: everything the request depends on
 *       ({ signal }) => deliverabilityApi.getStatistics({ domain }),
 *       { enabled: Boolean(domain) },                    // any other useQuery option (staleTime, select, ...)
 *   );
 *
 * What it guarantees, on top of @tanstack/react-query v5:
 * - Superseded requests are aborted. The query's AbortSignal reaches axios: explicitly when the fetcher passes
 *   `signal` on, and otherwise through api/http.js runWithSignal(), which attaches it to every request the API
 *   helper starts synchronously. When the key changes or the component unmounts, react-query aborts it.
 * - A late answer is never shown: data belongs to its key, and an answer that arrives after its request was
 *   aborted is dropped (the query function rejects with the abort instead of resolving).
 * - Cancellation is not an error: an aborted request never lands in `error`.
 * - `error` is normalised (ApiError below): `message` is the text to show (lib/apiErrors.js errorMessage),
 *   plus `status`, `code`, `reference` (X-Request-ID for support) and `detailData` (structured detail). The
 *   axios `response` stays on it, so errorMessage(error) / isNotFound(error) keep working.
 *
 * Returns { data, error, isLoading, isFetching, refetch } plus `query` (the raw useQuery result) for the rare
 * caller that needs more. Writes stay on useMutation; invalidate with `invalidateQueries({ queryKey: [...] })`.
 */
import { useQuery } from '@tanstack/react-query';
import { isRequestCanceled, runWithSignal } from '../api/http';
import { errorMessage, errorReference, errorStatus } from './apiErrors';

/** A failed API read, ready to show: message + status + code + request reference. */
export class ApiError extends Error {
    constructor(cause, fallback) {
        super(errorMessage(cause, fallback));
        this.name = 'ApiError';
        this.cause = cause;
        this.status = errorStatus(cause);
        this.code = cause?.response?.data?.code ?? cause?.code;
        this.reference = errorReference(cause);
        this.detailData = cause?.response?.data?.detail_data;
        this.response = cause?.response; // keeps apiErrors.js helpers working on the normalised error
    }
}

/** Normalise anything a fetcher threw into an ApiError (an ApiError is returned as is). */
export function toApiError(error, fallback = 'Could not load the data') {
    return error instanceof ApiError ? error : new ApiError(error, fallback);
}

function abortReason(signal) {
    const reason = signal?.reason;
    if (reason instanceof Error) return reason;
    const err = new Error('The request was cancelled');
    err.name = 'AbortError';
    return err;
}

/**
 * Wrap a fetcher(context) into a react-query queryFn that passes the AbortSignal on, drops a late answer and
 * normalises the error. Exported for useQueries / prefetch callers.
 */
export function apiQueryFn(fetcher, errorFallback) {
    return async (context) => {
        const { signal } = context; // reading it tells react-query the request can be aborted
        try {
            const result = await runWithSignal(signal, () => fetcher(context));
            if (signal?.aborted) throw abortReason(signal); // late answer for a superseded request
            return result;
        } catch (error) {
            if (signal?.aborted || isRequestCanceled(error)) throw error; // cancellation: react-query reverts, no error
            throw toApiError(error, errorFallback);
        }
    };
}

export function useApiQuery(queryKey, fetcher, options = {}) {
    const { errorFallback, ...queryOptions } = options;
    const query = useQuery({
        ...queryOptions,
        queryKey,
        queryFn: apiQueryFn(fetcher, errorFallback),
    });
    return {
        data: query.data,
        error: query.error && !isRequestCanceled(query.error) ? query.error : null,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        refetch: query.refetch,
        query,
    };
}

export default useApiQuery;
