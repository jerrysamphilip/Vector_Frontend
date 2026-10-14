import { motion } from 'framer-motion';
import { Button } from '../../ui/Button';
import { stepVariants } from './constants';
import PersonaPicker from './PersonaPicker';
import EmailTemplatePreview from './EmailTemplatePreview';
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2, Mail, Sparkles } from 'lucide-react';

// Wizard step 4 (Templates): AI-generated email sequences per persona.
export default function StepTemplates({ wizard }) {
    const {
        getSelectedTemplate, processingResult, selectedPersona, setCurrentStep
    } = wizard;
    return (
        <motion.div variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="bg-white border border-gray-100 rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            {!processingResult ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                    <p className="text-slate-600 font-bold">Synchronizing AI Blueprints...</p>
                </div>
            ) : (
                <>
                    {/* — Gradient card header — */}
                    <div className="px-8 py-5 flex items-center gap-4 border-b border-gray-100" style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.15), rgba(115,200,210,0.15))' }}>
                            <Sparkles className="w-5 h-5" style={{ color: '#2d6bbf' }} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold !text-gray-900">Persona Blueprints</h2>
                            <p className="text-gray-400 text-sm">AI classified {processingResult.total_prospects || 0} prospects into {processingResult.personas_detected?.length || 0} personas.</p>
                        </div>
                    </div>
                    <div className="p-8">
                        {(processingResult?.ai_fallback_used
                            || processingResult?.templates_generated?.some(t => t.fallback_used)) && (
                            <div role="status" data-testid="ai-fallback-notice"
                                className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                                <span>{processingResult?.notice || 'AI unavailable - starter templates were used, please review'}</span>
                            </div>
                        )}

                        <div className="space-y-8">
                            {/* Persona Buttons */}
                            <PersonaPicker wizard={wizard} />

                            {/* Template Preview */}
                            {selectedPersona && getSelectedTemplate() && (
                                <EmailTemplatePreview wizard={wizard} />
                            )}

                            {!selectedPersona && (
                                <div className="text-center py-16 bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.1), rgba(115,200,210,0.1))' }}>
                                        <Mail className="w-6 h-6" style={{ color: '#2d6bbf' }} />
                                    </div>
                                    <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Select a persona to unlock blueprints</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="px-8 py-5 bg-gray-50/60 border-t border-gray-100 flex justify-between items-center">
                        <Button variant="ghost" onClick={() => setCurrentStep(3)} className="text-slate-500 hover:text-slate-900 px-0">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                        <Button
                            onClick={() => setCurrentStep(5)}
                            disabled={!processingResult}
                            className="text-white font-bold h-11 px-10 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                        >
                            Finalize & Launch
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </>
            )}
        </motion.div>
    );
}
