import React, { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import { isAuthenticated, consumeFirstLogin } from "../lib/authStorage";

import bg from "../assets/bg.png";
import logo from "../assets/logo.png";
import neutrinoAILogo from "../assets/NeutrinoAI.png";
import neutrinoLogo from "../assets/Neutrino.png";

const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const fromPath = location.state?.from?.pathname || "/app/dashboard";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

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

            const userFirstName = response?.user?.first_name;
            if (userFirstName) {
                localStorage.setItem("user_name", userFirstName);
            }

            const isFirst = consumeFirstLogin();
            navigate(isFirst ? '/set-password' : fromPath, { replace: true });
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
                className="w-[500px] rounded-[16px] px-6 py-6 backdrop-blur-[50px] relative overflow-hidden"
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
                        <div className="text-[16px] font-medium text-white pb-2 border-b-2 border-white/60">
                            Login
                        </div>
                    </div>
                </div>

                {/* ERROR */}
                {error && (
                    <p className="text-red-400 text-sm text-center mb-4">
                        {error}
                    </p>
                )}

                <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                    {/* EMAIL */}
                    <div className="mb-4">
                        <label className="block text-[14px] font-normal text-white mb-1.5">Email Address</label>
                        <div className="relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-white">
                                <Mail size={18} />
                            </div>
                            <input
                                type="email"
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
                        <label className="block text-[13px] font-normal text-white mb-1.5">Password</label>
                        <div className="relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-white">
                                <Lock size={18} />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
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

            {/* ================= BACK BUTTON ================= */}
            <button
                onClick={() => navigate(-1)}
                className="absolute bottom-8 left-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
            >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="text-lg font-medium">Back</span>
            </button>
        </div>
    );
};

export default LoginPage;
