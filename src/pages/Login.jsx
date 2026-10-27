import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import { isAuthenticated, consumeFirstLogin, getStoredUser } from "../lib/authStorage";
import MfaChallenge from "../components/auth/MfaChallenge";
import { safeReturnPath } from "../lib/returnTo";
import { SESSION_IDLE_MINUTES } from "../api/activity";

import bg from "../assets/bg.png";
import logo from "../assets/logo.png";
import neutrinoAILogo from "../assets/NeutrinoAI.png";
import neutrinoLogo from "../assets/Neutrino.png";

const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    // Back to the page that was requested / in use: route state from ProtectedRoute (path + query + hash), or
    // ?next= from the http.js session-expiry redirect. Internal /app or /admin paths only (no open redirect).
    const params = new URLSearchParams(location.search);
    const from = location.state?.from;
    const fromPath = safeReturnPath(from ? `${from.pathname || ""}${from.search || ""}${from.hash || ""}` : null)
        || safeReturnPath(params.get("next"))
        || "/app/dashboard";
    const reason = params.get("reason");
    const notice = reason === "suspended"
        ? "Your workspace is suspended. Contact your administrator to restore access."
        : reason === "idle" ? `Signed out after ${SESSION_IDLE_MINUTES} minutes of inactivity. Sign in again to continue where you left off.`
        : reason === "expired" ? "Session expired, please sign in again to continue where you left off." : "";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [mfaToken, setMfaToken] = useState("");

    /* Load remembered email */
    useEffect(() => {
        if (isAuthenticated()) {
            navigate("/app/dashboard", { replace: true });
            return;
        }

        const saved = localStorage.getItem("rememberedEmail");
        if (saved) {
            setEmail(saved);
            setRemember(true);
        }
    }, [navigate]);

    const finishSignIn = () => {
        const isFirst = consumeFirstLogin();
        const user = getStoredUser();
        if (user?.mfa_setup_required) {
            navigate("/app/account/security", { replace: true });
            return;
        }
        navigate(isFirst ? '/set-password' : fromPath, { replace: true });
    };

    const handleLogin = async () => {
        setError("");

        if (!email || !password) {
            setError("Email and password are required");
            return;
        }

        try {
            setSubmitting(true);
            const response = await authApi.login(email, password);

            if (remember) {
                localStorage.setItem("rememberedEmail", email);
            } else {
                localStorage.removeItem("rememberedEmail");
            }

            if (response?.mfa_required) {
                // Password OK; the session is issued after the second step
                setPassword("");
                setMfaToken(response.mfa_token);
                return;
            }
            finishSignIn();
        } catch (err) {
            setError(err?.response?.data?.detail || "Invalid email or password");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="min-h-screen w-full flex items-center justify-center bg-cover bg-center relative font-sans text-white"
            style={{ backgroundImage: `url(${bg})` }}
        >
            {/* ================= TOP LEFT NEUTRINO AI LOGO ================= */}
            <div className="absolute top-6 left-6 z-20">
                <img
                    src={neutrinoAILogo}
                    alt="Neutrino AI Studio"
                    className="h-14 md:h-16 object-contain cursor-pointer"
                    onClick={() => window.location.href = "https://neutrinoaistudio.com"}
                />
            </div>

            {/* ================= LOGIN CARD ================= */}
            <div
                className="w-[calc(100%-2rem)] max-w-[500px] rounded-[16px] px-6 py-6 backdrop-blur-[50px] relative overflow-hidden"
                style={{
                    background: 'radial-gradient(98.05% 261.61% at 1.95% 3.59%, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0) 100%)',
                    boxShadow: 'rgba(0, 0, 0, 0.25) 0px 4px 4px 0px',
                    border: '1px solid rgba(98, 93, 93, 0.4)'
                }}
            >
                {/* CENTER LOGO */}
                <div className="flex flex-col items-center mb-5">
                    <img
                        src={logo}
                        alt="Outreach360"
                        className="max-w-[230px] h-auto object-contain mb-1"
                    />
                    <div className="flex justify-center mb-1">
                        <h1 className="text-[16px] font-medium text-white pb-2 border-b-2 border-white/60">
                            Login
                        </h1>
                    </div>
                </div>

                {mfaToken ? (
                    <MfaChallenge
                        mfaToken={mfaToken}
                        onSuccess={finishSignIn}
                        onCancel={() => { setMfaToken(""); setError(""); }}
                    />
                ) : (<>
                {/* WHY THE USER IS HERE (session expired / workspace suspended) */}
                {notice && !error && (
                    <p role="status" className={`text-sm text-center mb-4 ${reason === "suspended" ? "text-amber-200" : "text-white/80"}`}>
                        {notice}
                    </p>
                )}

                {/* ERROR */}
                {error && (
                    <p role="alert" className="text-red-400 text-sm text-center mb-4">
                        {error}
                    </p>
                )}

                <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                    {/* EMAIL */}
                    <div className="mb-4">
                        <label htmlFor="login-email" className="block text-[14px] font-normal text-white mb-1.5">Email Address</label>
                        <div className="relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-white">
                                <Mail size={18} />
                            </div>
                            <input
                                id="login-email"
                                type="email"
                                autoComplete="username"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-[42px] pl-11 pr-3.5 rounded-lg text-[14px] outline-none transition-all text-white placeholder:text-white/40"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)'
                                }}
                                placeholder="your@email.com"
                            />
                        </div>
                    </div>

                    {/* PASSWORD */}
                    <div className="mb-5">
                        <label htmlFor="login-password" className="block text-[13px] font-normal text-white mb-1.5">Password</label>
                        <div className="relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-white">
                                <Lock size={18} />
                            </div>
                            <input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-[42px] pl-11 pr-11 rounded-lg text-[14px] outline-none transition-all text-white placeholder:text-white/40"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)'
                                }}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                aria-pressed={showPassword}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <div className="mt-2 text-right">
                            <Link to="/forgot-password" className="text-xs text-white/80 hover:text-white underline">
                                Forgot password?
                            </Link>
                        </div>
                    </div>

                    {/* LOGIN BUTTON */}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full h-[42px] bg-white text-black rounded-[36px] text-[15px] font-semibold flex items-center justify-center gap-2.5 transition-all hover:bg-slate-100 border border-white/20"
                    >
                        {submitting ? "Signing in..." : "Login"}
                    </button>
                </form>
                </>)}

                {/* FOOTER */}
                <div className="mt-5 text-center">
                    <span className="text-[12px] text-white flex items-center justify-center gap-2">
                        Powered By
                        <span className="inline-flex items-center gap-1 text-white/70 font-medium">
                            <img src={neutrinoLogo} alt="Neutrino" className="h-4 object-contain" />
                        </span>
                    </span>
                </div>
            </div>

        </div>
    );
};

export default LoginPage;
