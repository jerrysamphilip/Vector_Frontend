import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Unplug, Mail, CalendarDays, CheckCircle2, AlertTriangle } from 'lucide-react';
import { connectionsApi } from '../api/sales';
import { PageHeader, card, cardShadow } from '../components/sales/shared';
import { PrimaryButton, SecondaryButton, ErrorNote, formatDateTime } from '../components/contacts/shared';

const PROVIDERS = [
    { key: 'google', code: 'GOOGLE', name: 'Google', detail: 'Gmail and Google Calendar' },
    { key: 'microsoft', code: 'MICROSOFT', name: 'Microsoft', detail: 'Outlook mail and calendar (Microsoft 365)' },
];
const errText = (e) => e?.response?.data?.detail || 'Something went wrong';

/** Connect your own mailbox and calendar: emails and meetings with contacts land on their timelines (BR-SF-16). */
export default function Connections() {
    const qc = useQueryClient();
    const [params, setParams] = useSearchParams();
    const [result, setResult] = useState(null);
    const { data, isLoading } = useQuery({ queryKey: ['connections'], queryFn: connectionsApi.list });
    const refresh = () => qc.invalidateQueries({ queryKey: ['connections'] });
    const start = useMutation({ mutationFn: connectionsApi.start, onSuccess: (r) => { window.location.href = r.authorize_url; } });
    const update = useMutation({ mutationFn: ({ id, ...p }) => connectionsApi.update(id, p), onSuccess: refresh });
    const sync = useMutation({ mutationFn: connectionsApi.sync, onSuccess: (r) => { setResult(r); refresh(); } });
    const remove = useMutation({ mutationFn: connectionsApi.remove, onSuccess: refresh });
    const status = params.get('sync');

    return (
        <div className="space-y-6 max-w-3xl">
            <PageHeader title="Email and calendar sync"
                subtitle="Connect your own account. Emails and meetings with your contacts are logged on their timelines every 10 minutes, and meetings you log on a deal can be added to your calendar." />
            {status === 'connected' && (
                <div className="flex items-center justify-between gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700">
                    <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Connected. The first sync has run.</span>
                    <button onClick={() => setParams({})} className="text-xs font-semibold">Dismiss</button>
                </div>
            )}
            {status === 'error' && <ErrorNote message={`Could not connect: ${params.get('message') || 'unknown error'}`} />}
            <ErrorNote message={(start.error || sync.error || update.error || remove.error) && errText(start.error || sync.error || update.error || remove.error)} />
            {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : PROVIDERS.map(p => {
                const conn = data?.connections.find(c => c.provider === p.code);
                const available = data?.available?.[p.code];
                return (
                    <div key={p.key} className={`${card} p-5`} style={cardShadow}>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="font-semibold text-slate-900">{p.name}</p>
                                <p className="text-sm text-slate-500">{conn ? conn.account_email : p.detail}</p>
                            </div>
                            {conn ? (
                                <div className="flex gap-2">
                                    <SecondaryButton onClick={() => sync.mutate(conn.connection_id)} disabled={sync.isPending}>
                                        <RefreshCw className={`w-4 h-4 ${sync.isPending ? 'animate-spin' : ''}`} /> Sync now
                                    </SecondaryButton>
                                    <SecondaryButton onClick={() => window.confirm(`Disconnect ${conn.account_email}? Items already logged stay.`) && remove.mutate(conn.connection_id)}>
                                        <Unplug className="w-4 h-4" /> Disconnect
                                    </SecondaryButton>
                                </div>
                            ) : (
                                <PrimaryButton onClick={() => start.mutate(p.key)} loading={start.isPending && start.variables === p.key} disabled={!available}>
                                    Connect {p.name}
                                </PrimaryButton>
                            )}
                        </div>
                        {!conn && !available && (
                            <p className="text-xs text-slate-400 mt-3">Not set up on this server yet. An administrator needs to add the {p.name} app credentials.</p>
                        )}
                        {conn && (
                            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                                <div className="flex gap-6">
                                    <label className="flex items-center gap-2 text-sm text-slate-700">
                                        <input type="checkbox" className="accent-indigo-600" checked={conn.sync_email}
                                            onChange={e => update.mutate({ id: conn.connection_id, sync_email: e.target.checked })} />
                                        <Mail className="w-4 h-4 text-slate-400" /> Log emails
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-slate-700">
                                        <input type="checkbox" className="accent-indigo-600" checked={conn.sync_calendar}
                                            onChange={e => update.mutate({ id: conn.connection_id, sync_calendar: e.target.checked })} />
                                        <CalendarDays className="w-4 h-4 text-slate-400" /> Log meetings and add deal meetings to my calendar
                                    </label>
                                </div>
                                <p className="text-xs text-slate-500">Last synced {conn.last_sync_at ? formatDateTime(conn.last_sync_at) : 'never'}</p>
                                {conn.last_error && (
                                    <p className="text-xs text-red-600 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {conn.last_error}</p>
                                )}
                                {result && result.connection?.connection_id === conn.connection_id && (
                                    <p className="text-xs text-emerald-700">Logged {result.emails || 0} email(s) and {result.meetings || 0} meeting(s).</p>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
            <p className="text-xs text-slate-400">Only messages and meetings with people already in your contacts are logged. Other mail is never stored.</p>
        </div>
    );
}
