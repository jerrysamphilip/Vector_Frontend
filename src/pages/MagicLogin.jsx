import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../api/auth";
import { useAuth } from "../auth/AuthProvider";
import MfaChallenge from "../components/auth/MfaChallenge";

import bg from "../assets/bg.png";
import logo from "../assets/logo.png";

export default function MagicLogin() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
    const auth = useAuth();
    const [error, setError] = useState("");
    const mfaPending = auth.status === "mfa-required";
    // The effect needs the latest actions without re-running (the link token is single-use)
    const authRef = useRef(auth);
    useEffect(() => { authRef.current = auth; });

    const finish = useCallback((result) => {
        if (result?.user?.mfa_setup_required) {
            navigate("/app/account/security", { replace: true });
            return;
        }
        navigate(result?.firstLogin ? "/set-password" : "/app/dashboard", { replace: true });
    }, [navigate]);

    useEffect(() => {
        let mounted = true;

        const run = async () => {
            if (!token) {
                setError("Missing magic login token");
                return;
            }

            // Always end any existing session (revoked server side): the magic link is for a specific user
            await authRef.current.logout();

            try {
                const result = await authRef.current.signInWith(() => authApi.magicLogin(token));
                if (!mounted || result.mfaRequired) return;
                finish(result);
            } catch (err) {
                if (mounted) {
                    setError(err?.response?.data?.detail || "Magic login failed");
                }
            }
        };

        run();
        return () => {
            mounted = false;
        };
    }, [token, finish]);

    return (
        <div
            className="min-h-screen w-full flex items-center justify-center bg-cover bg-center relative font-sans text-white"
            style={{ backgroundImage: `url(${bg})` }}
        >
            <div
                className="w-[500px] rounded-[16px] px-6 py-6 backdrop-blur-[50px] relative overflow-hidden text-center"
                style={{
                    background: "radial-gradient(98.05% 261.61% at 1.95% 3.59%, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0) 100%)",
                    boxShadow: "rgba(0, 0, 0, 0.25) 0px 4px 4px 0px",
                    border: "1px solid rgba(98, 93, 93, 0.4)",
                }}
            >
                <img src={logo} alt="Outreach360" className="max-w-[230px] h-auto object-contain mx-auto mb-4" />
                {mfaPending ? (
                    <div className="text-left">
                        <MfaChallenge onSuccess={finish}
                            onCancel={() => { auth.cancelMfa(); navigate("/login", { replace: true }); }} />
                    </div>
                ) : !error ? (
                    <>
                        <h2 className="text-xl font-semibold mb-2">Signing you in...</h2>
                        <p className="text-white/80 text-sm">Please wait while we verify your secure login link.</p>
                    </>
                ) : (
                    <>
                        <h2 className="text-xl font-semibold mb-2 text-red-300">Magic Login Failed</h2>
                        <p className="text-white/80 text-sm">{error}</p>
                    </>
                )}
            </div>
        </div>
    );
}

