import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api/campaignWizard', () => ({ campaignWizardApi: { updateTemplate: vi.fn(), regenerate: vi.fn() } }));
vi.mock('../../../api/sales', () => ({ templatesApi: { list: vi.fn(), render: vi.fn() } }));
vi.mock('../../common/AttachmentManager', () => ({ default: () => null }));

import { campaignWizardApi } from '../../../api/campaignWizard';
import { templatesApi } from '../../../api/sales';
import EmailTemplatePreview from './EmailTemplatePreview';
import { useTemplateEditor } from './useTemplateEditor';
import { hasStepContent, libraryTemplateToStep } from '../libraryTemplate';

const result = () => ({
    templates_generated: [{ persona_type: 'CFO', persona_label: 'CFO', sequence_count: 1, all_emails: [
        { step_number: 1, template_id: 'wt-1', subject: 'AI subject', body: '<p>AI body</p>', schedule: 'Day 1' },
    ] }],
});

function Harness({ onErrors }) {
    const [processingResult, setProcessingResult] = useState(result);
    const editor = useTemplateEditor({ processingResult, setProcessingResult, selectedPersona: 'CFO', formData: {},
        customInstruction: '', creativeEmail: false, setErrors: onErrors });
    return <EmailTemplatePreview wizard={{ ...editor, formData: {}, selectedPersona: 'CFO', setPreviewProspect: () => {}, previewProspect: null }} />;
}

function renderHarness() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}><Harness onErrors={vi.fn()} /></QueryClientProvider>);
}

const library = { items: [{ template_id: 'lib-1', name: 'Check-in', subject: 'Checking in, {{first_name}}', body: 'Hi {{first_name}},\nA & B' }] };

describe('wizard "Insert from library"', () => {
    beforeEach(() => {
        templatesApi.list.mockResolvedValue(library);
        campaignWizardApi.updateTemplate.mockResolvedValue({});
    });
    afterEach(() => { vi.restoreAllMocks(); campaignWizardApi.updateTemplate.mockReset(); });

    it('replaces the selected email with the template after confirming, and saves both fields', async () => {
        const ask = vi.spyOn(window, 'confirm').mockReturnValue(true);
        renderHarness();
        await userEvent.click(screen.getByTitle("Fill this email's subject and body from a library template"));
        await userEvent.click(await screen.findByRole('button', { name: /Check-in/ }));
        await waitFor(() => expect(screen.getByText('Checking in, {{first_name}}')).toBeInTheDocument());
        expect(ask).toHaveBeenCalledWith(expect.stringContaining('Replace this email?'));
        expect(campaignWizardApi.updateTemplate).toHaveBeenCalledWith('wt-1', 'subject', 'Checking in, {{first_name}}');
        expect(campaignWizardApi.updateTemplate).toHaveBeenCalledWith('wt-1', 'body', '<p>Hi {{first_name}},</p><p>A &amp; B</p>');
    });

    it('changes nothing when the overwrite is cancelled', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        renderHarness();
        await userEvent.click(screen.getByTitle("Fill this email's subject and body from a library template"));
        await userEvent.click(await screen.findByRole('button', { name: /Check-in/ }));
        expect(screen.getByText('AI subject')).toBeInTheDocument();
        expect(campaignWizardApi.updateTemplate).not.toHaveBeenCalled();
    });
});

describe('libraryTemplate helpers', () => {
    it('keeps an HTML body, wraps a plain one, and sees an empty editor body as empty', () => {
        expect(libraryTemplateToStep({ subject: 'S', body: '<p>x</p>' })).toEqual({ subject: 'S', body: '<p>x</p>' });
        expect(libraryTemplateToStep({ subject: 'S', body: 'a\n\nb & "c"' }).body).toBe('<p>a</p><p>b &amp; &quot;c&quot;</p>');
        expect(hasStepContent('', '<p></p>')).toBe(false);
        expect(hasStepContent('', '<p>&nbsp;</p>')).toBe(false);
        expect(hasStepContent('Hi', '')).toBe(true);
        expect(hasStepContent('', '<p>x</p>')).toBe(true);
    });
});
