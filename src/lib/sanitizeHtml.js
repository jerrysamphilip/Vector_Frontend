import DOMPurify from 'dompurify';

// Email bodies come from uploads, AI output and templates: sanitize before rendering as HTML.
export function sanitizeHtml(html) {
    return DOMPurify.sanitize(html || '', { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form'], FORBID_ATTR: ['style'] });
}

// Plain text from HTML without running anything (DOMParser documents are inert).
export function htmlToText(html) {
    if (!html) return '';
    return new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
}
