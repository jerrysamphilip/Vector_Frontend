import { motion } from 'framer-motion';
import { Button } from '../../ui/Button';
import { stepVariants } from './constants';
import { ArrowLeft, ArrowRight, Clock, Plus, Trash2 } from 'lucide-react';

// Wizard step 2 (Sequence): the initial email plus up to six follow-ups with their wait days.
export default function StepSequence({ wizard }) {
    const {
        addSequenceStep, campaignId, removeSequenceStep, sequenceMutation, sequenceSteps, setCurrentStep,
        setSequenceSteps
    } = wizard;
    return (
        <motion.div variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="bg-white border border-gray-100 rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            {/* — Gradient card header — */}
            <div className="px-8 py-5 flex items-center gap-4 border-b border-gray-100" style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.15), rgba(115,200,210,0.15))' }}>
                    <Clock className="w-5 h-5" style={{ color: '#2d6bbf' }} />
                </div>
                <div>
                    <h2 className="text-lg font-bold !text-gray-900">Sequence Engine</h2>
                    <p className="text-gray-400 text-sm">Design the automated follow-up cadence. Max 7 steps.</p>
                </div>
            </div>
            <div className="p-8">

                {/* TIMELINE CONTAINER */}
                <div className="relative pl-8 space-y-8">
                    {/* The Continuous Vertical Line */}
                    <div className="absolute left-[31px] top-4 bottom-12 w-0.5 bg-slate-200" />

                    {sequenceSteps?.map((step, index) => (
                        <div key={index} className="relative">

                            {/* WAIT BLOCK (If not first step) */}
                            {index > 0 && (
                                <div className="flex items-center gap-4 mb-8 relative">
                                    {/* Dot on line */}
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 absolute -left-[23px]" />

                                    <div className="flex items-center gap-3 bg-slate-50 border border-dashed border-slate-300 px-4 py-1.5 rounded-full z-10">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Wait</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={step.wait_days}
                                            onChange={(e) => {
                                                const newSteps = [...sequenceSteps];
                                                newSteps[index].wait_days = parseInt(e.target.value) || 0;
                                                setSequenceSteps(newSteps);
                                            }}
                                            className="w-12 h-5 text-xs text-center font-bold text-slate-700 bg-white border border-slate-200 rounded focus:ring-blue-500 hover:border-blue-400 transition-colors"
                                        />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Days</span>
                                    </div>
                                </div>
                            )}

                            {/* EMAIL STEP CARD */}
                            <div className="relative group">
                                {/* Step Number Circle */}
                                <div
                                    className="absolute -left-[44px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10 border-2 transition-all"
                                    style={index === 0
                                        ? { background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)', borderColor: 'transparent', color: '#fff' }
                                        : { background: '#fff', borderColor: '#e5e7eb', color: '#6b7280' }
                                    }
                                >
                                    {step.step_number}
                                </div>

                                <div className="p-5 border-2 border-slate-200 rounded-xl bg-white hover:border-blue-400 transition-all group flex justify-between items-center shadow-none">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-slate-900">{step.type}</h3>
                                            {index === 0 && <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">INITIAL</span>}
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            {index === 0 ? 'Starts immediately on campaign launch' : 'Follow-up email sent automatically if no reply'}
                                        </p>
                                    </div>

                                    {index > 0 && (
                                        <button
                                            onClick={() => removeSequenceStep(index)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remove Step"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* ADD STEP BUTTON */}
                    {sequenceSteps.length < 7 && (
                        <div className="relative pt-4">
                            {/* Connector to button */}
                            <div className="absolute left-[31px] -top-4 h-8 w-0.5 bg-slate-200" />

                            <button
                                onClick={addSequenceStep}
                                className="w-full h-14 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50/40 transition-all flex items-center justify-center gap-2 font-bold text-sm"
                                style={{ '--hover-border': '#2d6bbf' }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = '#2d6bbf'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                            >
                                <Plus className="w-5 h-5" />
                                Add Follow-up Step
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-8 py-5 bg-gray-50/60 border-t border-gray-100 flex justify-between items-center">
                <Button variant="ghost" onClick={() => setCurrentStep(1)} className="text-slate-500 hover:text-slate-900 px-0">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <Button
                    onClick={() => sequenceMutation.mutate(campaignId)}
                    isLoading={sequenceMutation.isPending}
                    className="text-white font-bold h-11 px-10 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                >
                    Save Sequence
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </motion.div>
    );
}
