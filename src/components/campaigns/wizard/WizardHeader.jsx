import React from 'react';
import { motion } from 'framer-motion';
import { WIZARD_STEPS } from './constants';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';

// Sticky wizard header: back to campaigns, title, the five step pills and the draft save status.
export default function WizardHeader({ wizard }) {
    const {
        currentStep, editCampaignId, isSavingDraft, lastSaved, navigate
    } = wizard;
    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white border-b border-gray-100 sticky top-0 z-20 overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
            {/* Gradient top strip */}
            <div className="h-0.5 w-full" style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }} />

            <div className="max-w-7xl mx-auto px-8 h-14 flex justify-between items-center">
                {/* Left: back + title */}
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/app/campaigns')}
                        className="p-1.5 -ml-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="h-4 w-px bg-gray-200" />
                    <h1 className="text-sm font-bold text-gray-900">
                        {editCampaignId ? 'Edit Campaign' : 'Create Campaign'}
                    </h1>
                </div>

                {/* Center: step pills */}
                <div className="hidden sm:flex items-center gap-1">
                    {WIZARD_STEPS.map(({ n, label }, i, arr) => {
                        const done    = currentStep > n;
                        const active  = currentStep === n;
                        return (
                            <React.Fragment key={n}>
                                <div className="flex items-center gap-1.5">
                                    <div
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                                        style={active
                                            ? { background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)', color: '#fff' }
                                            : done
                                            ? { background: '#10b981', color: '#fff' }
                                            : { background: '#e5e7eb', color: '#9ca3af' }
                                        }
                                    >
                                        {done ? '✓' : n}
                                    </div>
                                    <span className={`text-[11px] font-semibold ${active ? 'text-gray-900' : done ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {label}
                                    </span>
                                </div>
                                {i < arr.length - 1 && (
                                    <div className="w-6 h-px mx-0.5" style={{ background: currentStep > n ? '#10b981' : '#e5e7eb' }} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Right: save status */}
                <div className="flex items-center gap-3">
                    {isSavingDraft && (
                        <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Saving…
                        </span>
                    )}
                    {!isSavingDraft && lastSaved && (
                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Saved
                        </span>
                    )}
                </div>
            </div>
        </motion.header>
    );
}
