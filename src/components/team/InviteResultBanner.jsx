import { CheckCircle, Copy, X } from 'lucide-react';
import { formatDate } from './teamShared';

// Result of an invitation / resend: email sent, or the manual credentials to copy when email is off.
export default function InviteResultBanner({ team }) {
    const {
        copyCredentials, inviteResult, setInviteResult
    } = team;
    return (
        <div className={`rounded-2xl p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-3 card-anim ${
            inviteResult?.email_delivery?.sent
                ? 'bg-emerald-50 border border-emerald-200'
                : 'bg-amber-50 border border-amber-200'
        }`}>
            <div className="flex items-start gap-3">
                <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${inviteResult?.email_delivery?.sent ? 'text-emerald-600' : 'text-amber-600'}`} />
                <div>
                    {inviteResult?.email_delivery?.sent ? (
                        <>
                            <p className="font-semibold text-emerald-800 text-sm">Invitation sent to {inviteResult.email}</p>
                            <p className="text-xs text-emerald-700 mt-0.5">Expires: {formatDate(inviteResult.expires_at)}</p>
                        </>
                    ) : (
                        <>
                            <p className="font-semibold text-amber-800 text-sm">Account created — email delivery failed</p>
                            <p className="text-xs text-amber-700 mt-0.5">Share credentials manually with {inviteResult.email}</p>
                            {inviteResult?.manual_credentials?.password && (
                                <p className="text-xs text-amber-800 mt-1 font-mono bg-amber-100 px-2 py-1 rounded-md inline-block">
                                    Password: {inviteResult.manual_credentials.password}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                {inviteResult?.manual_credentials && (
                    <button onClick={copyCredentials}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg">
                        <Copy className="w-3.5 h-3.5" /> Copy Credentials
                    </button>
                )}
                <button onClick={() => setInviteResult(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/60">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
