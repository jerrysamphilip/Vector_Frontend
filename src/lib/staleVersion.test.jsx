import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MutationCache, QueryClient } from '@tanstack/react-query';
import { normalizeError } from '../api/http';
import {
    STALE_VERSION_MESSAGE, currentVersionOf, handleStaleVersionError, isStaleVersion, reportStaleVersion,
    subscribeStaleVersion, versionOf, withVersion,
} from './staleVersion';
import { versionedSave } from './useRecordVersion';
import StaleVersionBanner from '../components/common/StaleVersionBanner';

const stale = (current = 4) => {
    const error = new Error('Request failed with status code 409');
    error.response = { status: 409, data: { detail: { code: 'STALE_VERSION', current_version: current, message: STALE_VERSION_MESSAGE } } };
    return error;
};
const conflict = () => {
    const error = new Error('Request failed with status code 409');
    error.response = { status: 409, data: { detail: 'A contact with this email already exists.' } };
    return error;
};

describe('isStaleVersion', () => {
    it('recognises the API 409 before and after http.js normalizeError', () => {
        const raw = stale(7);
        expect(isStaleVersion(raw)).toBe(true);
        expect(currentVersionOf(raw)).toBe(7);
        normalizeError(raw);
        expect(raw.response.data.detail).toBe(STALE_VERSION_MESSAGE);
        expect(isStaleVersion(raw)).toBe(true);
        expect(currentVersionOf(raw)).toBe(7);
    });

    it('ignores other conflicts and non-HTTP errors', () => {
        expect(isStaleVersion(conflict())).toBe(false);
        expect(isStaleVersion(new Error('Network Error'))).toBe(false);
        expect(isStaleVersion(undefined)).toBe(false);
        const notConflict = stale();
        notConflict.response.status = 400;
        expect(isStaleVersion(notConflict)).toBe(false);
    });
});

describe('withVersion', () => {
    it('adds expected_version from a record or a number, and nothing when unknown', () => {
        expect(withVersion({ a: 1 }, { row_version: 3 })).toEqual({ a: 1, expected_version: 3 });
        expect(withVersion({ a: 1 }, 5)).toEqual({ a: 1, expected_version: 5 });
        expect(withVersion({ a: 1 }, {})).toEqual({ a: 1 });
        expect(withVersion(undefined, null)).toEqual({});
        expect(versionOf({ row_version: '2' })).toBeNull();
    });

    it('does not change the payload it was given', () => {
        const payload = { a: 1 };
        withVersion(payload, 2);
        expect(payload).toEqual({ a: 1 });
    });
});

describe('versionedSave', () => {
    it('sends the tracked version and keeps the one each save returns', async () => {
        const ref = { current: 2 };
        const api = vi.fn(async body => ({ ok: true, row_version: body.expected_version + 1 }));
        const save = versionedSave(ref, api);
        await save({ name: 'A' });
        await save({ name: 'B' });
        expect(api.mock.calls.map(c => c[0])).toEqual([{ name: 'A', expected_version: 2 }, { name: 'B', expected_version: 3 }]);
        expect(ref.current).toBe(4);
    });

    it('keeps the version when the save is refused', async () => {
        const ref = { current: 2 };
        const save = versionedSave(ref, async () => { throw stale(5); });
        await expect(save({})).rejects.toThrow();
        expect(ref.current).toBe(2);
    });
});

describe('stale-version notice', () => {
    it('notifies subscribers only for STALE_VERSION and refetches through the MutationCache handler', async () => {
        const listener = vi.fn();
        const unsubscribe = subscribeStaleVersion(listener);
        expect(reportStaleVersion(conflict())).toBe(false);
        expect(listener).not.toHaveBeenCalled();

        const queryClient = new QueryClient({ mutationCache: new MutationCache() });
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
        const onError = handleStaleVersionError(queryClient);
        onError(conflict());
        expect(invalidate).not.toHaveBeenCalled();
        onError(stale(9));
        expect(invalidate).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith({ message: STALE_VERSION_MESSAGE, currentVersion: 9 });
        unsubscribe();
        reportStaleVersion(stale());
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('StaleVersionBanner shows the message with a Reload action', async () => {
        const onReload = vi.fn();
        render(<StaleVersionBanner onReload={onReload} />);
        expect(screen.queryByRole('alert')).toBeNull();
        act(() => { reportStaleVersion(stale()); });
        expect(screen.getByRole('alert')).toHaveTextContent(STALE_VERSION_MESSAGE);
        await userEvent.click(screen.getByRole('button', { name: /reload/i }));
        expect(onReload).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('alert')).toBeNull();

        act(() => { reportStaleVersion(stale()); });
        await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));
        expect(screen.queryByRole('alert')).toBeNull();
        expect(onReload).toHaveBeenCalledTimes(1);
    });
});
