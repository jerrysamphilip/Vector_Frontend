// Campaign editor (F-04 / F-05) state: the steps with every persona version of each step, built from
// GET /campaigns/{id}/sequences and GET /campaigns/{id}/template-assignments, and the POST /campaigns/{id}/edits
// body built back from it. Pure functions (unit-tested in campaignEditModel.test.js).
//
// Rules the API applies (app/domain/campaigns_edit.py): existing steps keep their order (new steps may be
// inserted anywhere), a step left out is deleted (refused once one of its emails went out), 1-7 steps, a new
// step needs at least one email with a subject and a body.

export const MAX_STEPS = 7;
const SENT_STATES = new Set(['SENT', 'SENDING', 'BOUNCED', 'COMPLAINED']);

let seq = 0;
const key = (prefix) => `${prefix}-${(seq += 1)}`;

function versionFrom(t) {
    return {
        key: t.template_id || key('tpl'),
        template_id: t.template_id || null,
        designation: t.designation || '',
        subject: t.subject || '',
        body: toEditorHtml(t.body),
        recipients: t.recipients ?? 0,
        original: t.template_id ? { designation: t.designation || '', subject: t.subject || '', body: toEditorHtml(t.body) } : null,
    };
}

/** Sent (or sending) emails per sequence_id, from the assignments' message states. */
export function sentByStep(assignments) {
    const out = {};
    for (const p of assignments?.prospects || []) {
        for (const a of p.assignments || []) {
            if (SENT_STATES.has(a.message_status)) out[a.sequence_id] = (out[a.sequence_id] || 0) + 1;
        }
    }
    return out;
}

/** Editor steps from the sequence list and the template assignments (persona versions with recipients). */
export function buildSteps(sequences = [], assignments = null) {
    const byStep = Object.fromEntries((assignments?.steps || []).map(s => [s.sequence_id, s]));
    const sent = sentByStep(assignments);
    return [...sequences]
        .sort((a, b) => a.step_number - b.step_number)
        .map(s => ({
            key: s.sequence_id,
            sequence_id: s.sequence_id,
            wait_days: s.wait_days ?? 0,
            stop_on_reply: s.stop_on_reply ?? true,
            stop_on_bounce: s.stop_on_bounce ?? true,
            original: { wait_days: s.wait_days ?? 0, stop_on_reply: s.stop_on_reply ?? true, stop_on_bounce: s.stop_on_bounce ?? true },
            sent: sent[s.sequence_id] || 0,
            unassigned: byStep[s.sequence_id]?.unassigned || 0,
            versions: (byStep[s.sequence_id]?.templates || []).map(versionFrom),
        }));
}

export function newStep() {
    return {
        key: key('step'), sequence_id: null, wait_days: 2, stop_on_reply: true, stop_on_bounce: true, original: null,
        sent: 0, unassigned: 0, versions: [versionFrom({ designation: '', subject: '', body: '' })],
    };
}

export function newVersion(designation = '') {
    return versionFrom({ designation, subject: '', body: '' });
}

/** Insert a new step after position ``index`` (-1 = first). */
export function insertStep(steps, index) {
    if (steps.length >= MAX_STEPS) return steps;
    const next = [...steps];
    next.splice(index + 1, 0, newStep());
    return next;
}

/** Move a NEW step up / down (existing steps never change order). */
export function moveNewStep(steps, index, delta) {
    const target = index + delta;
    if (steps[index]?.sequence_id || target < 0 || target >= steps.length) return steps;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
}

export const canDelete = (step) => !step.sent;

const versionChanged = (v) => !v.original || v.subject !== v.original.subject || v.body !== v.original.body
    || v.designation !== v.original.designation;

function templatesBody(step) {
    return step.versions.filter(versionChanged).map(v => ({
        ...(v.template_id ? { template_id: v.template_id } : {}),
        designation: v.designation.trim() || null,
        subject: v.subject,
        body: v.body,
    }));
}

/** The steps part of the edit body, or undefined when the step list did not change at all. */
export function stepsBody(steps, loaded) {
    const sameList = steps.length === loaded.length && steps.every((s, i) => s.sequence_id && s.sequence_id === loaded[i].sequence_id);
    const body = steps.map(s => {
        const step = { ...(s.sequence_id ? { sequence_id: s.sequence_id } : {}), templates: templatesBody(s) };
        if (!s.original || s.wait_days !== s.original.wait_days) step.wait_days = Number(s.wait_days) || 0;
        if (!s.original || s.stop_on_reply !== s.original.stop_on_reply) step.stop_on_reply = s.stop_on_reply;
        if (!s.original || s.stop_on_bounce !== s.original.stop_on_bounce) step.stop_on_bounce = s.stop_on_bounce;
        return step;
    });
    const changed = !sameList || body.some(s => s.templates.length || 'wait_days' in s || 'stop_on_reply' in s || 'stop_on_bounce' in s);
    return changed ? body : undefined;
}

/** What is wrong with the steps before saving (null when nothing). */
export function stepsError(steps) {
    if (!steps.length) return 'A campaign needs at least one step';
    if (steps.length > MAX_STEPS) return `At most ${MAX_STEPS} steps`;
    for (const [i, s] of steps.entries()) {
        const number = i + 1;
        if (!s.versions.length) return `Step ${number} needs an email`;
        for (const v of s.versions) {
            if (!v.subject.trim() || !v.body.replace(/<[^>]*>/g, '').trim()) return `Step ${number}: every email needs a subject and a body`;
            if (/(^|[^{])\{[a-z_]+\}(?!\})/i.test(`${v.subject} ${v.body}`)) {
                return `Step ${number}: use double braces like {{first_name}} for personalization tags`;
            }
        }
        const personas = s.versions.map(v => v.designation.trim().toLowerCase());
        if (new Set(personas).size !== personas.length) return `Step ${number}: two emails are for the same persona`;
        const wait = Number(s.wait_days);
        if (!Number.isInteger(wait) || wait < 0 || wait > 30) return `Step ${number}: wait days must be 0-30`;
    }
    return null;
}

/** The POST /campaigns/{id}/edits body: { settings?, inbox_ids?, steps? } (expected_version is added by the API client). */
export function editBody({ steps, loadedSteps, settingsBody }) {
    const body = { ...(settingsBody || {}) };
    const s = stepsBody(steps, loadedSteps);
    if (s) body.steps = s;
    return body;
}

/** "N unsent emails will be updated" text for a dry-run result. */
export function impactText(check) {
    const n = check?.unsent_emails_affected || 0;
    if (!n) return 'No unsent emails need to change.';
    const parts = [
        check.emails_rerendered && `${check.emails_rerendered} re-written`,
        check.emails_rescheduled && `${check.emails_rescheduled} re-timed`,
        check.emails_rebound && `${check.emails_rebound} moved to other mailboxes`,
        check.emails_created && `${check.emails_created} added`,
        check.emails_removed && `${check.emails_removed} removed`,
    ].filter(Boolean);
    return `${n} unsent email${n === 1 ? '' : 's'} will be updated${parts.length ? ` (${parts.join(', ')})` : ''}. Emails already sent are not changed.`;
}

const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The rich text editor works in HTML: a legacy plain-text body is wrapped once (paragraphs, line breaks). */
export function toEditorHtml(body) {
    const text = body || '';
    if (/<[^>]+>/.test(text)) return text;
    return text.split(/\n{2,}/).map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
}
