import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIEmailGenerator from './AIEmailGenerator';
import { fail, pending, renderPage } from '../test/renderPage';
import { bug, expectLoadError, expectLoading } from '../test/pageAssertions';

const blueprints = [{ blueprint_id: 'b-1', persona_type: 'TECHNICAL', openers: ['a', 'b'] }];
const http = (over = {}) => ({ 'GET /persona-blueprints': blueprints, ...over });
const opts = (over) => ({ route: '/app/ai-email', http: http(over) });

describe('AIEmailGenerator page', () => {
    it('shows the generator and the persona blueprints', async () => {
        renderPage(<AIEmailGenerator />, opts());
        expect(screen.getByRole('heading', { level: 1, name: /email/i })).toBeInTheDocument();
        expect(await screen.findByText('Available Persona Blueprints (1)')).toBeInTheDocument();
        expect(screen.getByText('2 openers')).toBeInTheDocument();
    });

    it('shows loading blueprints', () => {
        renderPage(<AIEmailGenerator />, opts({ 'GET /persona-blueprints': pending() }));
        expectLoading();
    });

    it('classifies a persona', async () => {
        const { http: h } = renderPage(<AIEmailGenerator />, opts({ 'POST /prospects/classifications/test': { persona_type: 'DECISION_MAKER', confidence_score: 0.9 } }));
        await userEvent.type(screen.getByPlaceholderText('e.g. Senior Backend Engineer'), 'CEO');
        await userEvent.click(screen.getByRole('button', { name: /classify persona/i }));
        expect((await screen.findAllByText('DECISION_MAKER')).length).toBeGreaterThan(0);
        expect(h.requests.find(r => r.method === 'POST').body).toMatchObject({ designation: 'CEO' });
    });

    it('shows a failed classification', async () => {
        renderPage(<AIEmailGenerator />, opts({ 'POST /prospects/classifications/test': fail(500) }));
        await userEvent.type(screen.getByPlaceholderText('e.g. Senior Backend Engineer'), 'CEO');
        await userEvent.click(screen.getByRole('button', { name: /classify persona/i }));
        await expectLoadError();
    });

    bug('reports a failed blueprint load', 'blueprints query error ignored: shows "(0)" and an empty grid', async () => {
        renderPage(<AIEmailGenerator />, opts({ 'GET /persona-blueprints': fail(500) }));
        await expectLoadError({ emptyText: /persona blueprints \(0\)/i });
    });
});
