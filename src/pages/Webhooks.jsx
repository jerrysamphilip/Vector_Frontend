import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import LoadError from '../components/ui/LoadError';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useApiQuery } from '../lib/useApiQuery';
import { errorReference, errorText } from '../lib/apiErrors';
import { Plus, Trash2, Pencil, Send, KeyRound, Copy, Check, RotateCcw, ChevronDown, ChevronRight, Webhook, Power } from 'lucide-react';
import { webhooksApi } from '../api/webhooks';
import { PageHeader, card, cardShadow, Empty } from '../components/sales/shared';
import { Modal, Field, inputClass, PrimaryButton, SecondaryButton, ErrorNote, formatDateTime } from '../components/contacts/shared';
import { useAuth } from '../auth/AuthProvider';

// A failed request as one line with the request reference; a 422 lists every invalid field
const errText = (e) => {
    const d = e?.response?.data?.detail;
    if (!Array.isArray(d)) return errorText(e);
    const ref = errorReference(e);
    const msg = d.map(x => x?.msg).filter(Boolean).join('; ') || 'Check the form';
    return ref ? `${msg} (Reference: ${ref})` : msg;
};

const STATUS_TONES = {
    SUCCEEDED: 'bg-emerald-50 text-emerald-700',
    PENDING: 'bg-amber-50 text-amber-700',
    FAILED: 'bg-red-50 text-red-700',
    CANCELLED: 'bg-slate-100 text-slate-500',
};

function Badge({ tone, children, ...rest }) {
    return <span {...rest} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${tone}`}>{children}</span>;
}

function CopyButton({ value, testId }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard unavailable: the value stays selectable */ }
    };
    return (
        <SecondaryButton type="button" onClick={copy} data-testid={testId}>
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
        </SecondaryButton>
    );
}

/** The signing secret, shown once after create / rotate. */
function SecretModal({ endpoint, onClose }) {
    return (
        <Modal title="Signing secret" subtitle="Copy it now: it will not be shown again." onClose={onClose}
            footer={<PrimaryButton onClick={onClose} className="flex-1" data-testid="webhook-secret-done">I have saved it</PrimaryButton>}>
            <div className="space-y-3">
                <p className="text-sm text-slate-600">
                    Every request to <span className="font-medium break-all">{endpoint.url}</span> carries an
                    <code className="mx-1 text-xs bg-slate-100 px-1 py-0.5 rounded">X-Outreach-Signature</code> header
                    signed with this secret.
                </p>
                <div className="flex gap-2">
                    <input readOnly value={endpoint.secret} className={`${inputClass} font-mono text-xs`} data-testid="webhook-secret"
                        onFocus={e => e.target.select()} />
                    <CopyButton value={endpoint.secret} testId="webhook-copy-secret" />
                </div>
            </div>
        </Modal>
    );
}

function EndpointModal({ endpoint, eventTypes, onClose, onCreated }) {
    const qc = useQueryClient();
    const editing = !!endpoint;
    const [url, setUrl] = useState(endpoint?.url || '');
    const [description, setDescription] = useState(endpoint?.description || '');
    const [events, setEvents] = useState(endpoint?.event_types || []);
    const [error, setError] = useState('');
    const save = useMutation({
        mutationFn: () => {
            const payload = { url: url.trim(), description: description.trim() || null, event_types: events };
            return editing ? webhooksApi.update(endpoint.endpoint_id, payload) : webhooksApi.create(payload);
        },
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['webhooks'] });
            if (!editing) onCreated(data);
            onClose();
        },
        onError: (e) => setError(errText(e)),
    });
    const toggle = (t) => setEvents(ev => ev.includes(t) ? ev.filter(x => x !== t) : [...ev, t]);
    const allOn = eventTypes.length > 0 && events.length === eventTypes.length;
    const submit = (e) => {
        e.preventDefault();
        setError('');
        if (!url.trim()) { setError('Enter the endpoint URL'); return; }
        if (!events.length) { setError('Choose at least one event'); return; }
        save.mutate();
    };
    return (
        <Modal title={editing ? 'Edit endpoint' : 'Add webhook endpoint'} width="max-w-2xl"
            subtitle="We POST a signed JSON event to this URL whenever one of the chosen events happens."
            onClose={onClose}
            footer={<>
                <SecondaryButton type="button" onClick={onClose} className="flex-1">Cancel</SecondaryButton>
                <PrimaryButton type="submit" form="webhook-form" loading={save.isPending} className="flex-1" data-testid="webhook-save">
                    {editing ? 'Save' : 'Add endpoint'}
                </PrimaryButton>
            </>}>
            <form id="webhook-form" onSubmit={submit} className="space-y-4">
                <Field label="Endpoint URL" hint="HTTPS only; internal and private addresses are refused.">
                    <input className={inputClass} value={url} onChange={e => setUrl(e.target.value)} maxLength={2000}
                        placeholder="https://example.com/hooks/outreach" data-testid="webhook-url" autoFocus />
                </Field>
                <Field label="Description (optional)">
                    <input className={inputClass} value={description} onChange={e => setDescription(e.target.value)} maxLength={255}
                        placeholder="e.g. Sync to our data warehouse" data-testid="webhook-description" />
                </Field>
                <Field label="Events">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                        <input type="checkbox" className="accent-indigo-600" checked={allOn} data-testid="webhook-event-all"
                            onChange={() => setEvents(allOn ? [] : eventTypes.map(t => t.type))} />
                        All events
                    </label>
                    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
                        {eventTypes.map(t => (
                            <label key={t.type} className="flex items-start gap-2 text-sm text-slate-700" title={t.description}>
                                <input type="checkbox" className="accent-indigo-600 mt-0.5" checked={events.includes(t.type)}
                                    onChange={() => toggle(t.type)} data-testid={`webhook-event-${t.type}`} />
                                <span>{t.label} <code className="text-[11px] text-slate-400">{t.type}</code></span>
                            </label>
                        ))}
                    </div>
                </Field>
                <ErrorNote message={error} />
            </form>
        </Modal>
    );
}

function PayloadModal({ endpointId, deliveryId, onClose }) {
    const { data, error: loadError, isLoading, refetch } = useApiQuery(['webhook-delivery', endpointId, deliveryId],
        () => webhooksApi.delivery(endpointId, deliveryId));
    return (
        <Modal title="Delivery" subtitle={data ? `${data.event_type} · ${data.status}` : ''} width="max-w-2xl" onClose={onClose}>
            {loadError ? <LoadError error={loadError} onRetry={refetch} title="Couldn't load the delivery" compact />
                : isLoading || !data ? <p className="text-sm text-slate-400">Loading…</p> : (
                <div className="space-y-3 text-sm">
                    {data.last_error && <ErrorNote message={data.last_error} />}
                    <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs overflow-auto max-h-96" data-testid="webhook-payload">
                        {JSON.stringify(data.payload, null, 2)}
                    </pre>
                </div>
            )}
        </Modal>
    );
}

function DeliveryLog({ endpoint }) {
    const qc = useQueryClient();
    const [status, setStatus] = useState('');
    const [viewing, setViewing] = useState(null);
    const [error, setError] = useState('');
    const { data, error: loadError, isLoading, refetch } = useApiQuery(['webhooks', 'deliveries', endpoint.endpoint_id, status],
        () => webhooksApi.deliveries(endpoint.endpoint_id, { status, limit: 50 }), { refetchInterval: 15000 });
    const redeliver = useMutation({
        mutationFn: (deliveryId) => webhooksApi.redeliver(endpoint.endpoint_id, deliveryId),
        onSuccess: () => { setError(''); qc.invalidateQueries({ queryKey: ['webhooks', 'deliveries', endpoint.endpoint_id] }); },
        onError: (e) => setError(errText(e)),
    });
    const items = data?.items || [];
    return (
        <div className="mt-4 border-t border-slate-100 pt-4" data-testid="webhook-delivery-log">
            <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-slate-800">Recent deliveries {data ? <span className="text-slate-400 font-normal">({data.total})</span> : null}</h3>
                <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by status" data-testid="webhook-delivery-filter"
                    className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700">
                    <option value="">All</option><option value="SUCCEEDED">Succeeded</option><option value="PENDING">Retrying</option>
                    <option value="FAILED">Failed</option><option value="CANCELLED">Cancelled</option>
                </select>
            </div>
            <ErrorNote message={error} />
            {isLoading ? <p className="text-sm text-slate-400 py-3">Loading…</p>
                : loadError ? <LoadError error={loadError} onRetry={refetch} title="Couldn't load the delivery log" compact />
                : !items.length ? (
                <p className="text-sm text-slate-400 py-3 text-center">No deliveries yet.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                            <th className="py-2 font-semibold">Event</th><th className="font-semibold">Status</th>
                            <th className="font-semibold">Attempts</th><th className="font-semibold">Response</th>
                            <th className="font-semibold">When</th><th /></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map(d => (
                                <tr key={d.delivery_id} data-testid="webhook-delivery-row">
                                    <td className="py-2"><code className="text-xs">{d.event_type}</code></td>
                                    <td><Badge tone={STATUS_TONES[d.status] || STATUS_TONES.CANCELLED}>{d.status === 'PENDING' && d.attempts ? 'RETRYING' : d.status}</Badge></td>
                                    <td className="tabular-nums text-slate-600">{d.attempts}/{d.max_attempts}</td>
                                    <td className="text-slate-600 max-w-[240px] truncate" title={d.last_error || ''}>
                                        {d.response_code ? `HTTP ${d.response_code}` : (d.last_error ? d.last_error : '—')}
                                    </td>
                                    <td className="text-slate-500 text-xs whitespace-nowrap">{formatDateTime(d.last_attempt_at || d.created_at)}</td>
                                    <td className="text-right whitespace-nowrap">
                                        <button onClick={() => setViewing(d.delivery_id)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-1.5">View</button>
                                        {d.status !== 'PENDING' && endpoint.active && (
                                            <button onClick={() => redeliver.mutate(d.delivery_id)} disabled={redeliver.isPending}
                                                data-testid="webhook-redeliver"
                                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-1.5 inline-flex items-center gap-1">
                                                <RotateCcw className="w-3 h-3" /> Redeliver
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {viewing && <PayloadModal endpointId={endpoint.endpoint_id} deliveryId={viewing} onClose={() => setViewing(null)} />}
        </div>
    );
}

function EndpointCard({ endpoint, eventTypes, onEdit, onSecret }) {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [error, setError] = useState('');
    const refresh = () => qc.invalidateQueries({ queryKey: ['webhooks'] });
    const onError = (e) => setError(errText(e));
    const confirm = useConfirm();
    const test = useMutation({
        mutationFn: () => webhooksApi.test(endpoint.endpoint_id),
        onSuccess: (d) => { setError(''); setTestResult(d); refresh(); },
        onError,
    });
    const toggle = useMutation({
        mutationFn: () => webhooksApi.update(endpoint.endpoint_id, { active: !endpoint.active }),
        onSuccess: () => { setError(''); refresh(); }, onError,
    });
    const rotate = useMutation({
        mutationFn: () => webhooksApi.rotateSecret(endpoint.endpoint_id),
        onSuccess: (d) => { setError(''); onSecret(d); refresh(); }, onError,
    });
    const remove = useMutation({
        mutationFn: () => webhooksApi.remove(endpoint.endpoint_id),
        onSuccess: refresh, onError,
    });
    const labels = Object.fromEntries(eventTypes.map(t => [t.type, t.label]));
    return (
        <section className={`${card} p-5`} style={cardShadow} data-testid="webhook-row">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900 break-all" data-testid="webhook-row-url">{endpoint.url}</p>
                        {endpoint.active
                            ? <Badge tone="bg-emerald-50 text-emerald-700" data-testid="webhook-status">Active</Badge>
                            : <Badge tone="bg-slate-100 text-slate-600" data-testid="webhook-status">Off</Badge>}
                    </div>
                    {endpoint.description && <p className="text-sm text-slate-500 mt-0.5">{endpoint.description}</p>}
                    {!endpoint.active && endpoint.disabled_reason && (
                        <p className="text-xs text-red-600 mt-1">{endpoint.disabled_reason}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {(endpoint.event_types || []).map(t => (
                            <span key={t} className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] text-slate-600" title={t}>{labels[t] || t}</span>
                        ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        Secret <code>{endpoint.secret_hint}</code>
                        {' · '}Last success {endpoint.last_success_at ? formatDateTime(endpoint.last_success_at) : 'never'}
                        {endpoint.consecutive_failures > 0 && <span className="text-amber-600">{' · '}{endpoint.consecutive_failures} failure(s) in a row</span>}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                    <SecondaryButton onClick={() => test.mutate()} disabled={test.isPending} data-testid="webhook-test">
                        <Send className="w-4 h-4" /> {test.isPending ? 'Sending…' : 'Send test'}
                    </SecondaryButton>
                    <button onClick={() => onEdit(endpoint)} className="p-2 text-slate-400 hover:text-slate-700" aria-label="Edit endpoint" data-testid="webhook-edit"><Pencil className="w-4 h-4" /></button>
                    <button onClick={async () => { if (await confirm({ title: 'Create a new signing secret?', message: 'The current one stops working immediately.', confirmLabel: 'Rotate secret', danger: true })) rotate.mutate(); }}
                        className="p-2 text-slate-400 hover:text-slate-700" aria-label="Rotate secret" title="Rotate secret" data-testid="webhook-rotate"><KeyRound className="w-4 h-4" /></button>
                    <button onClick={() => toggle.mutate()} disabled={toggle.isPending}
                        className="p-2 text-slate-400 hover:text-slate-700" aria-label={endpoint.active ? 'Turn off' : 'Turn on'}
                        title={endpoint.active ? 'Turn off' : 'Turn on'} data-testid="webhook-toggle"><Power className="w-4 h-4" /></button>
                    <button onClick={async () => { if (await confirm({ title: 'Delete this endpoint?', message: 'The endpoint and its delivery log are deleted.', confirmLabel: 'Delete', danger: true })) remove.mutate(); }}
                        className="p-2 text-slate-400 hover:text-red-600" aria-label="Delete endpoint" data-testid="webhook-delete"><Trash2 className="w-4 h-4" /></button>
                </div>
            </div>
            {testResult && (
                <div data-testid="webhook-test-result"
                    className={`mt-3 px-3 py-2 rounded-lg text-sm ${testResult.status === 'SUCCEEDED' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {testResult.status === 'SUCCEEDED'
                        ? `Test event delivered (HTTP ${testResult.response_code}, ${testResult.duration_ms} ms).`
                        : `Test event failed: ${testResult.last_error || `HTTP ${testResult.response_code}`}`}
                </div>
            )}
            {error && <div className="mt-3"><ErrorNote message={error} /></div>}
            <button onClick={() => setOpen(o => !o)} data-testid="webhook-deliveries"
                className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />} Delivery log
            </button>
            {open && <DeliveryLog endpoint={endpoint} />}
        </section>
    );
}

export default function Webhooks() {
    const { isAdmin } = useAuth();
    const [editing, setEditing] = useState(null);   // {} = new, endpoint = edit
    const [secretFor, setSecretFor] = useState(null);
    const { data, isLoading, error, refetch } = useApiQuery(['webhooks', 'list'], () => webhooksApi.list(), { enabled: isAdmin });
    const { data: eventTypes = [] } = useQuery({ queryKey: ['webhooks', 'event-types'], queryFn: webhooksApi.eventTypes, enabled: isAdmin, staleTime: 600000 });

    if (!isAdmin) {
        return <div className="space-y-6"><PageHeader title="Webhooks" /><p className="text-sm text-slate-500">Only admins can manage webhooks.</p></div>;
    }
    const items = data?.items || [];
    const atLimit = data && items.length >= data.max_endpoints;
    return (
        <div className="space-y-6 max-w-5xl">
            <PageHeader title="Webhooks" subtitle="Notify other systems when contacts, leads, deals, emails or campaigns change.">
                <PrimaryButton onClick={() => setEditing({})} disabled={atLimit} data-testid="webhook-add"
                    title={atLimit ? `Up to ${data.max_endpoints} endpoints` : undefined}>
                    <Plus className="w-4 h-4" /> Add endpoint
                </PrimaryButton>
            </PageHeader>
            {isLoading ? <p className="text-sm text-slate-400">Loading…</p>
                : error ? <div className={card} style={cardShadow}><LoadError error={error} onRetry={refetch} title="Couldn't load the webhook endpoints" /></div>
                : !items.length ? (
                <div className={card} style={cardShadow}>
                    <Empty icon={Webhook} title="No webhook endpoints yet" text="Add an HTTPS endpoint and choose which events it receives." />
                </div>
            ) : (
                <div className="space-y-4">
                    {items.map(ep => (
                        <EndpointCard key={ep.endpoint_id} endpoint={ep} eventTypes={eventTypes}
                            onEdit={setEditing} onSecret={setSecretFor} />
                    ))}
                </div>
            )}
            <section className={`${card} p-5 text-sm text-slate-600 space-y-2`} style={cardShadow}>
                <h2 className="text-base font-semibold text-slate-900">Verifying requests</h2>
                <p>
                    Each request is a JSON <code>POST</code> with the headers <code>X-Outreach-Event</code>, <code>X-Outreach-Event-Id</code> and
                    {' '}<code>X-Outreach-Signature: t=&lt;timestamp&gt;,v1=&lt;signature&gt;</code>. The signature is the hex HMAC-SHA256 of
                    {' '}<code>&lt;timestamp&gt;.&lt;raw body&gt;</code> with your endpoint secret; reject requests whose timestamp is more than
                    five minutes old.
                </p>
                <p>
                    Reply with any 2xx status within 10 seconds. Other responses, redirects and timeouts are retried
                    {' '}{data?.max_attempts || 6} times in all with growing delays (1 min to 6 h). An endpoint that fails
                    {' '}{data?.disable_after_failures || 20} times in a row is switched off and admins are notified.
                </p>
            </section>
            {editing && (
                <EndpointModal endpoint={editing.endpoint_id ? editing : null} eventTypes={eventTypes}
                    onClose={() => setEditing(null)} onCreated={setSecretFor} />
            )}
            {secretFor && <SecretModal endpoint={secretFor} onClose={() => setSecretFor(null)} />}
        </div>
    );
}
