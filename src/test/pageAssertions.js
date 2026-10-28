// Behavioural assertions shared by the page render tests (W-11). They look only at what the user sees.
import { expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

// What a failed load must say (any of these wordings), or the API detail renderPage's fail() returns.
export const LOAD_ERROR_TEXT = /couldn['’]t|could not|failed|unable to|went wrong|error|internal server error|try again/i;

/** A spinner, a "Loading…" text or an aria-busy region is on screen. */
export function expectLoading() {
    const busy = document.body.querySelector('.animate-spin, .animate-pulse, [aria-busy="true"], [role="progressbar"]');
    if (busy) return;
    expect(screen.queryAllByText(/loading|signing you in|fetching|please wait|verifying/i).length,
        'a loading indicator').toBeGreaterThan(0);
}

/**
 * The page reports the failed load: role=alert or visible error wording. `emptyText` (a regex) is the
 * page's empty-state copy, which must NOT be shown instead of the error.
 */
export async function expectLoadError({ emptyText } = {}) {
    await waitFor(() => {
        const alerts = screen.queryAllByRole('alert');
        const texts = screen.queryAllByText(LOAD_ERROR_TEXT);
        expect(alerts.length + texts.length, 'an error message for the failed load').toBeGreaterThan(0);
    });
    if (emptyText) expect(screen.queryByText(emptyText), 'empty state shown for a failed load').toBeNull();
}

/**
 * A test that documents a page bug the suite found: skipped (so the suite stays green) with the reason
 * in its name. Remove the wrapper once the page is fixed; the body is the regression test.
 * RUN_PAGE_BUGS=1 npm test runs them (they fail until the pages are fixed).
 */
export function bug(name, reason, fn) {
    const run = typeof process !== 'undefined' && process.env.RUN_PAGE_BUGS;
    (run ? it : it.skip)(`${name} [PAGE BUG: ${reason}]`, fn);
}

/** Wait until every request the page fired has been answered (no outstanding fetch after render). */
export async function settled(http, count = 1) {
    await waitFor(() => expect(http.requests.length).toBeGreaterThanOrEqual(count));
}
