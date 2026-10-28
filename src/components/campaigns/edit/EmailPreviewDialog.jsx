import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import DialogPanel from '../../ui/DialogPanel';
import { campaignApi } from '../../../api/campaigns';
import { errorMessage } from '../../../lib/apiErrors';
import { sanitizeHtml } from '../../../lib/sanitizeHtml';

const SOURCE_LABEL = {
    scheduled_email: 'The scheduled email (what goes out next)',
    sent_email: 'Already sent',
    template: 'Rendered from the template',
    draft: 'Your unsaved changes',
};

/**
 * Preview one step email as it will be sent to a real enrolled contact (POST /campaigns/{id}/email-previews):
 * rendered for the contact with the postal address, unsubscribe line and sign-off the sender adds. With
 * ``draft`` (unsaved subject / body from the editor) the preview shows the edit before it is saved.
 */
export default function EmailPreviewDialog({ campaignId, prospects, stepNumber, templateId, draft, onClose }) {
    const [prospectId, setProspectId] = useState(prospects[0]?.prospect_id || '');
    const [state, setState] = useState({ loading: false, data: null, error: null });

    useEffect(() => {
        if (!prospectId) return undefined;
        let live = true;
        setState(s => ({ ...s, loading: true, error: null }));
        campaignApi.previewEmail(campaignId, { prospectId, stepNumber, templateId, ...(draft || {}) })
            .then(data => { if (live) setState({ loading: false, data, error: null }); })
            .catch(error => { if (live) setState({ loading: false, data: null, error }); });
        return () => { live = false; };
    }, [campaignId, prospectId, stepNumber, templateId, draft]);

    const data = state.data;
    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <DialogPanel onClose={onClose} labelledBy="email-preview-title" className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl p-6">
                <div className="flex items-start justify-between gap-3">
                    <h2 id="email-preview-title" className="text-base font-semibold text-slate-900">Preview step {stepNumber}</h2>
                    <button type="button" onClick={onClose} aria-label="Close preview" className="p-1 rounded-md hover:bg-slate-100"><X className="w-4 h-4" /></button>
                </div>
                {prospects.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-600">Enrol contacts in this campaign to preview their emails.</p>
                ) : (
                    <label className="mt-4 block text-xs font-semibold text-slate-600">
                        Preview as
                        <select value={prospectId} onChange={e => setProspectId(e.target.value)} className="mt-1 w-full h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white">
                            {prospects.map(p => (
                                <option key={p.prospect_id} value={p.prospect_id}>{p.name || p.email} · {p.email}</option>
                            ))}
                        </select>
                    </label>
                )}
                {state.loading && <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Rendering...</p>}
                {state.error && <p role="alert" className="mt-4 text-sm text-red-600">{errorMessage(state.error)}</p>}
                {data && !state.loading && (
                    <div className="mt-4 space-y-3 text-sm">
                        <p className="text-xs text-slate-500">{SOURCE_LABEL[data.source] || data.source}{data.persona ? ` · persona ${data.persona}` : ''}</p>
                        <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1">
                            <dt className="text-slate-500">From</dt><dd>{data.from_name} &lt;{data.from_email || 'no mailbox selected'}&gt;</dd>
                            <dt className="text-slate-500">To</dt><dd>{data.to_email}</dd>
                            <dt className="text-slate-500">Subject</dt><dd className="font-semibold" data-testid="preview-subject">{data.subject}</dd>
                        </dl>
                        {data.is_html
                            ? <div className="prose prose-sm max-w-none whitespace-pre-line rounded-lg border border-slate-200 p-4" data-testid="preview-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.body) }} />
                            : <pre className="whitespace-pre-wrap font-sans rounded-lg border border-slate-200 p-4" data-testid="preview-body">{data.body}</pre>}
                    </div>
                )}
            </DialogPanel>
        </div>
    );
}
