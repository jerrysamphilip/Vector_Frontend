import { motion } from 'framer-motion';
import { Button } from '../../ui/Button';
import { stepVariants } from './constants';
import ProspectListPicker from './ProspectListPicker';
import ListProspectsPanel from './ListProspectsPanel';
import ProspectUploadPanel from './ProspectUploadPanel';
import { ArrowLeft, Loader2, Sparkles, Upload, Users } from 'lucide-react';

// Wizard step 3 (Prospects): pick an existing list or upload a new one, then process it with AI.
export default function StepProspects({ wizard }) {
    const {
        creativeEmail, errors, generationStatus, isGeneratingTemplates, isListDropdownOpen, listsLoading,
        processMutation, selectedLists, setCreativeEmail, setCurrentStep, setUploadMode, uploadConfirmed, uploadMode
    } = wizard;
    return (
        <motion.div variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="bg-white border border-gray-100 rounded-2xl" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            {/* — Gradient card header — */}
            <div className="px-8 py-5 flex items-center gap-4 border-b border-gray-100 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.15), rgba(115,200,210,0.15))' }}>
                    <Users className="w-5 h-5" style={{ color: '#2d6bbf' }} />
                </div>
                <div>
                    <h2 className="text-lg font-bold !text-gray-900">Select Prospects</h2>
                    <p className="text-gray-400 text-sm">Choose an existing list or upload a new one.</p>
                </div>
            </div>
            <div className="p-8">
                {/* Tab Switcher */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setUploadMode('select')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                        style={uploadMode === 'select'
                            ? { background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)', color: '#fff' }
                            : { background: '#f1f5f9', color: '#475569' }}
                    >
                        <Users className="w-4 h-4" />
                        Select Existing List
                    </button>
                    <button
                        onClick={() => setUploadMode('upload')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                        style={uploadMode === 'upload'
                            ? { background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)', color: '#fff' }
                            : { background: '#f1f5f9', color: '#475569' }}
                    >
                        <Upload className="w-4 h-4" />
                        Upload New List
                    </button>
                </div>

                {/* SELECT MODE */}
                {uploadMode === 'select' && (
                    <>
                        {listsLoading ? (
                            <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                        ) : (
                            <ProspectListPicker wizard={wizard} />
                        )}

                        {/* Embedded Prospect Table (when list selected) */}
                        {selectedLists.length > 0 && !isListDropdownOpen && (
                            <ListProspectsPanel wizard={wizard} />
                        )}
                    </>
                )}

                {/* UPLOAD MODE */}
                {uploadMode === 'upload' && (
                    <ProspectUploadPanel wizard={wizard} />
                )}

                {errors.process && <p className="text-red-500 text-center mt-4">{errors.process}</p>}
                {errors.upload && <p className="text-red-500 text-center mt-4">{errors.upload}</p>}

                {/* Simple Loading Indicator */}
                {isGeneratingTemplates && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                            <div>
                                <p className="font-medium text-blue-900">AI is generating templates...</p>
                                <p className="text-sm text-blue-600">{generationStatus || 'This may take 10-20 seconds'}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="px-8 py-5 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={creativeEmail}
                        onChange={(e) => setCreativeEmail(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 font-medium">Creative Email</span>
                    <span className="text-xs text-gray-400 font-medium">(adds creative prompt style)</span>
                </label>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={() => setCurrentStep(2)} className="text-gray-500 hover:text-gray-900 px-0">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <button
                        onClick={() => processMutation.mutate()}
                        disabled={processMutation.isPending || selectedLists.length === 0 || (uploadMode === 'upload' && !uploadConfirmed)}
                        className="flex items-center gap-2 text-white font-semibold h-11 px-8 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                    >
                        {processMutation.isPending
                            ? <><Loader2 className="w-4 h-4 animate-spin" />Processing AI…</>
                            : <><Sparkles className="w-4 h-4" />Process &amp; Generate Templates</>
                        }
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
