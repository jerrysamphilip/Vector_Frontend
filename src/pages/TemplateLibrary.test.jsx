import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TemplateLibrary from './TemplateLibrary';
import { fail, pending, renderPage } from '../test/renderPage';
import { expectLoadError, expectLoading } from '../test/pageAssertions';

const tpl = (id, extra = {}) => ({ template_id: id, name: `Template ${id}`, subject: `Subject ${id}`, body: 'Hi {{first_name}}', category: 'Follow-up',
    shared: true, owner_name: 'Ada', usage_count: 2, updated_at: '2026-10-01T00:00:00Z', can_edit: true, ...extra });
const library = { items: [tpl('t-1'), tpl('t-2', { can_edit: false, name: 'Locked one' })], categories: ['Follow-up'], merge_fields: [{ token: '{{first_name}}', label: 'First name' }] };
const http = (over = {}) => ({
    'GET /template-library': (req) => ({ ...library, items: library.items.filter(t => !req.query.q || t.name.toLowerCase().includes(req.query.q.toLowerCase())) }),
    'POST /template-library/:id/render': { subject: 'Rendered subject', body: 'Hi Ada' },
    ...over,
});

describe('TemplateLibrary page', () => {
    it('lists templates; edit/delete only where allowed', async () => {
        renderPage(<TemplateLibrary />, { route: '/app/templates', http: http() });
        expect(screen.getByRole('heading', { name: 'Email templates' })).toBeInTheDocument();
        expect(await screen.findByText('Template t-1')).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: 'Preview' })).toHaveLength(2);
        expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(1);
    });

    it('shows loading', () => {
        renderPage(<TemplateLibrary />, { route: '/app/templates', http: http({ 'GET /template-library': pending() }) });
        expectLoading();
    });

    it('reports a failed load with a retry', async () => {
        renderPage(<TemplateLibrary />, { route: '/app/templates', http: http({ 'GET /template-library': fail(500) }) });
        await expectLoadError({ emptyText: /no templates yet/i });
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('searches on the server', async () => {
        renderPage(<TemplateLibrary />, { route: '/app/templates', http: http() });
        await screen.findByText('Template t-1');
        await userEvent.type(screen.getByPlaceholderText('Search templates'), 'locked');
        await screen.findByText('Locked one');
        expect(screen.queryByText('Template t-1')).toBeNull();
    });

    it('opens the new-template dialog', async () => {
        renderPage(<TemplateLibrary />, { route: '/app/templates', http: http() });
        await screen.findByText('Template t-1');
        await userEvent.click(screen.getByRole('button', { name: /new template/i }));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByRole('button', { name: 'First name' })).toBeInTheDocument();
    });
});
