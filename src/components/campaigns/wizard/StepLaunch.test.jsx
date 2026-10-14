import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { INITIAL_FORM_DATA } from './constants';
import StepLaunch from './StepLaunch';

function makeWizard(overrides = {}) {
    return {
        formData: { ...INITIAL_FORM_DATA, campaign_name: 'Q4 Outreach', inbox_ids: ['a', 'b'], campaign_timezone: 'Europe/London' },
        processingResult: { total_prospects: 250, personas_detected: ['A', 'B', 'C'] },
        sequenceSteps: [
            { step_number: 1, wait_days: 0, type: 'Initial Email' },
            { step_number: 2, wait_days: 3, type: 'Follow-up 1' },
        ],
        schedulePreview: [{ step_number: 1, formatted: 'Mon, Oct 19' }],
        scheduleLoading: false,
        errors: {},
        setErrors: vi.fn(),
        setCurrentStep: vi.fn(),
        launchMutation: { mutate: vi.fn(), isPending: false },
        ...overrides,
    };
}

describe('StepLaunch (wizard step 5)', () => {
    it('summarises the configuration', () => {
        render(<StepLaunch wizard={makeWizard()} />);
        expect(screen.getByText('Q4 Outreach')).toBeInTheDocument();
        expect(screen.getByText('250 Leads')).toBeInTheDocument();
        expect(screen.getByText('2 Inboxes')).toBeInTheDocument();
        expect(screen.getByText('3 Segments')).toBeInTheDocument();
        expect(screen.getByText(/Timezone: \(GMT[+-]\d\d:\d\d\) London/)).toBeInTheDocument();
        expect(screen.getByText('Mon, Oct 19')).toBeInTheDocument();
        expect(screen.getByText('TBD')).toBeInTheDocument();
    });

    it('previews the daily batches when a daily limit is set', () => {
        const wizard = makeWizard();
        wizard.formData.daily_batch_size = 100;
        render(<StepLaunch wizard={wizard} />);
        expect(screen.getByText('3 days total')).toBeInTheDocument();
        expect(screen.getByText(/Contacts 201–250/)).toBeInTheDocument();
    });

    it('clears the previous launch error and launches', async () => {
        const user = userEvent.setup();
        const wizard = makeWizard({ errors: { launch: 'No contacts could be enrolled' } });
        render(<StepLaunch wizard={wizard} />);
        expect(screen.getByText('No contacts could be enrolled')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: /Execute Campaign/ }));
        expect(wizard.setErrors).toHaveBeenCalled();
        expect(wizard.launchMutation.mutate).toHaveBeenCalledTimes(1);
    });
});
