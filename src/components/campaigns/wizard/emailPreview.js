// Pure helpers for the template step's live preview: token substitution with a sample prospect,
// plain-text <-> HTML conversion and the unsubscribe-footer clean-up. `sender` is the wizard form
// data (sender_name, sender_title, cta_link).

export const OUR_COMPANY = 'Neutrino Tech Systems';

/** Mirrors backend build_signature_block() (app/utils/email_utils.py) for live preview. */
export function buildSignatureBlockPreview(sender = {}) {
    const lines = [sender.sender_name || '[Your Name]'];
    if (sender.sender_title && sender.sender_title.trim()) {
        lines.push(sender.sender_title.trim());
    }
    lines.push(OUR_COMPANY);
    return lines.join('\n');
}

/** Replace {{tokens}} in `text` with the prospect's (and sender's) data, as the backend does at send time. */
export function substituteProspectData(text, prospect, sender = {}) {
    if (!text || !prospect) return text;

    let result = text;

    // 1. Dynamic replacement for all direct keys
    Object.entries(prospect).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
            result = result.replace(regex, String(value));
        }
    });

    // 2. Composite fields
    const fullName = [prospect.first_name, prospect.last_name].filter(Boolean).join(' ') || 'there';
    const location = [prospect.poc_city, prospect.poc_state].filter(Boolean).join(', ') || '';

    result = result
        .replace(/\{\{first_name\}\}/gi, prospect.first_name || 'there')
        .replace(/\{\{firstName\}\}/gi, prospect.first_name || 'there')
        .replace(/\{\{last_name\}\}/gi, prospect.last_name || '')
        .replace(/\{\{lastName\}\}/gi, prospect.last_name || '')
        .replace(/\{\{full_name\}\}/gi, fullName)
        .replace(/\{\{name\}\}/gi, prospect.first_name || 'there')
        .replace(/\{\{email\}\}/gi, prospect.email || '')
        .replace(/\{\{email_type\}\}/gi, prospect.email_type || '')
        .replace(/\{\{company_name\}\}/gi, prospect.company_name || 'your company')
        .replace(/\{\{companyName\}\}/gi, prospect.company_name || 'your company')
        .replace(/\{\{company\}\}/gi, prospect.company_name || 'your company')
        .replace(/\{\{designation\}\}/gi, prospect.designation || 'Professional')
        .replace(/\{\{title\}\}/gi, prospect.designation || 'Professional')
        .replace(/\{\{role\}\}/gi, prospect.designation || 'Professional')
        .replace(/\{\{industry\}\}/gi, prospect.industry || 'technology')
        .replace(/\{\{linkedin_url\}\}/gi, prospect.linkedin_url || '')
        .replace(/\{\{linkedin\}\}/gi, prospect.linkedin_url || '')
        .replace(/\{\{poc_city\}\}/gi, prospect.poc_city || '')
        .replace(/\{\{city\}\}/gi, prospect.poc_city || '')
        .replace(/\{\{poc_state\}\}/gi, prospect.poc_state || '')
        .replace(/\{\{state\}\}/gi, prospect.poc_state || '')
        .replace(/\{\{location\}\}/gi, location)
        .replace(/\{\{timezone\}\}/gi, prospect.timezone || '')
        // Sender tokens
        .replace(/\{\{our_company\}\}/gi, OUR_COMPANY)
        .replace(/\{\{your_name\}\}/gi, sender.sender_name || '[Your Name]')
        .replace(/\{\{signature_block\}\}/gi, buildSignatureBlockPreview(sender))
        .replace(/\{\{calendar_link\}\}/gi, sender.cta_link || '')
        .replace(/\{\{cta_link\}\}/gi, sender.cta_link || '');

    return result;
}

/** Wrap a legacy plain-text body as HTML paragraphs (bullet lines become a <ul>) for the rich text editor. */
export function plainTextToHtml(text) {
    if (!text) return '';

    const lines = text.split("\n");
    const blocks = [];
    let bulletBuffer = [];

    const flushBullets = () => {
        if (bulletBuffer.length) {
            blocks.push(`<ul>${bulletBuffer.map(item => `<li>${item}</li>`).join('')}</ul>`);
            bulletBuffer = [];
        }
    };

    lines.forEach(line => {
        const trimmed = line.trim();
        if (/^[•\-*]\s+/.test(trimmed)) {
            bulletBuffer.push(trimmed.replace(/^[•\-*]\s+/, '').trim());
            return;
        }
        flushBullets();
        if (trimmed !== '') {
            blocks.push(`<p>${line}</p>`);
        }
    });
    flushBullets();

    return blocks.join("");
}

export const hasHtmlTags = (value) => /<[^>]+>/.test(value || '');

export const escapeHtml = (value) =>
    (value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

/** Drop any unsubscribe footer text from a body: the real link is appended at send time. */
export function normalizeUnsubscribePreview(value) {
    if (!value) return '';
    let text = String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    text = text.replace(/^\s*(please\s+)?unsubscribe.*$/gim, '');
    text = text.replace(/^\s*to\s+unsubscribe.*$/gim, '');
    text = text.replace(/^.*if you do not wish to receive such business communication emails.*$/gim, '');
    text = text.replace(/^.*reply\s+["']?\s*unsubscribe\s*["']?.*$/gim, '');
    text = text.replace(/^.*\/api\/tracking\/unsubscribe\/.*$/gim, '');
    // Unsubscribe link is appended at send time with a per-message tracking URL.
    // Do not add any text-based footer in the preview.
    return text.replace(/\n{3,}/g, '\n\n').trim();
}

/** Body HTML for the preview pane (tokens filled when a prospect is given). Sanitize before rendering. */
export function formatEmailBodyForPreview(body, prospect = null, sender = {}) {
    if (!body) return '';
    const hydrated = prospect ? substituteProspectData(body, prospect, sender) : body;
    const normalized = normalizeUnsubscribePreview(hydrated);
    // Backward compatibility: keep legacy HTML templates as-is.
    if (hasHtmlTags(normalized)) return normalized;
    // Plain-text templates: preserve line breaks in preview.
    return escapeHtml(normalized).replace(/\n/g, '<br />');
}

/** {tag} (single braces) is flagged by strict spam filters; personalization must use {{tag}}. */
export const hasSingleBraceTags = (text) => /(?<!{){[^{}]+}(?!})/g.test(text || '');
