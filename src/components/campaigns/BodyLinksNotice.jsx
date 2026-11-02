import { AlertTriangle } from 'lucide-react';
import { linksWillBeRemoved } from '../../lib/bodyLinks';

export const BODY_LINKS_NOTICE =
    'Links in the body are removed when sending unless a CTA link is set. The link text stays; the link itself, '
    + 'bare URLs and {{cta_link}} placeholders are dropped. Set a CTA / booking link for this campaign to keep them.';

/**
 * Inline warning for an email body editor (A1-07b): shown when the body holds links and the campaign has no CTA
 * link, because the backend then removes them from the sent email. Renders nothing otherwise.
 */
export default function BodyLinksNotice({ body, ctaLink, className = '' }) {
    if (!linksWillBeRemoved(body, ctaLink)) return null;
    return (
        <p role="status" data-testid="body-links-notice"
            className={`flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ${className}`}>
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>{BODY_LINKS_NOTICE}</span>
        </p>
    );
}
