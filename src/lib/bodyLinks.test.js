import { describe, expect, it } from 'vitest';
import { bodyHasLinks, hasEffectiveCtaLink, linksWillBeRemoved } from './bodyLinks';

describe('body link helpers (A1-07b)', () => {
    it('finds anchors, bare URLs and CTA placeholders', () => {
        expect(bodyHasLinks('<p>See <a href="https://example.com/case">our case study</a></p>')).toBe(true);
        expect(bodyHasLinks('Read https://example.com/x today')).toBe(true);
        expect(bodyHasLinks('<p>Book here: {{cta_link}}</p>')).toBe(true);
        expect(bodyHasLinks('<p>Grab time {calendar_link}</p>')).toBe(true);
        expect(bodyHasLinks('<p>Hi {{first_name}}, no links here.</p>')).toBe(false);
        expect(bodyHasLinks('')).toBe(false);
        expect(bodyHasLinks(undefined)).toBe(false);
    });

    it('treats empty and placeholder CTA links as unset, like the backend', () => {
        for (const v of [null, undefined, '', '   ', 'none', 'NULL', 'n/a', '{{cta_link}}', '{calendar_link}']) {
            expect(hasEffectiveCtaLink(v)).toBe(false);
        }
        expect(hasEffectiveCtaLink('https://calendly.com/ann')).toBe(true);
    });

    it('warns only when the body has links and no CTA link is set', () => {
        const body = '<p><a href="https://example.com">case</a></p>';
        expect(linksWillBeRemoved(body, '')).toBe(true);
        expect(linksWillBeRemoved(body, 'https://calendly.com/ann')).toBe(false);
        expect(linksWillBeRemoved('<p>plain</p>', '')).toBe(false);
    });
});
