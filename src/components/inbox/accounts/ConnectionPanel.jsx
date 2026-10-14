import { useEffect, useState } from 'react';
import { Loader2, Pencil, Zap } from 'lucide-react';
import { inboxesApi } from '../../../api/inboxes';
import { errorText } from './shared';

// Sending (SMTP) and receiving (IMAP) settings for one inbox, with edit and live sign-in tests.
export default function ConnectionPanel({ inbox, onEdit }) {
    const [results, setResults] = useState({});
    const [testing, setTesting] = useState(null);
    useEffect(() => { setResults({}); }, [inbox?.inbox_id]);
    if (!inbox) return null;
    const oauth = inbox.auth_type === 'OAUTH_MS365';

    const runTest = async (kind) => {
        setTesting(kind);
        try {
            const r = kind === 'smtp' ? await inboxesApi.testSmtp(inbox.inbox_id) : await inboxesApi.testImap(inbox.inbox_id);
            setResults(p => ({ ...p, [kind]: r }));
        } catch (err) {
            setResults(p => ({ ...p, [kind]: { status: 'error', error: errorText(err, 'Test failed') } }));
        } finally {
            setTesting(null);
        }
    };

    const Section = ({ kind, title, sub, host, port, user, hasPassword, extra }) => {
        const r = results[kind];
        const ok = r?.status === 'connected';
        const configured = Boolean(host) && (hasPassword || oauth);
        return (
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {configured ? 'Configured' : 'Incomplete'}
                    </span>
                </div>
                <dl className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-1.5 text-xs">
                    <dt className="text-gray-400">Server</dt>
                    <dd className="font-medium text-gray-800 break-all">{host ? `${host}:${port}` : <span className="text-amber-700">Not set</span>}</dd>
                    <dt className="text-gray-400">Username</dt>
                    <dd className="font-medium text-gray-800 break-all">{user || inbox.email_address}</dd>
                    <dt className="text-gray-400">Sign-in</dt>
                    <dd className="font-medium text-gray-800">{oauth ? 'Microsoft 365 (OAuth)' : hasPassword ? 'Password saved' : <span className="text-amber-700">No password</span>}</dd>
                    {extra}
                </dl>
                <button type="button" onClick={() => runTest(kind)} disabled={testing !== null || !host}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#0046FF] hover:text-[#0046FF] disabled:opacity-50">
                    {testing === kind ? <Loader2 size={13} className="animate-spin"/> : <Zap size={13}/>}
                    Test {kind === 'smtp' ? 'sending' : 'receiving'} sign-in
                </button>
                {r && (
                    <p role="status" className={`rounded-lg px-3 py-2 text-xs font-medium ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {ok
                            ? (kind === 'smtp' ? 'Signed in to the SMTP server. Sending credentials work.' : `Signed in to the mailbox. ${r.inbox_message_count_last_7d ?? 0} emails in the inbox from the last 7 days.`)
                            : (r.error || 'Could not connect.')}
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className="p-5 space-y-4">
            <button type="button" onClick={() => onEdit(inbox)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm"
                style={{ background: 'linear-gradient(135deg,#0046FF,#73C8D2)' }}>
                <Pencil size={15}/> Edit sending &amp; receiving settings
            </button>
            <Section kind="smtp" title="Sending (SMTP)" sub="Used for warmup emails from this mailbox. Campaign emails go through Amazon SES."
                host={inbox.smtp_host} port={inbox.smtp_port || 587} user={inbox.smtp_username} hasPassword={inbox.has_smtp_password}
                extra={<><dt className="text-gray-400">Security</dt><dd className="font-medium text-gray-800">{inbox.smtp_use_ssl ? 'SSL' : 'STARTTLS'}</dd></>}/>
            <Section kind="imap" title="Receiving (IMAP)" sub="Used to find replies and for warmup engagement."
                host={inbox.imap_host} port={inbox.imap_port || 993} user={inbox.imap_username} hasPassword={inbox.has_imap_password}
                extra={<>
                    <dt className="text-gray-400">Last sync</dt>
                    <dd className="font-medium text-gray-800">{inbox.last_sync_at ? new Date(inbox.last_sync_at).toLocaleString() : 'Never'}</dd>
                    {inbox.imap_last_error && <><dt className="text-gray-400">Last error</dt><dd className="font-medium text-red-600 break-words">{inbox.imap_last_error}</dd></>}
                </>}/>
            <p className="text-[11px] text-gray-400">Tests sign in with the saved settings and send nothing. Save your changes first, then test.</p>
        </div>
    );
}
