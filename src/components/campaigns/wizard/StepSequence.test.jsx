import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import StepSequence from './StepSequence';

const steps = (n) => Array.from({ length: n }, (_, i) => ({
    step_number: i + 1, wait_days: i === 0 ? 0 : 3, type: i === 0 ? 'Initial Email' : `Follow-up ${i}`,
}));

function makeWizard(overrides = {}) {
    return {
        sequenceSteps: steps(2),
        setSequenceSteps: vi.fn(),
        addSequenceStep: vi.fn(),
        removeSequenceStep: vi.fn(),
        setCurrentStep: vi.fn(),
        campaignId: 'c-1',
        sequenceMutation: { mutate: vi.fn(), isPending: false },
        ...overrides,
    };
}

describe('StepSequence (wizard step 2)', () => {
    it('shows each email of the sequence with its wait in days', () => {
        render(<StepSequence wizard={makeWizard()} />);
        expect(screen.getByRole('heading', { name: 'Sequence Engine' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Initial Email' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Follow-up 1' })).toBeInTheDocument();
        expect(screen.getByText('INITIAL')).toBeInTheDocument();
        expect(screen.getByRole('spinbutton')).toHaveValue(3);
    });

    it('adds a follow-up and removes one (never the initial email)', async () => {
        const user = userEvent.setup();
        const wizard = makeWizard();
        render(<StepSequence wizard={wizard} />);
        await user.click(screen.getByRole('button', { name: /Add Follow-up Step/ }));
        expect(wizard.addSequenceStep).toHaveBeenCalledTimes(1);
        const removeButtons = screen.getAllByTitle('Remove Step');
        expect(removeButtons).toHaveLength(1);
        await user.click(removeButtons[0]);
        expect(wizard.removeSequenceStep).toHaveBeenCalledWith(1);
    });

    it('hides "Add Follow-up Step" at the 7-step maximum', () => {
        render(<StepSequence wizard={makeWizard({ sequenceSteps: steps(7) })} />);
        expect(screen.queryByRole('button', { name: /Add Follow-up Step/ })).not.toBeInTheDocument();
        expect(screen.getAllByTitle('Remove Step')).toHaveLength(6);
    });

    it('updates the wait days of a follow-up', async () => {
        const user = userEvent.setup();
        const wizard = makeWizard();
        render(<StepSequence wizard={wizard} />);
        const wait = screen.getByRole('spinbutton');
        await user.clear(wait);
        expect(wizard.setSequenceSteps).toHaveBeenCalled();
        const latest = wizard.setSequenceSteps.mock.calls.at(-1)[0];
        expect(latest[1].wait_days).toBe(0);
    });

    it('saves the sequence for the campaign, or goes back to step 1', async () => {
        const user = userEvent.setup();
        const wizard = makeWizard();
        render(<StepSequence wizard={wizard} />);
        await user.click(screen.getByRole('button', { name: /Save Sequence/ }));
        expect(wizard.sequenceMutation.mutate).toHaveBeenCalledWith('c-1');
        await user.click(screen.getByRole('button', { name: /Back/ }));
        expect(wizard.setCurrentStep).toHaveBeenCalledWith(1);
    });
});
