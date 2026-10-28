import { describe, expect, it } from 'vitest';
import { buildSteps, editBody, impactText, insertStep, moveNewStep, sentByStep, stepsError, toEditorHtml } from './campaignEditModel';

const sequences = [
    { sequence_id: 's-2', step_number: 2, wait_days: 2, stop_on_reply: true, stop_on_bounce: true },
    { sequence_id: 's-1', step_number: 1, wait_days: 0, stop_on_reply: true, stop_on_bounce: false },
];
const assignments = {
    steps: [{ sequence_id: 's-1', templates: [{ template_id: 't-1', designation: null, subject: 'Hi', body: 'Line one\n\nLine two', recipients: 2 }] },
        { sequence_id: 's-2', unassigned: 1, templates: [{ template_id: 't-2', designation: 'CFO', subject: 'F', body: '<p>B</p>', recipients: 0 }] }],
    prospects: [{ assignments: [{ sequence_id: 's-1', message_status: 'SENT' }, { sequence_id: 's-2', message_status: 'SCHEDULED' }] }],
};

describe('campaign editor model', () => {
    it('builds ordered steps with persona versions, recipients and sent counts', () => {
        const steps = buildSteps(sequences, assignments);
        expect(steps.map(s => s.sequence_id)).toEqual(['s-1', 's-2']);
        expect(steps[0].sent).toBe(1);
        expect(steps[1].unassigned).toBe(1);
        expect(steps[0].versions[0]).toMatchObject({ template_id: 't-1', recipients: 2, body: '<p>Line one</p><p>Line two</p>' });
        expect(sentByStep(assignments)).toEqual({ 's-1': 1 });
    });

    it('sends nothing for the steps when nothing changed', () => {
        const steps = buildSteps(sequences, assignments);
        expect(editBody({ steps, loadedSteps: steps, settingsBody: { settings: {} } })).toEqual({ settings: {} });
    });

    it('sends the whole list with only the changed versions, new steps and new values', () => {
        const loaded = buildSteps(sequences, assignments);
        let steps = loaded.map(s => ({ ...s }));
        steps[1] = { ...steps[1], wait_days: 4, versions: [{ ...steps[1].versions[0], subject: 'New' }] };
        steps = insertStep(steps, 0);
        steps[1].versions = [{ ...steps[1].versions[0], subject: 'Added', body: '<p>Body</p>' }];
        const body = editBody({ steps, loadedSteps: loaded });
        expect(body.steps).toEqual([
            { sequence_id: 's-1', templates: [] },
            { templates: [{ designation: null, subject: 'Added', body: '<p>Body</p>' }], wait_days: 2, stop_on_reply: true, stop_on_bounce: true },
            { sequence_id: 's-2', wait_days: 4, templates: [{ template_id: 't-2', designation: 'CFO', subject: 'New', body: '<p>B</p>' }] },
        ]);
        // deleting a step leaves it out
        expect(editBody({ steps: [loaded[0]], loadedSteps: loaded }).steps).toEqual([{ sequence_id: 's-1', templates: [] }]);
    });

    it('moves only new steps and validates before saving', () => {
        const loaded = buildSteps(sequences, assignments);
        expect(moveNewStep(loaded, 0, 1)).toBe(loaded);
        const withNew = insertStep(loaded, 1);
        expect(moveNewStep(withNew, 2, -1)[1].sequence_id).toBeNull();
        expect(stepsError(withNew)).toMatch(/subject and a body/);
        expect(stepsError([])).toMatch(/at least one step/);
        const single = [{ ...loaded[0], versions: [{ ...loaded[0].versions[0], subject: 'Hi {first_name}' }] }];
        expect(stepsError(single)).toMatch(/double braces/);
        expect(stepsError(loaded)).toBeNull();
    });

    it('describes the impact of a dry run', () => {
        expect(impactText({ unsent_emails_affected: 0 })).toMatch(/No unsent emails/);
        expect(impactText({ unsent_emails_affected: 3, emails_rerendered: 2, emails_rescheduled: 1 }))
            .toBe('3 unsent emails will be updated (2 re-written, 1 re-timed). Emails already sent are not changed.');
        expect(toEditorHtml('<p>x</p>')).toBe('<p>x</p>');
    });
});
