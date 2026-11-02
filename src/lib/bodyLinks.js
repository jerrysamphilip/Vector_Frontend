// A1-07b: when a campaign has no CTA link the backend removes links from every email body before sending
// (Vector_Backend app/utils/email_utils.py strip_cta_content_no_link, via has_effective_cta_link): <a> anchors
// lose their href (the text stays), bare http(s) URLs and {{cta_link}} / {{calendar_link}} placeholders go.
// These helpers mirror those checks so the editors can warn before the user saves.

const CTA_PLACEHOLDER_VALUE = /^\{+\s*(calendar_link|cta_link)\s*\}+$/i;
const EMPTY_VALUES = new Set(['none', 'null', 'undefined', 'n/a', 'na']);
const ANCHOR = /<a\b[^>]*\bhref\s*=/i;
const BARE_URL = /https?:\/\/[^\s"'<>]+/i;
const CTA_PLACEHOLDER_TOKEN = /\{\{?\s*(?:calendar_link|cta_link)\s*\}?\}/i;

/** True when the campaign's CTA link is a real value (backend normalize_cta_link / has_effective_cta_link). */
export function hasEffectiveCtaLink(ctaLink) {
    if (ctaLink == null) return false;
    const value = String(ctaLink).trim();
    if (!value || EMPTY_VALUES.has(value.toLowerCase())) return false;
    return !CTA_PLACEHOLDER_VALUE.test(value);
}

/** True when an email body (HTML or plain text) holds a hyperlink, a bare URL or a CTA link placeholder. */
export function bodyHasLinks(body) {
    if (!body) return false;
    const text = String(body);
    return ANCHOR.test(text) || BARE_URL.test(text) || CTA_PLACEHOLDER_TOKEN.test(text);
}

/** True when the backend will strip links from this body when sending: it has links and no CTA link is set. */
export function linksWillBeRemoved(body, ctaLink) {
    return bodyHasLinks(body) && !hasEffectiveCtaLink(ctaLink);
}
