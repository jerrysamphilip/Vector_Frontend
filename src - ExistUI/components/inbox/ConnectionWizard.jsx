import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, Loader2, AlertTriangle, X, Shield, Activity } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, FormGroup, Label } from '../ui/Input';

const STEPS = {
    PROVIDER: 1,
    CREDENTIALS: 2,
    VERIFYING: 3
};

export default function ConnectionWizard({ isOpen, onClose, onSubmit, isSubmitting, error, initialData = null }) {
    const [step, setStep] = useState(STEPS.PROVIDER);
    const [formData, setFormData] = useState({
        provider: 'Google',
        email_address: '',
        daily_limit: 500,
        smtp_host: '',
        smtp_port: 587,
        smtp_username: '',
        smtp_password: '',
        smtp_use_ssl: false,
        imap_host: '',
        imap_username: '',
        imap_password: '',
        warmup_enabled: false
    });

    // Reset or Load Data when opening
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    ...initialData,
                    smtp_password: '', // Don't show password on edit
                    imap_password: ''  // Don't show password on edit
                });
                setStep(STEPS.CREDENTIALS);
            } else {
                setFormData({
                    provider: 'Google',
                    email_address: '',
                    daily_limit: 500,
                    smtp_host: '',
                    smtp_port: 587,
                    smtp_username: '',
                    smtp_password: '',
                    smtp_use_ssl: false,
                    imap_host: '',
                    imap_username: '',
                    imap_password: '',
                    warmup_enabled: false
                });
                setStep(STEPS.PROVIDER);
            }
        }
    }, [isOpen, initialData]);

    const handleProviderSelect = (provider) => {
        setFormData({ ...formData, provider });
        setStep(STEPS.CREDENTIALS);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = { ...formData };
        // Do not clear existing stored IMAP password on edit when left blank.
        if (initialData && !payload.imap_password) {
            delete payload.imap_password;
        }
        onSubmit(payload);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {initialData ? 'Edit Connection' : 'Connect Private Inbox'}
                        </h2>
                        <div className="flex items-center gap-2 mt-1 text-xs font-medium text-slate-500">
                            <span className={step >= 1 ? 'text-blue-600' : ''}>Provider</span>
                            <span>→</span>
                            <span className={step >= 2 ? 'text-blue-600' : ''}>Credentials</span>
                            <span>→</span>
                            <span className={step >= 3 ? 'text-blue-600' : ''}>Verify</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    <AnimatePresence mode="wait">
                        {step === STEPS.PROVIDER && (
                            <motion.div
                                key="provider"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-4"
                            >
                                <p className="text-sm text-slate-500 mb-4">Select your email service provider to continue.</p>
                                <div className="grid grid-cols-1 gap-3">
                                    {['Google', 'Outlook', 'SMTP'].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => handleProviderSelect(p)}
                                            className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 transition-all group text-left bg-white"
                                        >
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold
                                                ${p === 'Google' ? 'bg-blue-100 text-blue-600' :
                                                    p === 'Outlook' ? 'bg-indigo-100 text-indigo-600' :
                                                        'bg-slate-100 text-slate-600'}
                                            `}>
                                                {p[0]}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-800 group-hover:text-blue-700">{p} Workspace</h3>
                                                <p className="text-xs text-slate-500">
                                                    {p === 'SMTP' ? 'Connect any other provider via IMAP/SMTP' : `Connect your ${p} account`}
                                                </p>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === STEPS.CREDENTIALS && (
                            <motion.div
                                key="credentials"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                            >
                                <form id="wizard-form" onSubmit={handleSubmit} className="space-y-4">
                                    <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Connecting via <strong>{formData.provider}</strong></span>
                                        {!initialData && (
                                            <button type="button" onClick={() => setStep(STEPS.PROVIDER)} className="ml-auto text-xs underline hover:text-blue-900">Change</button>
                                        )}
                                    </div>

                                    <FormGroup>
                                        <Label>Email Address</Label>
                                        <Input
                                            required
                                            type="email"
                                            placeholder="name@company.com"
                                            value={formData.email_address}
                                            onChange={e => setFormData({ ...formData, email_address: e.target.value })}
                                            disabled={!!initialData} // Disable email edit
                                            className={initialData ? 'bg-slate-100 text-slate-500' : ''}
                                        />
                                    </FormGroup>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormGroup>
                                            <Label>Daily Limit</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={formData.daily_limit}
                                                onChange={e => setFormData({ ...formData, daily_limit: parseInt(e.target.value) })}
                                            />
                                        </FormGroup>
                                    </div>

                                    {/* Warmup Settings */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4 mb-4">
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-1 p-1.5 rounded-lg ${formData.warmup_enabled ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
                                                <Activity className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-sm font-bold text-slate-800 cursor-pointer" htmlFor="warmup-toggle">
                                                        Enable Automated Warmup
                                                    </label>

                                                    {/* Toggle Switch */}
                                                    <button
                                                        type="button"
                                                        id="warmup-toggle"
                                                        onClick={() => setFormData({ ...formData, warmup_enabled: !formData.warmup_enabled })}
                                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${formData.warmup_enabled ? 'bg-indigo-600' : 'bg-slate-300'
                                                            }`}
                                                    >
                                                        <span
                                                            className={`${formData.warmup_enabled ? 'translate-x-5' : 'translate-x-1'
                                                                } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                                                        />
                                                    </button>
                                                </div>
                                                <p className="text-xs text-slate-500 leading-relaxed">
                                                    Gradually increases daily sending capability (5 &rarr; 10 &rarr; 20...) to build domain reputation and avoid spam filters.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SMTP Fields */}
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <div>
                                            <h4 className="font-bold text-sm text-slate-800">SMTP (Sending)</h4>
                                            <p className="text-xs text-slate-500 mt-0.5">Required for per-inbox warmup sending. Without this, warmup uses the shared SES relay.</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormGroup>
                                                <Label>SMTP Host</Label>
                                                <Input value={formData.smtp_host} onChange={e => setFormData({ ...formData, smtp_host: e.target.value })} placeholder="smtp.gmail.com" />
                                            </FormGroup>
                                            <FormGroup>
                                                <Label>SMTP Port</Label>
                                                <Input type="number" value={formData.smtp_port} onChange={e => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })} placeholder="587" />
                                            </FormGroup>
                                        </div>
                                        <FormGroup>
                                            <Label>SMTP Username</Label>
                                            <Input value={formData.smtp_username} onChange={e => setFormData({ ...formData, smtp_username: e.target.value })} placeholder="Usually your email address" />
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>SMTP Password / App Password</Label>
                                            <Input type="password" value={formData.smtp_password} onChange={e => setFormData({ ...formData, smtp_password: e.target.value })} placeholder={initialData ? "Leave blank to keep unchanged" : "Password"} />
                                        </FormGroup>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, smtp_use_ssl: !formData.smtp_use_ssl })}
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${formData.smtp_use_ssl ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                            >
                                                <span className={`${formData.smtp_use_ssl ? 'translate-x-5' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition-transform`} />
                                            </button>
                                            <span className="text-xs text-slate-600">Use SSL (port 465) instead of STARTTLS (port 587)</span>
                                        </div>
                                    </div>

                                    {/* IMAP Fields */}
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <div>
                                            <h4 className="font-bold text-sm text-slate-800">IMAP (Receiving)</h4>
                                            <p className="text-xs text-slate-500 mt-0.5">Required for detecting replies and real warmup engagement (open tracking, spam rescue).</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormGroup>
                                                <Label>IMAP Host</Label>
                                                <Input value={formData.imap_host} onChange={e => setFormData({ ...formData, imap_host: e.target.value })} placeholder="imap.gmail.com" />
                                            </FormGroup>
                                            <FormGroup>
                                                <Label>IMAP Username</Label>
                                                <Input value={formData.imap_username} onChange={e => setFormData({ ...formData, imap_username: e.target.value })} placeholder="Usually email address" />
                                            </FormGroup>
                                        </div>
                                        <FormGroup>
                                            <Label>IMAP Password / App Password</Label>
                                            <Input type="password" value={formData.imap_password} onChange={e => setFormData({ ...formData, imap_password: e.target.value })} placeholder={initialData ? "Leave blank to keep unchanged" : "Password"} />
                                        </FormGroup>
                                    </div>

                                    {error && (
                                        <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-lg flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            {error}
                                        </div>
                                    )}
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    {step === STEPS.CREDENTIALS && !initialData && (
                        <Button variant="outline" onClick={() => setStep(STEPS.PROVIDER)} type="button">Back</Button>
                    )}
                    {step === STEPS.CREDENTIALS ? (
                        <Button form="wizard-form" type="submit" disabled={isSubmitting} className="min-w-[120px] bg-indigo-600 hover:bg-indigo-700">
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (initialData ? 'Save Changes' : 'Connect Account')}
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
