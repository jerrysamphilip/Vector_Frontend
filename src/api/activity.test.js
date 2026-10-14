import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    ACTIVITY_HEADER, ACTIVITY_STORAGE_KEY, SESSION_IDLE_MINUTES, THROTTLE_MS,
    activityHeaders, lastInteractionAt, recordInteraction, resetActivity, startActivityTracking,
} from './activity';

describe('activity tracking', () => {
    let stop;

    beforeEach(() => {
        resetActivity();
    });

    afterEach(() => {
        if (stop) stop();
        stop = null;
        resetActivity();
    });

    it('sends no activity header before any interaction', () => {
        expect(lastInteractionAt()).toBeNull();
        expect(activityHeaders()).toEqual({});
    });

    it('reports the seconds since the last interaction', () => {
        recordInteraction(1_000_000);
        expect(activityHeaders(1_000_000 + 42_500)).toEqual({ [ACTIVITY_HEADER]: '42' });
        expect(activityHeaders(1_000_000)).toEqual({ [ACTIVITY_HEADER]: '0' });
    });

    it('leaves the header out once the user has been idle longer than the idle window', () => {
        recordInteraction(1_000_000);
        const window = SESSION_IDLE_MINUTES * 60 * 1000;
        expect(activityHeaders(1_000_000 + window)).toEqual({ [ACTIVITY_HEADER]: String(SESSION_IDLE_MINUTES * 60) });
        expect(activityHeaders(1_000_000 + window + 1000)).toEqual({});
    });

    it('throttles recording', () => {
        recordInteraction(10_000);
        recordInteraction(10_000 + THROTTLE_MS - 1);
        expect(lastInteractionAt()).toBe(10_000);
        recordInteraction(10_000 + THROTTLE_MS);
        expect(lastInteractionAt()).toBe(10_000 + THROTTLE_MS);
    });

    it('shares the latest interaction between tabs through localStorage', () => {
        recordInteraction(10_000);
        expect(localStorage.getItem(ACTIVITY_STORAGE_KEY)).toBe('10000');
        localStorage.setItem(ACTIVITY_STORAGE_KEY, '50000'); // another tab, more recently
        expect(lastInteractionAt()).toBe(50_000);
        localStorage.setItem(ACTIVITY_STORAGE_KEY, 'garbage');
        expect(lastInteractionAt()).toBe(10_000);
    });

    it('records keyboard, pointer and tab-visible events, not timers', () => {
        const target = new EventTarget();
        stop = startActivityTracking(target);
        expect(lastInteractionAt()).toBeNull();

        target.dispatchEvent(new Event('keydown'));
        expect(lastInteractionAt()).not.toBeNull();

        resetActivity();
        target.dispatchEvent(new Event('pointerdown'));
        expect(lastInteractionAt()).not.toBeNull();

        resetActivity();
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(lastInteractionAt()).not.toBeNull();

        stop();
        stop = null;
        resetActivity();
        target.dispatchEvent(new Event('keydown'));
        expect(lastInteractionAt()).toBeNull();
    });
});
