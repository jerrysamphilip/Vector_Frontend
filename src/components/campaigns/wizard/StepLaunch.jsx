import { motion } from 'framer-motion';
import { Button } from '../../ui/Button';
import { TIMEZONE_OPTIONS } from './timezones';
import { stepVariants } from './constants';
import EnrollmentCheckPanel from './EnrollmentCheckPanel';
import { ArrowLeft, Calendar, Globe, Rocket } from 'lucide-react';

// Wizard step 5 (Launch): configuration summary, daily batch schedule, sequence timeline and launch.
export default function StepLaunch({ wizard }) {
    const {
        campaignId, selectedLists, excludedProspectIds,
        errors, formData, launchMutation, processingResult, scheduleLoading, schedulePreview, sequenceSteps,
        setCurrentStep, setErrors
    } = wizard;
    return (
        <motion.div variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="bg-white border border-gray-100 rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div className="p-8">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                        <Rocket className="w-9 h-9 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900">Mission Ready</h2>
                    <p className="text-gray-400 mt-2 text-sm">Verify your configuration one last time before deployment.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="border border-gray-100 rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <div className="px-5 py-3 flex items-center gap-3 border-b border-gray-100" style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}>
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.15), rgba(115,200,210,0.15))' }}>
                                    <Rocket className="w-3.5 h-3.5" style={{ color: '#2d6bbf' }} />
                                </div>
                                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Deployment Specs</p>
                            </div>
                            <div className="p-5 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-gray-500">Project</span>
                                    <span className="font-bold text-gray-900">{formData.campaign_name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-gray-500">Target Audience</span>
                                    <span className="font-bold text-gray-900">{processingResult?.total_prospects || 0} Leads</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-gray-500">Identity Nodes</span>
                                    <span className="font-bold text-gray-900">{formData.inbox_ids.length} Inboxes</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-gray-500">Persona Types</span>
                                    <span className="font-bold text-gray-900">{processingResult?.personas_detected?.length || 0} Segments</span>
                                </div>
                                {formData.daily_batch_size && (
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold text-gray-500">Daily Batch</span>
                                        <span className="font-bold text-blue-600">{formData.daily_batch_size} contacts/day</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="border border-gray-100 rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <div className="px-5 py-3 flex items-center gap-3 border-b border-gray-100" style={{ background: 'linear-gradient(90deg, rgba(115,200,210,0.08), rgba(45,107,191,0.06))' }}>
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(115,200,210,0.2), rgba(45,107,191,0.15))' }}>
                                    <Globe className="w-3.5 h-3.5" style={{ color: '#4db0bb' }} />
                                </div>
                                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Sending Window</p>
                            </div>
                            <div className="p-5 space-y-2">
                                {formData.start_date && (
                                    <p className="text-sm font-bold" style={{ color: '#2d6bbf' }}>
                                        Campaign Begins: <span className="font-black">
                                            {new Date(formData.start_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                                        </span>
                                    </p>
                                )}
                                <p className="text-sm font-bold text-gray-700 leading-relaxed">
                                    {formData.sending_mode === 'spread' && <>
                                        Spread evenly <span className="font-black text-gray-900">{formData.send_window_start} – {formData.send_window_end || '(open)'}</span>
                                        {formData.min_gap_minutes > 0 && <>, max {formData.min_gap_minutes} min gap</>}
                                    </>}
                                    {formData.sending_mode === 'random' && <>
                                        Random within <span className="font-black text-gray-900">{formData.send_window_start} – {formData.send_window_end || '(open)'}</span>
                                        {formData.min_gap_minutes > 0 && <>, {formData.min_gap_minutes} min gap</>}
                                    </>}
                                    {formData.sending_mode === 'batch' && <>
                                        Batches of <span className="font-black text-gray-900">{formData.batch_size || '?'}</span>, every <span className="font-black text-gray-900">{formData.batch_gap_minutes} min</span>
                                        <>, window {formData.send_window_start} – {formData.send_window_end || '(open)'}</>
                                    </>}
                                    <br />
                                    <span className="text-xs text-gray-500 font-medium">Timezone: {TIMEZONE_OPTIONS.find(tz => tz.value === formData.campaign_timezone)?.shortLabel || formData.campaign_timezone.replace(/_/g, ' ')}</span>
                                </p>
                            </div>
                        </div>

                        {formData.daily_batch_size && (() => {
                            const batchSize = formData.daily_batch_size;
                            const total = processingResult?.total_prospects || 0;
                            const totalDays = total > 0 ? Math.ceil(total / batchSize) : null;
                            const previewDays = totalDays ? Math.min(totalDays, 5) : 3;
                            return (
                                <div className="border border-blue-100 rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(45,107,191,0.08)' }}>
                                    <div className="px-5 py-3 flex items-center gap-3 border-b border-blue-100" style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.07), rgba(115,200,210,0.06))' }}>
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.15), rgba(115,200,210,0.15))' }}>
                                            <Calendar className="w-3.5 h-3.5" style={{ color: '#2d6bbf' }} />
                                        </div>
                                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Daily Batch Schedule</p>
                                        {totalDays && <span className="ml-auto text-[10px] font-bold text-blue-500">{totalDays} days total</span>}
                                    </div>
                                    <div className="p-4 space-y-2">
                                        {Array.from({ length: previewDays }).map((_, i) => {
                                            const start = i * batchSize + 1;
                                            const end = total > 0 ? Math.min((i + 1) * batchSize, total) : (i + 1) * batchSize;
                                            return (
                                                <div key={i} className="flex items-center justify-between text-xs">
                                                    <span className="font-bold text-gray-500">Day {i + 1}</span>
                                                    <span className="font-bold text-gray-900">
                                                        Contacts {start}–{end}
                                                        {total > 0 && <span className="ml-1 text-gray-400">({end - start + 1})</span>}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {totalDays && totalDays > previewDays && (
                                            <p className="text-[10px] text-gray-400 font-medium pt-1">
                                                + {totalDays - previewDays} more day{totalDays - previewDays > 1 ? 's' : ''} ({total} contacts total)
                                            </p>
                                        )}
                                        {!total && (
                                            <p className="text-[10px] text-gray-400 font-medium">
                                                Exact schedule calculated at launch based on enrolled contacts.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Sequence Timeline</p>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {sequenceSteps.map((step, index) => {
                                const scheduleItem = schedulePreview.find(s => s.step_number === step.step_number);
                                const dateStr = scheduleLoading ? 'Calculating...' : (scheduleItem?.formatted || 'TBD');

                                return (
                                    <div key={index} className="flex gap-4 items-center">
                                        <div className="w-10 h-10 rounded-xl border-2 flex items-center justify-center font-bold text-sm"
                                        style={index === 0
                                            ? { background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)', borderColor: 'transparent', color: '#fff' }
                                            : { background: '#fff', borderColor: '#e5e7eb', color: '#9ca3af' }}>
                                            {step.step_number}
                                        </div>
                                        <div className="flex-1 bg-white border border-gray-100 rounded-xl p-3 flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 uppercase tracking-tighter">{step.type}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">
                                                    {index === 0 ? 'Immediate Launch' : `Day ${step.wait_days} Interval`}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-blue-600 uppercase">{dateStr}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {campaignId && selectedLists?.length > 0 && (
                    <div className="mt-8">
                        <EnrollmentCheckPanel campaignId={campaignId} selectedLists={selectedLists}
                            excludedProspectIds={excludedProspectIds} />
                    </div>
                )}

                {errors.launch && (
                    <p className="text-red-500 text-center mt-6 text-sm font-medium">{errors.launch}</p>
                )}
            </div>

            <div className="px-8 py-6 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between gap-4">
                <Button
                    variant="ghost"
                    onClick={() => setCurrentStep(4)}
                    className="text-slate-500 hover:text-slate-900 px-0"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Edit
                </Button>
                <Button
                    onClick={() => { setErrors(prev => ({ ...prev, launch: undefined })); launchMutation.mutate(); }}
                    isLoading={launchMutation.isPending}
                    disabled={launchMutation.isPending}
                    className="h-14 px-10 text-lg font-black uppercase tracking-widest text-white rounded-xl transition-all hover:scale-[1.005] active:scale-[0.998] hover:shadow-lg" style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                >
                    <Rocket className="w-6 h-6 mr-3" />
                    Execute Campaign
                </Button>
            </div>
        </motion.div>
    );
}
