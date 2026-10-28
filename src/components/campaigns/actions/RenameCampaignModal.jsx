import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
import DialogPanel from '../../common/DialogPanel';
import { campaignApi } from '../../../api/campaigns';
import { errorMessage } from '../../../lib/apiErrors';
import { isStaleVersion } from '../../../lib/staleVersion';

/** Rename a campaign: PUT /campaigns/{id} with the row_version on screen (a stale one is a 409). */
export default function RenameCampaignModal({ campaign, onClose, onRenamed }) {
    const [name, setName] = useState(campaign.campaign_name || '');
    const [error, setError] = useState('');
    const titleId = `rename-title-${campaign.campaign_id}`;
    const trimmed = name.trim();

    const mutation = useMutation({
        mutationFn: () => campaignApi.rename(campaign.campaign_id, trimmed, campaign.row_version),
        onSuccess: (updated) => { onRenamed?.(updated); onClose(); },
        onError: (err) => { if (!isStaleVersion(err)) setError(errorMessage(err)); },
    });

    const submit = (e) => {
        e.preventDefault();
        if (!trimmed) { setError('Enter a name'); return; }
        if (trimmed === campaign.campaign_name) { onClose(); return; }
        setError('');
        mutation.mutate();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <DialogPanel onClose={onClose} labelledBy={titleId} className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl">
                <form onSubmit={submit} className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                        <h2 id={titleId} className="text-lg font-bold text-slate-900">Rename campaign</h2>
                        <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
                    </div>
                    <label className="block text-sm font-medium text-slate-700">
                        Name
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={255}
                            data-autofocus
                            aria-invalid={Boolean(error)}
                            className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                        />
                    </label>
                    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 inline-flex items-center gap-2">
                            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save
                        </button>
                    </div>
                </form>
            </DialogPanel>
        </div>
    );
}
