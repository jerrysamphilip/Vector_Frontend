import { useState } from 'react';
import { Settings, ChevronRight, Info, Wifi } from 'lucide-react';
import { IMAP_PROVIDERS } from './inboxShared';

// ── IMAP setup guide shown when no IMAP is configured ─────────────
export default function ImapSetupGuide({ onGoToAccounts }) {
    const [open, setOpen] = useState(null);

    return (
        <div className="flex flex-col items-center justify-start p-6 h-full overflow-y-auto"
            style={{ background: 'linear-gradient(180deg, #fafaf9 0%, #f6f4ee 100%)' }}>

            {/* Hero */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mt-6"
                style={{ background: 'rgba(245,158,11,0.1)' }}>
                <Wifi className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">IMAP Not Configured</h2>
            <p className="text-sm text-gray-500 text-center max-w-md mb-6">
                To receive and display replied emails in this inbox, your sending account needs
                IMAP credentials. Without them the system cannot pull replies from your mailbox.
            </p>

            {/* Steps */}
            <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-100 p-5 mb-5"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">How to fix it</p>
                {[
                    { n: 1, text: 'Click "Go to Sending Accounts" below (or switch to the Sending Accounts tab).' },
                    { n: 2, text: 'Click the Edit (pencil) icon on the inbox used for this campaign.' },
                    { n: 3, text: 'Fill in IMAP Host, IMAP Username, and IMAP Password, then Save.' },
                    { n: 4, text: 'Come back to Inbox and click Sync — replied emails will appear.' },
                ].map(({ n, text }) => (
                    <div key={n} className="flex items-start gap-3 mb-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white mt-0.5"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>{n}</div>
                        <p className="text-sm text-gray-600">{text}</p>
                    </div>
                ))}
            </div>

            {/* CTA */}
            {onGoToAccounts && (
                <button
                    onClick={() => onGoToAccounts('Sending Accounts')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white mb-6 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                    style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                    <Settings className="w-4 h-4" />
                    Go to Sending Accounts
                    <ChevronRight className="w-4 h-4" />
                </button>
            )}

            {/* Provider quick-ref */}
            <div className="w-full max-w-lg">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    IMAP settings by provider
                </p>
                <div className="space-y-2">
                    {IMAP_PROVIDERS.map((p) => (
                        <button key={p.host}
                            onClick={() => setOpen(open === p.host ? null : p.host)}
                            className="w-full text-left bg-white rounded-xl border border-gray-100 px-4 py-3 transition-all hover:border-blue-200"
                            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-700">{p.name}</span>
                                <span className="text-[11px] font-mono text-gray-400">{p.host}</span>
                            </div>
                            {open === p.host && (
                                <div className="mt-3 space-y-1.5 text-xs text-gray-600 border-t border-gray-100 pt-3">
                                    <div className="flex gap-2"><span className="font-semibold w-20 shrink-0">IMAP Host</span><code className="bg-gray-50 px-2 py-0.5 rounded">{p.host}</code></div>
                                    <div className="flex gap-2"><span className="font-semibold w-20 shrink-0">Port</span><code className="bg-gray-50 px-2 py-0.5 rounded">{p.port} (SSL)</code></div>
                                    <div className="flex gap-2"><span className="font-semibold w-20 shrink-0">Username</span><span>Your full email address</span></div>
                                    <div className="flex gap-2 mt-1">
                                        <Info className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
                                        <span className="text-amber-700">{p.note}</span>
                                    </div>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
