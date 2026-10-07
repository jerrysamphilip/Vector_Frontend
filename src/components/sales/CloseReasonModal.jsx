import { useState } from 'react';
import { Modal, Field, inputClass, PrimaryButton, SecondaryButton } from '../contacts/shared';
import { useLeadsMeta } from './shared';

/** Ask why a deal was won or lost before closing it (BR-SF-05). */
export default function CloseReasonModal({ stage, dealName, initial = '', onConfirm, onClose, busy }) {
    const meta = useLeadsMeta();
    const reasons = (stage.is_won ? meta?.win_reasons : meta?.loss_reasons) || [];
    const [choice, setChoice] = useState(reasons.includes(initial) ? initial : initial ? '__other' : '');
    const [other, setOther] = useState(reasons.includes(initial) ? '' : initial);
    const reason = choice === '__other' ? other.trim() : choice;
    const required = meta?.require_close_reason !== false;
    return (
        <Modal title={stage.is_won ? 'Mark as won' : 'Mark as lost'} subtitle={dealName} onClose={onClose}
            footer={<>
                <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
                <PrimaryButton className="flex-1" loading={busy} disabled={required && !reason} onClick={() => onConfirm(reason || null)}>
                    Move to {stage.name}
                </PrimaryButton>
            </>}>
            <div className="space-y-3">
                <Field label={stage.is_won ? 'Why did we win?' : 'Why did we lose?'}>
                    <div className="space-y-1.5">
                        {reasons.map(r => (
                            <label key={r} className="flex items-center gap-2 text-sm text-slate-700">
                                <input type="radio" name="close-reason" className="accent-indigo-600" checked={choice === r} onChange={() => setChoice(r)} /> {r}
                            </label>
                        ))}
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input type="radio" name="close-reason" className="accent-indigo-600" checked={choice === '__other'} onChange={() => setChoice('__other')} /> Other
                        </label>
                    </div>
                </Field>
                {choice === '__other' && (
                    <input autoFocus className={inputClass} value={other} onChange={e => setOther(e.target.value)} placeholder="Describe the reason" />
                )}
                {required && <p className="text-xs text-slate-400">A reason is required to close a deal.</p>}
            </div>
        </Modal>
    );
}
