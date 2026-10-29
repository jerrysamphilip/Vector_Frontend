// sanitizeHtml (DOMPurify): e-mail bodies keep their formatting, anything that can run script is removed.
import { describe, expect, it } from 'vitest';
import { htmlToText, sanitizeHtml } from './sanitizeHtml';

describe('sanitizeHtml', () => {
    it('keeps the formatting the editor produces', () => {
        const html = '<p>Hi <strong>Ann</strong>, <em>quick</em> <u>note</u> <s>old</s></p>'
            + '<ul><li><p>one</p></li></ul><ol><li><p>two</p></li></ol><p>line<br>break</p>'
            + '<p><a rel="noopener noreferrer" href="https://example.com/x?a=1&amp;b=2">link</a></p>';
        expect(sanitizeHtml(html)).toBe(html);
    });

    it('drops target (DOMPurify default, unchanged by the 3.4 upgrade) and inline styles', () => {
        expect(sanitizeHtml('<a target="_blank" href="https://e.com">l</a><span style="font-size: 18px">x</span>'))
            .toBe('<a href="https://e.com">l</a><span>x</span>');
    });

    it('keeps mailto and relative links', () => {
        const out = sanitizeHtml('<a href="mailto:a@b.co">m</a><a href="/app/x">r</a>');
        expect(out).toBe('<a href="mailto:a@b.co">m</a><a href="/app/x">r</a>');
    });

    it('removes script, event handlers and javascript: URLs', () => {
        const out = sanitizeHtml('<p onclick="x()">a</p><script>alert(1)</script><img src="x" onerror="alert(1)">'
            + '<a href="javascript:alert(1)">j</a><a href="JaVaScRiPt:alert(1)">k</a><svg><script>alert(1)</script></svg>');
        expect(out).not.toMatch(/script|onclick|onerror|javascript:/i);
        expect(out).toContain('<p>a</p>');
        expect(out).toContain('<img src="x">');
        expect(out).toContain('<a>j</a>');
    });

    it('removes iframes, objects, forms, style tags and style attributes', () => {
        const out = sanitizeHtml('<iframe src="https://evil"></iframe><object data="x"></object><embed src="x">'
            + '<form action="/steal"><input name="p"></form><style>body{display:none}</style>'
            + '<p style="background:url(javascript:alert(1))">s</p>');
        expect(out).not.toMatch(/iframe|object|embed|form|style/i);
        expect(out).toContain('<p>s</p>');
    });

    it('drops mutation-XSS payloads that re-parse into script', () => {
        const out = sanitizeHtml('<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>'
            + '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>');
        expect(out).not.toMatch(/onerror/i);
    });

    it('returns an empty string for empty input', () => {
        expect(sanitizeHtml(null)).toBe('');
        expect(sanitizeHtml(undefined)).toBe('');
        expect(sanitizeHtml('')).toBe('');
    });
});

describe('htmlToText', () => {
    it('returns the text without running anything', () => {
        expect(htmlToText('<p>Hello <b>you</b></p><img src=x onerror="window.__ran=1">')).toBe('Hello you');
        expect(window.__ran).toBeUndefined();
        expect(htmlToText('')).toBe('');
    });
});
