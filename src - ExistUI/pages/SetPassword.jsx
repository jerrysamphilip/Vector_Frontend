import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, CheckCircle, KeyRound } from "lucide-react";
import { authApi } from "../api/auth";
import { getStoredUser } from "../lib/authStorage";
import bg from "../assets/bg.png";
import logo from "../assets/logo.png";

export default function SetPassword() {
    const navigate = useNavigate();
    const currentUser = getStoredUser();

    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (newPw.length < 8) { setError("Password must be at least 8 characters"); return; }
        if (newPw !== confirmPw) { setError("Passwords do not match"); return; }
        setLoading(true);
        try {
            await authApi.changePassword(currentPw, newPw);
            setSuccess(true);
            setTimeout(() => navigate("/app/dashboard", { replace: true }), 2000);
        } catch (err) {
            setError(err?.response?.data?.detail || "Failed to set password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen w-full flex items-center justify-center bg-cover bg-center relative font-sans"
            style={{ backgroundImage: `url(${bg})` }}
        >
            <div
                className="w-[460px] rounded-2xl overflow-hidden backdrop-blur-[50px] text-white"
                style={{
                    background: "radial-gradient(98.05% 261.61% at 1.95% 3.59%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 100%)",
                    boxShadow: "rgba(0,0,0,0.3) 0px 8px 32px 0px",
                    border: "1px solid rgba(255,255,255,0.15)",
                }}
            >
                {/* Header */}
                <div className="px-8 pt-8 pb-6 text-center">
                    <img src={logo} alt="Outreach360" className="max-w-[200px] h-auto object-contain mx-auto mb-6" />
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <KeyRound className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-white mb-1">
                        Welcome, {currentUser?.first_name || "there"}!
                    </h1>
                    <p className="text-sm text-white/70">
                        You've been invited to join. Please set your own password to continue.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
                    {/* Current (temp) password */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-1.5">
                            Temporary password
                            <span className="ml-1.5 text-white/50 font-normal text-xs">(from your invite email)</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showCurrent ? "text" : "password"}
                                value={currentPw}
                                onChange={(e) => setCurrentPw(e.target.value)}
                                required
                                placeholder="Enter the password from your invite email"
                                className="w-full px-4 py-3 pr-11 text-sm bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                            />
                            <button type="button" onClick={() => setShowCurrent(v => !v)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80">
                                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* New password */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-1.5">New password</label>
                        <div className="relative">
                            <input
                                type={showNew ? "text" : "password"}
                                value={newPw}
                                onChange={(e) => setNewPw(e.target.value)}
                                required
                                placeholder="At least 8 characters"
                                className="w-full px-4 py-3 pr-11 text-sm bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                            />
                            <button type="button" onClick={() => setShowNew(v => !v)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80">
                                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-1.5">Confirm new password</label>
                        <input
                            type="password"
                            value={confirmPw}
                            onChange={(e) => setConfirmPw(e.target.value)}
                            required
                            placeholder="Repeat new password"
                            className={`w-full px-4 py-3 text-sm border rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 ${
                                confirmPw && confirmPw !== newPw
                                    ? "bg-rose-500/20 border-rose-400/50"
                                    : "bg-white/10 border-white/20 focus:border-white/40"
                            }`}
                        />
                        {confirmPw && confirmPw !== newPw && (
                            <p className="text-xs text-rose-300 mt-1">Passwords do not match</p>
                        )}
                    </div>

                    {error && (
                        <div className="px-4 py-3 bg-rose-500/20 border border-rose-400/40 rounded-xl text-sm text-rose-200">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="px-4 py-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-sm text-emerald-200 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Password set! Taking you to the dashboard...
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !currentPw || !newPw || !confirmPw}
                        className="w-full py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl transition-colors mt-2"
                    >
                        {loading ? "Setting password..." : "Set Password & Continue"}
                    </button>

                    <p className="text-center text-xs text-white/40">
                        You can change your password anytime from your profile
                    </p>
                </form>
            </div>
        </div>
    );
}
