import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import {
    ShieldCheck, ShieldAlert, ShieldOff, Smartphone, Copy, Download, CheckCircle2, KeyRound, RefreshCw, Users,
} from 'lucide-react';
import { authApi } from '../api/auth';
import { getStoredUser, updateStoredUser } from '../lib/authStorage';
import { PageHeader, card } from '../components/sales/shared';
import { PrimaryButton, SecondaryButton, ErrorNote } from '../components/contacts/shared';

const errText = (e, fallback = 'Something went wrong') => {
    const d = e?.response?.data?.detail;
    return typeof d === 'string' ? d : fallback;
};
const inputCls = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#0046FF] focus:outline-none';
const labelCls = 'text-[11px] font-semibold uppercase tracking-wide text-slate-500';

function CodeInput({ value, onChange, autoFocus, id = 'totp-code' }) {
    return (
        <input id={id} value={value} autoFocus={autoFocus} inputMode="numeric" autoComplete="one-time-code"
            onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456"
            className={`${inputCls} max-w-[180px] text-center text-lg font-semibold tracking-[0.4em]`} />
    );
}

function copyText(text, setCopied) {
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
}

/** Recovery codes, shown once after enabling or regenerating. */
function RecoveryCodes({ codes, onDone }) {
    const [copied, setCopied] = useState(false);
    const text = codes.join('\n');
    const download = () => {
        const blob = new Blob([`Outreach360 two-factor recovery codes\nEach code works once.\n\n${text}\n`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'outreach360-recovery-codes.txt';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
    };
    return (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
            <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><KeyRound size={16} /></span>
                <div>
                    <p className="text-sm font-semibold text-slate-900">Save your recovery codes</p>
                    <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                        If you lose your phone, each of these codes signs you in once instead of an authenticator code.
                        Store them somewhere safe, such as a password manager. They won't be shown again.
                    </p>
                </div>
            </div>
            <ol className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-sm" aria-label="Recovery codes">
                {codes.map(c => <li key={c} className="rounded-lg bg-white border border-amber-100 px-2.5 py-1.5 text-center text-slate-800">{c}</li>)}
            </ol>
            <div className="mt-4 flex flex-wrap gap-2">
                <SecondaryButton onClick={() => copyText(text, setCopied)}>
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy'}
                </SecondaryButton>
                <SecondaryButton onClick={download}><Download className="w-4 h-4" /> Download</SecondaryButton>
                <PrimaryButton onClick={onDone}>I've saved them</PrimaryButton>
            </div>
        </div>
    );
}

/** Scan the QR code, confirm a code, then show the recovery codes. */
function EnableFlow({ onEnabled, onCancel }) {
    const [setup, setSetup] = useState(null);
    const [code, setCode] = useState('');
    const [copied, setCopied] = useState(false);
    const start = useMutation({ mutationFn: authApi.mfaSetup, onSuccess: setSetup });
    const enable = useMutation({ mutationFn: authApi.mfaEnable, onSuccess: (r) => onEnabled(r.recovery_codes), onError: () => setCode('') });

    if (!setup) {
        return (
            <div className="mt-4 space-y-3">
                <p className="text-sm text-slate-600">You'll need an authenticator app on your phone, such as Google Authenticator, Microsoft Authenticator, 1Password or Authy.</p>
                <ErrorNote message={start.error && errText(start.error)} />
                <div className="flex gap-2">
                    <PrimaryButton onClick={() => start.mutate()} loading={start.isPending}><Smartphone className="w-4 h-4" /> Continue</PrimaryButton>
                    {onCancel && <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>}
                </div>
            </div>
        );
    }
    const grouped = setup.secret.replace(/(.{4})/g, '$1 ').trim();
    return (
        <form className="mt-4 grid gap-6 sm:grid-cols-[auto,1fr]" onSubmit={e => { e.preventDefault(); if (code.length === 6) enable.mutate(code); }}>
            <div className="rounded-xl border border-slate-200 bg-white p-3 self-start justify-self-start">
                <QRCodeSVG value={setup.otpauth_uri} size={168} level="M" title="QR code for your authenticator app" />
            </div>
            <div className="space-y-4">
                <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1">
                    <li>In your authenticator app, add an account and scan this QR code.</li>
                    <li>Enter the 6-digit code the app shows for Outreach360.</li>
                </ol>
                <div>
                    <p className={labelCls}>Can't scan? Enter this key</p>
                    <div className="mt-1 flex items-center gap-2">
                        <code className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-sm font-mono text-slate-800 break-all">{grouped}</code>
                        <button type="button" onClick={() => copyText(setup.secret, setCopied)} aria-label="Copy key"
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Account: {setup.account} · Time-based (TOTP)</p>
                </div>
                <label className="block" htmlFor="totp-code">
                    <span className={labelCls}>Code from the app</span>
                    <CodeInput value={code} onChange={setCode} autoFocus />
                </label>
                <ErrorNote message={enable.error && errText(enable.error, 'That code is not valid. Check the time on your phone and try the next code.')} />
                <div className="flex gap-2">
                    <PrimaryButton type="submit" loading={enable.isPending} disabled={code.length !== 6}>Turn on two-factor</PrimaryButton>
                    {onCancel && <SecondaryButton type="button" onClick={onCancel}>Cancel</SecondaryButton>}
                </div>
            </div>
        </form>
    );
}

function DisableFlow({ needsPassword, onDone, onCancel }) {
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [recovery, setRecovery] = useState('');
    const [useRecovery, setUseRecovery] = useState(false);
    const disable = useMutation({ mutationFn: authApi.mfaDisable, onSuccess: onDone });
    const ready = (!needsPassword || password) && (useRecovery ? recovery.trim() : code.length === 6);
    return (
        <form className="mt-4 space-y-3 max-w-md" onSubmit={e => {
            e.preventDefault();
            if (ready) disable.mutate({ password, code: useRecovery ? null : code, recoveryCode: useRecovery ? recovery.trim() : null });
        }}>
            <p className="text-sm text-slate-600">Your account will be protected by your password only.</p>
            {needsPassword && (
                <label className="block">
                    <span className={labelCls}>Password</span>
                    <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} />
                </label>
            )}
            {useRecovery ? (
                <label className="block">
                    <span className={labelCls}>Recovery code</span>
                    <input value={recovery} onChange={e => setRecovery(e.target.value)} placeholder="xxxxx-xxxxx" className={`${inputCls} font-mono`} />
                </label>
            ) : (
                <label className="block" htmlFor="disable-code">
                    <span className={labelCls}>Code from your authenticator app</span>
                    <CodeInput id="disable-code" value={code} onChange={setCode} />
                </label>
            )}
            <button type="button" onClick={() => setUseRecovery(v => !v)} className="text-xs font-semibold text-[#0046FF] hover:underline">
                {useRecovery ? 'Use an authenticator code instead' : 'Use a recovery code instead'}
            </button>
            <ErrorNote message={disable.error && errText(disable.error)} />
            <div className="flex gap-2">
                <button type="submit" disabled={!ready || disable.isPending}
                    className="h-9 px-4 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 rounded-lg">
                    {disable.isPending ? 'Turning off…' : 'Turn off two-factor'}
                </button>
                <SecondaryButton type="button" onClick={onCancel}>Cancel</SecondaryButton>
            </div>
        </form>
    );
}

function RegenerateFlow({ onCodes, onCancel }) {
    const [code, setCode] = useState('');
    const regen = useMutation({ mutationFn: authApi.mfaRegenerateRecoveryCodes, onSuccess: (r) => onCodes(r.recovery_codes), onError: () => setCode('') });
    return (
        <form className="mt-4 space-y-3 max-w-md" onSubmit={e => { e.preventDefault(); if (code.length === 6) regen.mutate(code); }}>
            <p className="text-sm text-slate-600">New codes replace all of your current recovery codes.</p>
            <label className="block" htmlFor="regen-code">
                <span className={labelCls}>Code from your authenticator app</span>
                <CodeInput id="regen-code" value={code} onChange={setCode} autoFocus />
            </label>
            <ErrorNote message={regen.error && errText(regen.error)} />
            <div className="flex gap-2">
                <PrimaryButton type="submit" loading={regen.isPending} disabled={code.length !== 6}>Get new codes</PrimaryButton>
                <SecondaryButton type="button" onClick={onCancel}>Cancel</SecondaryButton>
            </div>
        </form>
    );
}

function WorkspacePolicy({ session, onChanged }) {
    const required = Boolean(session?.mfa_required);
    const policy = useMutation({ mutationFn: authApi.mfaSetTenantPolicy, onSuccess: onChanged });
    const canEnable = session?.mfa_enabled;
    return (
        <div className={`${card} p-5`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eff3ff] text-[#0046FF]"><Users size={16} /></span>
                    <div>
                        <p id="require-mfa-label" className="text-sm font-semibold text-slate-900">Require two-factor for everyone in this workspace</p>
                        <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                            People who haven't set it up are taken to this screen after they sign in and can't use anything else until they do.
                            {!canEnable && !required && ' Turn on two-factor for your own account first.'}
                        </p>
                    </div>
                </div>
                <button type="button" role="switch" aria-checked={required} aria-labelledby="require-mfa-label"
                    disabled={policy.isPending || (!required && !canEnable)}
                    onClick={() => policy.mutate(!required)}
                    className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${required ? 'bg-[#0046FF]' : 'bg-slate-300'}`}>
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${required ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
            </div>
            {policy.error && <div className="mt-3"><ErrorNote message={errText(policy.error)} /></div>}
        </div>
    );
}

/** Account security: two-factor authentication (TOTP) and, for Super Admins, the workspace policy. */
export default function AccountSecurity() {
    const qc = useQueryClient();
    const stored = getStoredUser();
    const { data: session, isLoading, error } = useQuery({ queryKey: ['auth-session'], queryFn: authApi.session, staleTime: 0 });
    const [mode, setMode] = useState(null); // 'enable' | 'disable' | 'regenerate'
    const [codes, setCodes] = useState(null);

    const reload = async (patch) => {
        if (patch) updateStoredUser(patch);
        await qc.invalidateQueries({ queryKey: ['auth-session'] });
    };

    const user = session?.user || stored;
    const enabled = Boolean(session?.mfa_enabled);
    const setupRequired = Boolean(session ? session.mfa_setup_required : stored?.mfa_setup_required);
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    return (
        <div className="space-y-6 max-w-3xl">
            <PageHeader title="Account security" subtitle="Protect your sign-in with a second step from an authenticator app." />

            {setupRequired && !codes && (
                <div role="alert" className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                    <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Your workspace requires two-factor authentication. Set it up below to continue using Outreach360.</span>
                </div>
            )}

            {codes && (
                <RecoveryCodes codes={codes} onDone={() => setCodes(null)} />
            )}

            <ErrorNote message={error && errText(error, 'Could not load your security settings.')} />

            {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : session && (
                <div className={`${card} p-5`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-3">
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                {enabled ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-slate-900">
                                    Two-factor authentication
                                    <span className={`ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{enabled ? 'On' : 'Off'}</span>
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                                    {enabled
                                        ? `Signing in asks for a code from your authenticator app. ${session.recovery_codes_remaining} of 10 recovery codes left.`
                                        : 'After your password, signing in also asks for a 6-digit code from an app on your phone.'}
                                </p>
                            </div>
                        </div>
                        {!mode && (
                            <div className="flex gap-2 flex-wrap">
                                {!enabled && <PrimaryButton onClick={() => setMode('enable')}><ShieldCheck className="w-4 h-4" /> Set up two-factor</PrimaryButton>}
                                {enabled && <SecondaryButton onClick={() => setMode('regenerate')}><RefreshCw className="w-4 h-4" /> New recovery codes</SecondaryButton>}
                                {enabled && !session.mfa_required && <SecondaryButton onClick={() => setMode('disable')}><ShieldOff className="w-4 h-4" /> Turn off</SecondaryButton>}
                            </div>
                        )}
                    </div>
                    {enabled && session.mfa_required && !mode && (
                        <p className="mt-3 text-xs text-slate-500">Your workspace requires two-factor, so it can't be turned off.</p>
                    )}
                    {mode === 'enable' && (
                        <EnableFlow
                            onCancel={setupRequired ? null : () => setMode(null)}
                            onEnabled={async (recovery) => {
                                setCodes(recovery); setMode(null);
                                await reload({ mfa_enabled: true, mfa_setup_required: false });
                            }} />
                    )}
                    {mode === 'disable' && (
                        <DisableFlow needsPassword={user?.auth_provider !== 'google'} onCancel={() => setMode(null)}
                            onDone={async () => { setMode(null); setCodes(null); await reload({ mfa_enabled: false }); }} />
                    )}
                    {mode === 'regenerate' && (
                        <RegenerateFlow onCancel={() => setMode(null)}
                            onCodes={async (recovery) => { setCodes(recovery); setMode(null); await reload(); }} />
                    )}
                </div>
            )}

            {session && isSuperAdmin && <WorkspacePolicy session={session} onChanged={(r) => reload({ mfa_required: r.require_mfa })} />}
        </div>
    );
}
