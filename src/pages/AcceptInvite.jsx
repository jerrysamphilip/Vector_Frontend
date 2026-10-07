import React, { useMemo, useState } from "react";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import usersApi from "../api/users";

import bg from "../assets/bg.png";
import logo from "../assets/logo.png";

export default function AcceptInvite() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!token) {
            setError("Invalid or missing invitation token");
            return;
        }
        if (!firstName.trim() || !lastName.trim()) {
            setError("First name and last name are required");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        try {
            setSubmitting(true);
            await usersApi.acceptInvite({
                token,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                password,
            });
            setSuccess("Account created successfully. Redirecting to login...");
            setTimeout(() => navigate("/login", { replace: true }), 1500);
        } catch (err) {
            setError(err?.response?.data?.detail || "Failed to accept invitation");
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
                className="w-[520px] rounded-[16px] px-6 py-6 backdrop-blur-[50px] relative overflow-hidden"
                style={{
                    background: "radial-gradient(98.05% 261.61% at 1.95% 3.59%, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0) 100%)",
                    boxShadow: "rgba(0, 0, 0, 0.25) 0px 4px 4px 0px",
                    border: "1px solid rgba(98, 93, 93, 0.4)",
                }}
            >
                <div className="flex flex-col items-center mb-5">
                    <img src={logo} alt="Outreach360" className="max-w-[230px] h-auto object-contain mb-1" />
                    <div className="text-[16px] font-medium text-white pb-2 border-b-2 border-white/60">
                        Accept Invitation
                    </div>
                </div>

                {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
                {success && <p className="text-emerald-300 text-sm text-center mb-4">{success}</p>}

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <div className="relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-white">
                                <User size={18} />
                            </div>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full h-[42px] pl-11 pr-3.5 rounded-lg text-[14px] outline-none transition-all text-white placeholder:text-white/40"
                                style={{
                                    background: "rgba(255, 255, 255, 0.08)",
                                    border: "1px solid rgba(255, 255, 255, 0.2)",
                                }}
                                placeholder="First name"
                            />
                        </div>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="w-full h-[42px] px-3.5 rounded-lg text-[14px] outline-none transition-all text-white placeholder:text-white/40"
                            style={{
                                background: "rgba(255, 255, 255, 0.08)",
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                            }}
                            placeholder="Last name"
                        />
                    </div>

                    <div className="mb-4">
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
                                    background: "rgba(255, 255, 255, 0.08)",
                                    border: "1px solid rgba(255, 255, 255, 0.2)",
                                }}
                                placeholder="Minimum 8 characters"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="mb-5">
                        <label className="block text-[13px] font-normal text-white mb-1.5">Confirm Password</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full h-[42px] px-3.5 rounded-lg text-[14px] outline-none transition-all text-white placeholder:text-white/40"
                            style={{
                                background: "rgba(255, 255, 255, 0.08)",
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                            }}
                            placeholder="Re-enter password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full h-[42px] bg-white text-black rounded-[36px] text-[15px] font-semibold flex items-center justify-center gap-2.5 transition-all hover:bg-slate-100 border border-white/20"
                    >
                        {submitting ? "Creating Account..." : "Accept Invite"}
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

