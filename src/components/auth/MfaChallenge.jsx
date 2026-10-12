import React, { useEffect, useRef, useState } from "react";
import { ShieldCheck, KeyRound, ArrowLeft } from "lucide-react";
import { authApi } from "../../api/auth";

const inputStyle = {
    background: "rgba(255, 255, 255, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
};

/**
 * Second sign-in step (two-factor): a 6-digit code from the authenticator app, or a recovery code.
 * Styled for the dark sign-in screens (Login, MagicLogin).
 */
export default function MfaChallenge({ mfaToken, onSuccess, onCancel }) {
    const [useRecovery, setUseRecovery] = useState(false);
    const [value, setValue] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => { inputRef.current?.focus(); }, [useRecovery]);

    const submit = async (e) => {
        e?.preventDefault();
        setError("");
        const entered = value.trim();
        if (!useRecovery && !/^\d{6}$/.test(entered.replace(/\s/g, ""))) {
            setError("Enter the 6-digit code from your authenticator app");
            return;
        }
        if (useRecovery && entered.length < 8) {
            setError("Enter one of your recovery codes");
            return;
        }
        try {
            setSubmitting(true);
            const data = await authApi.verifyMfa(mfaToken, useRecovery
                ? { recoveryCode: entered }
                : { code: entered.replace(/\s/g, "") });
            onSuccess(data);
        } catch (err) {
            const status = err?.response?.status;
            const detail = err?.response?.data?.detail;
            if (status === 401 && typeof detail === "string" && detail.includes("sign in again")) {
                setError(detail);
            } else if (status === 429) {
                setError(typeof detail === "string" ? detail : "Too many attempts. Please sign in again.");
            } else {
                setError(useRecovery ? "That recovery code isn't valid or was already used." : "That code isn't valid. Wait for a new code and try again.");
            }
            setValue("");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={submit} aria-labelledby="mfa-title">
            <div className="flex flex-col items-center text-center mb-5">
                <span className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center mb-3">
                    {useRecovery ? <KeyRound size={20} /> : <ShieldCheck size={20} />}
                </span>
                <h2 id="mfa-title" className="text-[17px] font-semibold">Two-factor authentication</h2>
                <p className="text-[13px] text-white/75 mt-1 max-w-[340px]">
                    {useRecovery
                        ? "Enter one of the recovery codes you saved when you turned on two-factor. Each code works once."
                        : "Open your authenticator app and enter the 6-digit code for Outreach360."}
                </p>
            </div>

            {error && <p role="alert" className="text-red-400 text-sm text-center mb-4">{error}</p>}

            <label htmlFor="mfa-code" className="block text-[13px] text-white mb-1.5">
                {useRecovery ? "Recovery code" : "Authentication code"}
            </label>
            <input
                id="mfa-code"
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(useRecovery ? e.target.value : e.target.value.replace(/[^\d\s]/g, "").slice(0, 7))}
                inputMode={useRecovery ? "text" : "numeric"}
                autoComplete="one-time-code"
                autoCapitalize="off"
                spellCheck={false}
                placeholder={useRecovery ? "xxxxx-xxxxx" : "123456"}
                className={`w-full h-[46px] px-3.5 rounded-lg outline-none text-white placeholder:text-white/30 ${useRecovery ? "text-[15px] tracking-wider" : "text-[22px] tracking-[0.5em] text-center font-semibold"}`}
                style={inputStyle}
            />

            <button
                type="submit"
                disabled={submitting}
                className="mt-5 w-full h-[42px] bg-white text-black rounded-[36px] text-[15px] font-semibold flex items-center justify-center transition-all hover:bg-slate-100 disabled:opacity-70"
            >
                {submitting ? "Verifying..." : "Verify"}
            </button>

            <div className="mt-4 flex items-center justify-between text-xs">
                <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 text-white/70 hover:text-white">
                    <ArrowLeft size={13} /> Back to sign in
                </button>
                <button
                    type="button"
                    onClick={() => { setUseRecovery((v) => !v); setValue(""); setError(""); }}
                    className="text-white/80 hover:text-white underline"
                >
                    {useRecovery ? "Use authenticator code" : "Use a recovery code"}
                </button>
            </div>
        </form>
    );
}
