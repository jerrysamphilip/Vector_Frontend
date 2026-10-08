import React, { useState } from "react";
import { Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { authApi } from "../api/auth";

import bg from "../assets/bg.png";
import logo from "../assets/logo.png";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!email) {
            setError("Email is required");
            return;
        }

        try {
            setSubmitting(true);
            const res = await authApi.forgotPassword(email.trim());
            setSuccess(res?.message || "If an account exists, a reset link has been sent.");
        } catch (err) {
            setError(err?.response?.data?.detail || "Failed to send reset email");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="min-h-screen w-full flex items-center justify-center bg-cover bg-center relative font-sans text-white"
            style={{ backgroundImage: `url(${bg})` }}
        >
            <div
                className="w-[500px] rounded-[16px] px-6 py-6 backdrop-blur-[50px] relative overflow-hidden"
                style={{
                    background: "radial-gradient(98.05% 261.61% at 1.95% 3.59%, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0) 100%)",
                    boxShadow: "rgba(0, 0, 0, 0.25) 0px 4px 4px 0px",
                    border: "1px solid rgba(98, 93, 93, 0.4)",
                }}
            >
                <div className="flex flex-col items-center mb-5">
                    <img src={logo} alt="Outreach360" className="max-w-[230px] h-auto object-contain mb-1" />
                    <div className="text-[16px] font-medium text-white pb-2 border-b-2 border-white/60">
                        Forgot Password
                    </div>
                </div>

                {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
                {success && <p className="text-emerald-300 text-sm text-center mb-4">{success}</p>}

                <form onSubmit={handleSubmit}>
                    <div className="mb-5">
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
                                    background: "rgba(255, 255, 255, 0.08)",
                                    border: "1px solid rgba(255, 255, 255, 0.2)",
                                }}
                                placeholder="your@email.com"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full h-[42px] bg-white text-black rounded-[36px] text-[15px] font-semibold flex items-center justify-center gap-2.5 transition-all hover:bg-slate-100 border border-white/20"
                    >
                        {submitting ? "Sending..." : "Send Reset Link"}
                    </button>
                </form>

                <div className="mt-5 text-center text-sm">
                    <Link to="/login" className="text-white/80 hover:text-white underline">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}

