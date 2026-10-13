// Discount approval on quotes (BRD v2.0 BR-SF-17): badge, submit / approve / reject controls,
// the "Awaiting my approval" list and the workspace threshold setting.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, ShieldAlert, ShieldCheck, Send, X } from 'lucide-react';
import { errorMessage } from '../../api/contacts';
import { moneyExact, quoteApprovalsApi } from '../../api/sales';
import { ErrorNote, Field, PrimaryButton, SecondaryButton, inputClass, relativeDate } from '../contacts/shared';
import { Seg, card, cardShadow } from './shared';

const BADGE = {
    REQUIRED: ['Approval needed', 'bg-amber-50 text-amber-700'],
    PENDING: ['Awaiting approval', 'bg-amber-50 text-amber-700'],
    APPROVED: ['Discount approved', 'bg-emerald-50 text-emerald-700'],
    REJECTED: ['Discount rejected', 'bg-red-50 text-red-700'],
};

/** Small pill for a quote's approval state; nothing when no approval is involved. */
export function ApprovalBadge({ status, required }) {
    const key = status && status !== 'NOT_REQUIRED' ? status : (required ? 'REQUIRED' : null);
    if (!key) return null;
    const [label, tone] = BADGE[key];
    return <span data-testid="approval-badge" data-status={key} className={`inline-flex items-center h-6 px-2 rounded-md text-[11px] font-semibold ${tone}`}>{label}</span>;
}

/** Approval box inside the quote editor. `approval` comes with GET/PUT /proposals/{id}/lines. */
export function ApprovalPanel({ proposalId, approval, onChanged }) {
    const [text, setText] = useState('');
    const [error, setError] = useState(null);
    const done = () => { setText(''); setError(null); onChanged(); };
    const submit = useMutation({ mutationFn: () => quoteApprovalsApi.submit(proposalId, text.trim()), onSuccess: done, onError: e => setError(errorMessage(e)) });
    const approve = useMutation({ mutationFn: () => quoteApprovalsApi.approve(proposalId, text.trim()), onSuccess: done, onError: e => setError(errorMessage(e)) });
    const reject = useMutation({ mutationFn: () => quoteApprovalsApi.reject(proposalId, text.trim()), onSuccess: done, onError: e => setError(errorMessage(e)) });
    if (!approval || (approval.approval_threshold == null && approval.approval_status === 'NOT_REQUIRED')) return null;
    const a = approval;
    if (!a.approval_required && a.approval_status === 'NOT_REQUIRED') {
        return <p className="text-xs text-slate-500" data-testid="approval-panel">Discounts above {a.approval_threshold}% need a manager's approval before the quote is sent.</p>;
    }
    const tone = a.can_send ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/60';
    const Icon = a.can_send ? ShieldCheck : ShieldAlert;
    return (
        <div className={`rounded-lg border p-3 space-y-2 ${tone}`} data-testid="approval-panel">
            <div className="flex items-start gap-2">
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${a.can_send ? 'text-emerald-600' : 'text-amber-600'}`} />
                <div className="text-sm text-slate-700 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <ApprovalBadge status={a.approval_status} required={a.approval_required && !a.can_send} />
                        <span>Discount {a.effective_discount_pct}%{a.approval_threshold != null ? ` · limit ${a.approval_threshold}%` : ''}</span>
                    </div>
                    {a.approval_status === 'PENDING' && <p className="text-xs text-slate-500 mt-1">Asked by {a.approval_requested_by_name || 'the owner'} {relativeDate(a.approval_requested_at)}. The quote cannot be sent or accepted until it is approved.</p>}
                    {a.approval_status === 'NOT_REQUIRED' && a.approval_required && <p className="text-xs text-slate-500 mt-1">This discount is above the limit. Submit it for approval before sending the quote.</p>}
                    {['APPROVED', 'REJECTED'].includes(a.approval_status) && (
                        <p className="text-xs text-slate-500 mt-1">{a.approval_status === 'APPROVED' ? 'Approved' : 'Rejected'} by {a.approval_decided_by_name || 'a manager'} {relativeDate(a.approval_decided_at)}{a.approval_reason ? `: "${a.approval_reason}"` : ''}</p>
                    )}
                </div>
            </div>
            {(a.can_submit || a.can_decide) && (
                <div className="flex gap-2 items-center">
                    <input className={`${inputClass} flex-1`} maxLength={1000} value={text} onChange={e => setText(e.target.value)}
                        placeholder={a.can_decide ? 'Reason (required to reject)' : 'Note for the approver (optional)'} aria-label={a.can_decide ? 'Approval reason' : 'Approval note'} />
                    {a.can_submit && <PrimaryButton onClick={() => submit.mutate()} loading={submit.isPending}><Send className="w-4 h-4" /> Submit for approval</PrimaryButton>}
                    {a.can_decide && <>
                        <PrimaryButton onClick={() => approve.mutate()} loading={approve.isPending}><Check className="w-4 h-4" /> Approve</PrimaryButton>
                        <SecondaryButton onClick={() => reject.mutate()} disabled={reject.isPending || !text.trim()} className="text-red-600"><X className="w-4 h-4" /> Reject</SecondaryButton>
                    </>}
                </div>
            )}
            <ErrorNote message={error} />
        </div>
    );
}

function ApprovalRow({ item, onChanged }) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState(null);
    const done = () => { setReason(''); setError(null); onChanged(); };
    const approve = useMutation({ mutationFn: () => quoteApprovalsApi.approve(item.proposal_id, reason.trim()), onSuccess: done, onError: e => setError(errorMessage(e)) });
    const reject = useMutation({ mutationFn: () => quoteApprovalsApi.reject(item.proposal_id, reason.trim()), onSuccess: done, onError: e => setError(errorMessage(e)) });
    return (
        <tr className="align-top" data-testid="approval-row">
            <td className="pl-5 py-3">
                <Link to={`/app/deals/${item.opportunity_id}`} className="font-medium text-slate-800 hover:text-indigo-700">{item.title}</Link>
                <p className="text-xs text-slate-500">{item.company_name || item.opportunity_name} · {item.owner_name}</p>
            </td>
            <td className="px-3 py-3 text-right tabular-nums">{moneyExact(item.amount)}</td>
            <td className="px-3 py-3 text-right tabular-nums font-semibold">{item.effective_discount_pct}%</td>
            <td className="px-3 py-3 text-xs text-slate-500">{item.approval_requested_by_name}<br />{relativeDate(item.approval_requested_at)}</td>
            <td className="px-3 pr-5 py-3">
                {item.can_decide ? (
                    <div className="space-y-1.5 min-w-[260px]">
                        <input className={inputClass} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (required to reject)" aria-label="Approval reason" />
                        <div className="flex gap-2">
                            <PrimaryButton onClick={() => approve.mutate()} loading={approve.isPending}><Check className="w-4 h-4" /> Approve</PrimaryButton>
                            <SecondaryButton onClick={() => reject.mutate()} disabled={reject.isPending || !reason.trim()} className="text-red-600"><X className="w-4 h-4" /> Reject</SecondaryButton>
                        </div>
                        <ErrorNote message={error} />
                    </div>
                ) : <ApprovalBadge status={item.approval_status} />}
                {!item.can_decide && item.approval_reason && <p className="text-xs text-slate-500 mt-1">"{item.approval_reason}"</p>}
            </td>
        </tr>
    );
}

/** "Awaiting my approval" (and quotes I sent for approval) on the pipeline page. */
export function ApprovalsList() {
    const qc = useQueryClient();
    const [scope, setScope] = useState('mine');
    const [status, setStatus] = useState('PENDING');
    const { data, isLoading } = useQuery({ queryKey: ['quote-approvals', scope, status], queryFn: () => quoteApprovalsApi.list({ scope, status }) });
    const refresh = () => ['quote-approvals', 'proposals', 'deal', 'quote'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
                <Seg options={[['mine', 'Awaiting my approval'], ['requested', 'My requests']]} value={scope} onChange={setScope} />
                <Seg options={[['PENDING', 'Pending'], ['APPROVED', 'Approved'], ['REJECTED', 'Rejected'], ['ALL', 'All']]} value={status} onChange={setStatus} />
                {data?.threshold != null && <span className="text-xs text-slate-500">Approval limit: discounts above {data.threshold}%</span>}
            </div>
            <div className={`${card} overflow-hidden`} style={cardShadow}>
                {isLoading ? <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div> : !data.items.length ? (
                    <p className="text-sm text-slate-400 text-center py-10" data-testid="approvals-empty">{scope === 'mine' && status === 'PENDING' ? 'Nothing is waiting for your approval.' : 'No quotes here.'}</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead><tr className="bg-slate-50/80 text-xs font-semibold text-left text-slate-400 uppercase tracking-wide">
                            <th className="pl-5 py-3">Quote</th><th className="px-3 py-3 text-right">Amount</th><th className="px-3 py-3 text-right">Discount</th>
                            <th className="px-3 py-3">Requested</th><th className="px-3 pr-5 py-3">Decision</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.items.map(i => <ApprovalRow key={i.proposal_id} item={i} onChanged={refresh} />)}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

/** Workspace threshold, on the Sales settings page (admins). */
export function DiscountApprovalSettings() {
    const qc = useQueryClient();
    const { data } = useQuery({ queryKey: ['quote-approval-settings'], queryFn: quoteApprovalsApi.settings });
    const [value, setValue] = useState('');
    const [saved, setSaved] = useState(false);
    useEffect(() => { if (data) setValue(data.discount_approval_threshold ?? ''); }, [data]);
    const save = useMutation({
        mutationFn: () => quoteApprovalsApi.saveSettings(value === '' ? null : Number(value)),
        onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2500); qc.invalidateQueries({ queryKey: ['quote-approval-settings'] }); qc.invalidateQueries({ queryKey: ['sales-settings'] }); },
    });
    return (
        <section className={`${card} p-5`} style={cardShadow} data-testid="discount-approval-settings">
            <h2 className="text-base font-semibold text-slate-900">Discount approval</h2>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">Quotes with a discount above this percent (on any line or overall) must be approved by the owner's manager or an admin before they can be sent or accepted. Leave empty to turn it off.</p>
            <div className="flex items-end gap-3 flex-wrap">
                <Field label="Approval needed above (%)" className="w-56">
                    <input type="number" min="0" max="100" step="0.01" className={inputClass} value={value} placeholder="Off"
                        onChange={e => setValue(e.target.value)} aria-label="Discount approval threshold" />
                </Field>
                <PrimaryButton onClick={() => save.mutate()} loading={save.isPending}>Save</PrimaryButton>
                {value !== '' && <SecondaryButton onClick={() => setValue('')}>Turn off</SecondaryButton>}
                {saved && <span className="text-sm text-emerald-600">Saved</span>}
            </div>
            {save.error && <div className="mt-2"><ErrorNote message={errorMessage(save.error)} /></div>}
        </section>
    );
}
