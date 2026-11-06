import { AlertTriangle } from 'lucide-react';
import { unknownMergeFields } from '../../lib/mergeFields';

export function mergeFieldsMessage(unknown) {
    const tokens = unknown.map(n => `{{${n}}}`).join(', ');
    const one = unknown.length === 1;
    return `${tokens} ${one ? 'is not a merge field' : 'are not merge fields'} a campaign can fill, so `
        + `${one ? 'it is' : 'they are'} removed when sending. Use a known field such as {{first_name}}, `
        + '{{company_name}}, {{your_name}} or {{calendar_link}}, or reword the email.';
}

/**
 * Inline warning for a campaign email editor: lists the {{merge fields}} in the subject or body that a campaign
 * can't fill. They are removed when the email is built, so the sentence around them should be fixed before
 * launch. Renders nothing when every field is known.
 */
export default function MergeFieldsNotice({ subject, body, className = '' }) {
    const unknown = unknownMergeFields(subject, body);
    if (!unknown.length) return null;
    return (
        <p role="status" data-testid="merge-fields-notice"
            className={`flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ${className}`}>
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>{mergeFieldsMessage(unknown)}</span>
        </p>
    );
}
