import { escapeHtml, hasHtmlTags, plainTextToHtml } from './wizard/emailPreview';

// "Insert from library" in the campaign editors: a template library entry (Sales → Templates, BR-SF-10)
// becomes the subject and body of one campaign email. Merge fields such as {{first_name}} are kept as typed:
// the campaign fills them per contact when it sends.

/** The step's subject and rich-text body for a library template (a plain-text body becomes paragraphs). */
export function libraryTemplateToStep(template) {
    const body = template?.body || '';
    return {
        subject: template?.subject || '',
        body: hasHtmlTags(body) ? body : plainTextToHtml(escapeHtml(body)),
    };
}

/** True when the email already has a subject or a body with text, so inserting would overwrite it. */
export function hasStepContent(subject, body) {
    const text = String(body || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    return Boolean(String(subject || '').trim() || text);
}

export const OVERWRITE_CONFIRM = {
    title: 'Replace this email?',
    message: 'The template\'s subject and body will replace what this email has now.',
    confirmLabel: 'Replace',
};
