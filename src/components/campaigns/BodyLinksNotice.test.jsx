import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BodyLinksNotice from './BodyLinksNotice';

const body = '<p>See <a href="https://example.com/case-1">our case study</a></p>';

describe('BodyLinksNotice (A1-07b)', () => {
    it('warns when the body has a link and the campaign has no CTA link', () => {
        render(<BodyLinksNotice body={body} ctaLink={null} />);
        expect(screen.getByRole('status')).toHaveTextContent('Links in the body are removed when sending unless a CTA link is set.');
    });

    it('renders nothing with a CTA link or without links', () => {
        const { container, rerender } = render(<BodyLinksNotice body={body} ctaLink="https://calendly.com/ann" />);
        expect(container).toBeEmptyDOMElement();
        rerender(<BodyLinksNotice body="<p>No links</p>" ctaLink="" />);
        expect(container).toBeEmptyDOMElement();
    });
});
