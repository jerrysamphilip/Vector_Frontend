import React, { useState } from 'react';
import { Shield, RotateCw, Fingerprint, Clock, AlertTriangle, Save, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignApi } from '../../../api/campaigns';
import { itemVariants } from '../../layout/PageTransition';

export default function SettingsTab({ campaign }) {
    const queryClient = useQueryClient();

    // Local state for schedule settings (so user can edit without immediate save)
    const [schedule, setSchedule] = useState({
        send_window_start: campaign.send_window_start || '09:00',
        send_window_end: campaign.send_window_end || '17:00',
        sending_mode: campaign.sending_mode || 'spread',
        min_gap_minutes: campaign.min_gap_minutes ?? 2,
        batch_size: campaign.batch_size ?? 10,
        batch_gap_minutes: campaign.batch_gap_minutes ?? 30,
    });
    const [scheduleSaved, setScheduleSaved] = useState(false);

    const updateMutation = useMutation({
        mutationFn: (data) => campaignApi.update(campaign.campaign_id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['campaign', campaign.campaign_id]);
        }
    });

    const scheduleUpdateMutation = useMutation({
        mutationFn: (data) => campaignApi.update(campaign.campaign_id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['campaign', campaign.campaign_id]);
            setScheduleSaved(true);
            setTimeout(() => setScheduleSaved(false), 3000);
        }
    });

    const handleSaveSchedule = () => {
        scheduleUpdateMutation.mutate({
            send_window_start: schedule.send_window_start || null,
            send_window_end: schedule.send_window_end || null,
            sending_mode: schedule.sending_mode,
            min_gap_minutes: schedule.min_gap_minutes,
            batch_size: schedule.batch_size || null,
            batch_gap_minutes: schedule.batch_gap_minutes,
        });
    };

    const handleTogglePersona = () => {
        updateMutation.mutate({ enable_persona_rule: !campaign.enable_persona_rule });
    };

    const handleToggleRotation = () => {
        const newStrategy = campaign.rotation_strategy === 'STICKY' ? 'RANDOM' : 'STICKY';
        updateMutation.mutate({ rotation_strategy: newStrategy });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Delivery Philosophy */}
            <motion.div variants={itemVariants} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Delivery & Safety Rules</h3>
                        <p className="text-xs text-slate-500">Configure how the Auto Mailer Engine protects your domains.</p>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    {/* Persona Rule */}
                    <div className="flex items-start justify-between gap-6">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                <Fingerprint className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-slate-800">Persona Inbox Rule</h4>
                                <p className="text-sm text-slate-500 mt-1">
                                    Enforce a 24-hour cooldown per recipient. This prevents multiple emails from your campaign hitting the same prospect on the same day, reducing SPAM reports.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleTogglePersona}
                            disabled={updateMutation.isPending}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${campaign.enable_persona_rule ? 'bg-blue-600' : 'bg-slate-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${campaign.enable_persona_rule ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Rotation Strategy */}
                    <div className="flex items-start justify-between gap-6">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                <RotateCw className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-slate-800">Sticky Sender Logic</h4>
                                <p className="text-sm text-slate-500 mt-1">
                                    When enabled, a prospect is assigned to a specific inbox for the entire campaign duration. This ensures follow-up threads remain consistent. If disabled, random rotation is used per message.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <button
                                onClick={handleToggleRotation}
                                disabled={updateMutation.isPending}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${campaign.rotation_strategy === 'STICKY' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                            >
                                {campaign.rotation_strategy === 'STICKY' ? 'STICKY (Recommended)' : 'RANDOM ROTATION'}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Sending Schedule */}
            <motion.div variants={itemVariants} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-slate-800">Sending Schedule</h3>
                        <p className="text-xs text-slate-500">Configure how emails are distributed across the send window.</p>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* Window */}
                    <div>
                        <p className="text-xs font-semibold text-slate-600 mb-2">Send Window</p>
                        <div className="flex items-center gap-3">
                            <input
                                type="time"
                                value={schedule.send_window_start}
                                onChange={(e) => setSchedule({ ...schedule, send_window_start: e.target.value })}
                                className="h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400"
                            />
                            <span className="text-sm text-slate-400">to</span>
                            <input
                                type="time"
                                value={schedule.send_window_end}
                                onChange={(e) => setSchedule({ ...schedule, send_window_end: e.target.value })}
                                className="h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400"
                            />
                        </div>
                    </div>

                    {/* Mode */}
                    <div>
                        <p className="text-xs font-semibold text-slate-600 mb-2">Distribution Mode</p>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: 'spread', label: 'Spread Evenly', desc: 'Uniform distribution' },
                                { value: 'random', label: 'Random', desc: 'Random within window' },
                                { value: 'batch', label: 'Batches', desc: 'Groups with gap' },
                            ].map(mode => (
                                <button
                                    key={mode.value}
                                    type="button"
                                    onClick={() => setSchedule({ ...schedule, sending_mode: mode.value })}
                                    className={`p-2.5 rounded-lg border text-left transition-all ${schedule.sending_mode === mode.value
                                        ? 'border-blue-400 bg-blue-50'
                                        : 'border-slate-200 bg-white hover:border-blue-200'}`}
                                >
                                    <p className={`text-xs font-bold ${schedule.sending_mode === mode.value ? 'text-blue-700' : 'text-slate-700'}`}>{mode.label}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{mode.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Random options */}
                    {schedule.sending_mode === 'random' && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-xs text-slate-600">Min gap between emails</span>
                            <input
                                type="number" min="0" max="60"
                                value={schedule.min_gap_minutes}
                                onChange={(e) => setSchedule({ ...schedule, min_gap_minutes: parseInt(e.target.value) || 0 })}
                                className="w-16 h-8 px-2 border border-slate-200 rounded-lg text-sm text-center bg-white focus:outline-none focus:border-blue-400"
                            />
                            <span className="text-xs text-slate-400">minutes</span>
                        </div>
                    )}

                    {/* Batch options */}
                    {schedule.sending_mode === 'batch' && (
                        <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-600 w-32">Emails per batch</span>
                                <input
                                    type="number" min="1"
                                    value={schedule.batch_size || ''}
                                    onChange={(e) => setSchedule({ ...schedule, batch_size: parseInt(e.target.value) || null })}
                                    placeholder="e.g. 10"
                                    className="w-20 h-8 px-2 border border-slate-200 rounded-lg text-sm text-center bg-white focus:outline-none focus:border-blue-400"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-600 w-32">Gap between batches</span>
                                <input
                                    type="number" min="1"
                                    value={schedule.batch_gap_minutes}
                                    onChange={(e) => setSchedule({ ...schedule, batch_gap_minutes: parseInt(e.target.value) || 30 })}
                                    className="w-20 h-8 px-2 border border-slate-200 rounded-lg text-sm text-center bg-white focus:outline-none focus:border-blue-400"
                                />
                                <span className="text-xs text-slate-400">minutes</span>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleSaveSchedule}
                        disabled={scheduleUpdateMutation.isPending}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${scheduleSaved
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        {scheduleUpdateMutation.isPending
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : scheduleSaved
                                ? '✓ Saved'
                                : <><Save className="w-4 h-4" /> Save Schedule</>
                        }
                    </button>
                </div>
            </motion.div>

            {/* Global Engine Limits (Read Only) */}
            <motion.div variants={itemVariants} className="bg-slate-900 rounded-xl p-6 text-white overflow-hidden relative border border-slate-800">
                <div className="relative z-10 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Auto Mailer Engine Protocol</h3>
                        <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                            The engine automatically enforces per-inbox daily limits and hourly caps.
                            If an inbox hits its limit, the scheduler will automatically queue messages for the next available window.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Dynamic Cap</span>
                                <p className="text-sm font-semibold">25% of Daily Limit / Hour</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Retry Strategy</span>
                                <p className="text-sm font-semibold">Exponential Backoff (2^n mins)</p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Visual Flair */}
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Shield className="w-32 h-32" />
                </div>
            </motion.div>

            {/* Warning Area */}
            <motion.div variants={itemVariants} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div className="text-xs space-y-1">
                    <p className="font-bold uppercase tracking-tight">Expert Advisory</p>
                    <p>Disabling the Persona Rule or using Random Rotation may increase your bounce rates and affect domain reputation.</p>
                </div>
            </motion.div>
        </div>
    );
}
