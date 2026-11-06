// Merge fields a campaign email can fill, by lower-case name: the same list as the backend renderer
// (app/services/email_render.py KNOWN_TOKENS, which includes every template-library field). Any other
// {{token}} is removed when the email is built, so the editors warn about it before launch.
export const CAMPAIGN_MERGE_FIELDS = new Set([
    'first_name', 'last_name', 'full_name', 'company_name', 'company', 'designation', 'title', 'email',
    'industry', 'linkedin_url', 'city', 'state', 'your_name', 'signature_block', 'our_company', 'calendar_link',
    'cta_link', 'unsubscribe_link',
]);

const TOKEN = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

/** The {{tokens}} in the given texts that a campaign email can't fill, lower case, in order of first use. */
export function unknownMergeFields(...texts) {
    const found = [];
    for (const text of texts) {
        for (const match of String(text || '').matchAll(TOKEN)) {
            const name = match[1].toLowerCase();
            if (!CAMPAIGN_MERGE_FIELDS.has(name) && !found.includes(name)) found.push(name);
        }
    }
    return found;
}
