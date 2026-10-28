import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactScoring from './ContactScoring';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';

const model = {
    fit_rules: [{ id: 'r1', label: 'Decision maker', field: 'designation', operator: 'contains_any', value: 'CEO, CTO', points: 20 }],
    engagement: { opened: { points: 2, max: 10 } },
    half_life_days: 30, lookback_days: 180, fit_weight: 50, engagement_weight: 50, grade_thresholds: { A: 80, B: 60, C: 40, D: 1 },
};
const data = {
    model, stats: { scored: 10, contacts: 12, grades: { A: 1, B: 2 } },
    fields: [{ key: 'designation', label: 'Job title', kind: 'text' }],
    operators: [{ key: 'contains_any', label: 'contains any of', text: true, number: false, needs_value: true }],
    signals: [{ key: 'opened', label: 'Email opened' }], limits: { max_rules: 50 },
};
const http = (over = {}) => ({ 'GET /contacts/scoring-model': data, ...over });

describe('ContactScoring page', () => {
    it('shows the model with its fit rules', async () => {
        renderPage(<ContactScoring />, { route: '/app/contact-scoring', http: http() });
        expect(await screen.findByRole('heading', { name: 'Contact scoring' })).toBeInTheDocument();
        expect(screen.getByDisplayValue('Decision maker')).toBeInTheDocument();
        expect(screen.getByText('Email opened')).toBeInTheDocument();
    });

    it('shows a spinner while loading', () => {
        renderPage(<ContactScoring />, { route: '/app/contact-scoring', http: http({ 'GET /contacts/scoring-model': pending() }) });
        expectLoading();
    });

    it('reports a failed load', async () => {
        renderPage(<ContactScoring />, { route: '/app/contact-scoring', http: http({ 'GET /contacts/scoring-model': fail(500) }) });
        await expectLoadError();
    });

    it('tells an AGENT (403) that only admins can change the model', async () => {
        renderPage(<ContactScoring />, { route: '/app/contact-scoring', role: 'AGENT', http: http({ 'GET /contacts/scoring-model': fail(403, 'Forbidden') }) });
        expect(await screen.findByText(/only workspace admins/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /save model/i })).toBeNull();
    });

    it('adds a rule and saves the model', async () => {
        const { http: h } = renderPage(<ContactScoring />, {
            route: '/app/contact-scoring', http: http({ 'PUT /contacts/scoring-model': (req) => ({ ...data, model: req.body }) }),
        });
        await userEvent.click(await screen.findByRole('button', { name: /add rule/i }));
        expect(screen.getAllByLabelText('Rule label')).toHaveLength(2);
        await userEvent.click(screen.getAllByRole('button', { name: /save model/i })[0]);
        await waitFor(() => expect(h.requests.find(r => r.method === 'PUT')?.body.fit_rules).toHaveLength(2));
        expect(await screen.findByText(/every contact is being rescored/i)).toBeInTheDocument();
    });
});
