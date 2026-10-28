import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, History, Loader2, RotateCcw, Wand2 } from 'lucide-react';
import { companiesApi } from '../../api/accounts';
import { errorMessage } from '../../api/contacts';
import { useConfirm } from '../ui/ConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { ErrorNote, Modal, PrimaryButton, SecondaryButton, relativeDate } from '../contacts/shared';

const STAT_LABELS = [
    ['contacts_to_link', 'Contacts to link'],
    ['companies_to_create', 'Companies to create'],
    ['existing_companies_used', 'Existing companies used'],
    ['domains_to_set', 'Companies getting a domain'],
    ['company_names_to_fill', 'Empty company names filled'],
    ['contacts_in_conflict', 'Contacts blocked'],
    ['contacts_skipped', 'Contacts without company info'],
];
const RUN_LABELS = [['contacts_linked', 'linked'], ['companies_created', 'companies created'], ['company_names_filled', 'names filled']];
const ACTION_LABELS = { CREATE: 'Create', LINK: 'Link to existing', CONFLICT: 'Blocked' };
const STATUS_STYLES = { COMPLETED: 'bg-emerald-50 text-emerald-700', FAILED: 'bg-red-50 text-red-700', UNDONE: 'bg-slate-100 text-slate-600', RUNNING: 'bg-amber-50 text-amber-700' };

function PreviewSummary({ preview }) {
    const stats = preview.stats || {};
    return (
        <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-2">
                {STAT_LABELS.map(([key, label]) => (
                    <div key={key} className="px-3 py-2 rounded-xl bg-slate-50">
                        <dt className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</dt>
                        <dd className="text-lg font-bold text-slate-800">{(stats[key] ?? 0).toLocaleString()}</dd>
                    </div>
                ))}
            </dl>
            {preview.samples?.length > 0 && (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Largest changes</p>
                    <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl max-h-48 overflow-y-auto">
                        {preview.samples.map((s, i) => (
                            <li key={i} className="px-3 py-2 text-sm flex items-baseline gap-2">
                                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">{ACTION_LABELS[s.action] || s.action}</span>
                                <span className="font-medium text-slate-800 truncate">{s.company_name}</span>
                                {s.domain && <span className="text-xs text-slate-400 truncate">{s.domain}</span>}
                                <span className="ml-auto text-xs text-slate-500 whitespace-nowrap">{s.contacts} contact{s.contacts === 1 ? '' : 's'}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {preview.conflicts?.length > 0 && (
                <div>
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1.5 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Needs a look</p>
                    <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                        {preview.conflicts.map((c, i) => (
                            <li key={i} className="px-3 py-2 text-sm rounded-xl bg-amber-50 text-amber-900">
                                <span className="font-semibold">{c.company_name}</span>{c.domain ? ` (${c.domain})` : ''}: {c.message}
                                {c.example_emails?.length > 0 && <span className="block text-xs text-amber-700 truncate">{c.example_emails.join(', ')}</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

function RunHistory({ onUndone }) {
    const queryClient = useQueryClient();
    const { data, isLoading } = useQuery({ queryKey: ['account-backfill-runs'], queryFn: companiesApi.backfillRuns });
    const [error, setError] = useState(null);
    const confirm = useConfirm();
    const undo = useMutation({
        mutationFn: companiesApi.backfillUndo,
        onSuccess: () => { setError(null); queryClient.invalidateQueries({ queryKey: ['account-backfill-runs'] }); onUndone(); },
        onError: err => setError(errorMessage(err)),
    });
    const runs = data?.items || [];
    if (isLoading) return <div className="py-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-indigo-500" /></div>;
    if (!runs.length) return <p className="text-sm text-slate-400">No runs yet.</p>;
    return (
        <div className="space-y-2">
            <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
                {runs.map(r => (
                    <li key={r.run_id} className="px-3 py-2 text-sm flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${STATUS_STYLES[r.status] || ''}`}>{r.status.toLowerCase()}</span>
                        <span className="text-slate-700">{RUN_LABELS.map(([k, l]) => `${r.stats?.[k] ?? 0} ${l}`).join(' · ')}</span>
                        <span className="text-xs text-slate-400">{r.started_by_name || 'someone'} · {relativeDate(r.started_at)}</span>
                        {r.can_undo && (
                            <button onClick={async () => {
                                if (await confirm({ title: 'Undo this run?', message: 'Links and companies it created are removed, and the contact fields it filled are put back, where nothing changed them since.', confirmLabel: 'Undo run' })) undo.mutate(r.run_id);
                            }}
                                disabled={undo.isPending}
                                className="ml-auto h-7 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 disabled:opacity-60">
                                <RotateCcw className="w-3.5 h-3.5" /> Undo
                            </button>
                        )}
                    </li>
                ))}
            </ul>
            <ErrorNote message={error} />
        </div>
    );
}

/**
 * Link contacts to companies (C-14): a dry-run preview first, then the run, with the run history and undo.
 */
export default function BackfillDialog({ onClose, onChanged }) {
    const [tab, setTab] = useState('preview');
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const preview = useQuery({ queryKey: ['account-backfill-preview'], queryFn: companiesApi.backfillPreview, gcTime: 0, retry: false });
    const run = useMutation({
        mutationFn: companiesApi.backfillRun,
        onSuccess: res => { setResult(res); setError(null); onChanged(); },
        onError: err => setError(errorMessage(err)),
    });
    const toLink = preview.data?.stats?.contacts_to_link ?? 0;
    return (
        <Modal title="Link contacts by company" subtitle="Give contacts without a company the one their email domain or company name points to"
            onClose={onClose} width="max-w-2xl"
            footer={<>
                <SecondaryButton onClick={onClose} className="flex-1">Close</SecondaryButton>
                {tab === 'preview' && !result && (
                    <PrimaryButton onClick={() => run.mutate()} loading={run.isPending} disabled={!toLink || preview.isLoading} className="flex-1">
                        <Wand2 className="w-4 h-4" /> Link {toLink.toLocaleString()} contact{toLink === 1 ? '' : 's'}
                    </PrimaryButton>
                )}
            </>}>
            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="flex gap-1 mb-4 bg-slate-100 rounded-xl p-0.5 w-fit" aria-label="Link contacts">
                    {[['preview', 'Preview'], ['history', 'Runs']].map(([key, label]) => (
                        <TabsTrigger key={key} value={key}
                            className={`px-3 h-8 text-sm font-medium rounded-lg flex items-center gap-1.5 ${tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>
                            {key === 'history' && <History className="w-3.5 h-3.5" />}{label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                <TabsContent value="history"><RunHistory onUndone={onChanged} /></TabsContent>
                <TabsContent value="preview">
                    {result ? (
                        <div className="px-4 py-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm">
                            Done: {RUN_LABELS.map(([k, l]) => `${result.stats?.[k] ?? 0} ${l}`).join(', ')}. You can undo this run from the Runs tab.
                        </div>
                    ) : preview.isLoading ? (
                        <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                    ) : preview.error ? (
                        <ErrorNote message={errorMessage(preview.error)} />
                    ) : (
                        <PreviewSummary preview={preview.data} />
                    )}
                </TabsContent>
            </Tabs>
            <div className="mt-3"><ErrorNote message={error} /></div>
        </Modal>
    );
}
