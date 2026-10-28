import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import NotFound from './NotFound';
import { renderPage } from '../test/renderPage';

describe('NotFound page', () => {
    it('names the unknown address and links back home', () => {
        renderPage(<NotFound />, { route: '/app/*', path: '/app/nowhere' });
        expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
        expect(screen.getByText('/app/nowhere')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/app/dashboard');
    });
    // (c) n/a: the page makes no requests.
});
