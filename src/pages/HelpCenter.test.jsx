import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HelpCenter from './HelpCenter';
import { renderPage } from '../test/renderPage';
import { ARTICLES } from '../help/helpIndex';

describe('HelpCenter page', () => {
    it('shows the getting-started article by default', () => {
        renderPage(<HelpCenter />, { route: '/app/help' });
        expect(screen.getByRole('heading', { name: /help center/i })).toBeInTheDocument();
        const start = ARTICLES.find(a => a.id === 'getting-started');
        expect(screen.getByRole('heading', { level: 2, name: start.title })).toBeInTheDocument();
    });

    it('deep-links to an article', () => {
        const other = ARTICLES.find(a => a.id !== 'getting-started');
        renderPage(<HelpCenter />, { route: '/app/help/:articleId', path: `/app/help/${other.id}` });
        expect(screen.getByRole('heading', { level: 2, name: other.title })).toBeInTheDocument();
    });

    it('searches the help library', async () => {
        renderPage(<HelpCenter />, { route: '/app/help' });
        await userEvent.type(screen.getByPlaceholderText(/search all help/i), 'zzqx-no-such-topic');
        expect(screen.getByText('No matches.')).toBeInTheDocument();
    });
    // (b)/(c) n/a: static content, no requests.
});
