import { localISODate } from '../../../lib/dates';
import TimezonePicker from './TimezonePicker';
import { Calendar, Clock, Globe } from 'lucide-react';

// Step 1 "Delivery Settings": timezone, send window, distribution mode, daily batch limit and start date.
export default function DeliverySettingsSection({ wizard }) {
    const {
        dateInputRef, formData, setFormData
    } = wizard;
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #F5F1DC, #e8e3c0)' }}>
                    <Clock className="w-3.5 h-3.5 text-gray-600" />
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Delivery Settings</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Timezone card */}
                <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/60 space-y-3">
                    <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-600">Campaign Timezone <span className="text-red-400">*</span></span>
                    </div>
                    <TimezonePicker
                        value={formData.campaign_timezone}
                        onChange={(val) => setFormData({ ...formData, campaign_timezone: val })}
                    />
                    <p className="text-[11px] text-gray-400 leading-snug">
                        All send times are interpreted in this timezone.
                    </p>
                </div>

                {/* Sending Window */}
                <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/60 space-y-3">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-600">Send Window <span className="text-red-400">*</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="time"
                            value={formData.send_window_start}
                            onChange={(e) => setFormData({ ...formData, send_window_start: e.target.value })}
                            required
                            className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400 transition-all"
                        />
                        <span className="text-xs text-gray-400 font-medium">to</span>
                        <input
                            type="time"
                            value={formData.send_window_end}
                            onChange={(e) => setFormData({ ...formData, send_window_end: e.target.value })}
                            className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400 transition-all"
                        />
                    </div>
                    <p className="text-[11px] text-gray-400 leading-snug">
                        All emails will be sent within this daily window.
                    </p>
                </div>

                {/* Sending Mode */}
                <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/60 space-y-3">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-600">Distribution Mode</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { value: 'spread', label: 'Spread Evenly', desc: 'Distribute uniformly across window' },
                            { value: 'random', label: 'Random', desc: 'Random time per email in window' },
                            { value: 'batch', label: 'Batches', desc: 'Send in groups with gap between' },
                        ].map(mode => (
                            <button
                                key={mode.value}
                                type="button"
                                onClick={() => setFormData({ ...formData, sending_mode: mode.value })}
                                className={`p-2.5 rounded-lg border text-left transition-all ${formData.sending_mode === mode.value
                                    ? 'border-blue-400 bg-blue-50'
                                    : 'border-gray-200 bg-white hover:border-blue-200'}`}
                            >
                                <p className={`text-[11px] font-bold ${formData.sending_mode === mode.value ? 'text-blue-700' : 'text-gray-700'}`}>{mode.label}</p>
                                <p className="text-[10px] text-gray-400 leading-snug mt-0.5">{mode.desc}</p>
                            </button>
                        ))}
                    </div>

                    {/* Random mode options */}
                    {formData.sending_mode === 'random' && (
                        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                            <span className="text-[11px] text-gray-500 whitespace-nowrap">Min gap between emails</span>
                            <input
                                type="number"
                                min="0"
                                max="60"
                                value={formData.min_gap_minutes}
                                onChange={(e) => setFormData({ ...formData, min_gap_minutes: parseInt(e.target.value) || 0 })}
                                className="w-16 h-8 px-2 border border-gray-200 rounded-lg text-sm text-center bg-white focus:outline-none focus:border-blue-400"
                            />
                            <span className="text-[11px] text-gray-400">minutes</span>
                        </div>
                    )}

                    {/* Spread mode options */}
                    {formData.sending_mode === 'spread' && (
                        <div className="pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] text-gray-500 whitespace-nowrap">Max gap between emails</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={formData.min_gap_minutes}
                                    onChange={(e) => setFormData({ ...formData, min_gap_minutes: parseInt(e.target.value) || 0 })}
                                    className="w-16 h-8 px-2 border border-gray-200 rounded-lg text-sm text-center bg-white focus:outline-none focus:border-blue-400"
                                />
                                <span className="text-[11px] text-gray-400">minutes</span>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-snug mt-1.5">
                                By default, Spread stretches evenly across the whole window above —
                                a short list in a long window sends slower than it needs to. This
                                caps the gap so sending finishes sooner. 0 = no cap (send as fast as
                                the window allows).
                            </p>
                        </div>
                    )}

                    {/* Batch mode options */}
                    {formData.sending_mode === 'batch' && (
                        <div className="space-y-2 pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] text-gray-500 whitespace-nowrap w-28">Emails per batch</span>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.batch_size || ''}
                                    onChange={(e) => setFormData({ ...formData, batch_size: parseInt(e.target.value) || null })}
                                    placeholder="e.g. 10"
                                    className="w-20 h-8 px-2 border border-gray-200 rounded-lg text-sm text-center bg-white focus:outline-none focus:border-blue-400"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] text-gray-500 whitespace-nowrap w-28">Gap between batches</span>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.batch_gap_minutes}
                                    onChange={(e) => setFormData({ ...formData, batch_gap_minutes: parseInt(e.target.value) || 30 })}
                                    className="w-20 h-8 px-2 border border-gray-200 rounded-lg text-sm text-center bg-white focus:outline-none focus:border-blue-400"
                                />
                                <span className="text-[11px] text-gray-400">minutes</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Daily Batch Limit */}
                <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/60 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-600">Daily Batch Limit</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData({
                                ...formData,
                                daily_batch_size: formData.daily_batch_size ? null : 100,
                            })}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${formData.daily_batch_size ? 'bg-blue-500' : 'bg-gray-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${formData.daily_batch_size ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                    </div>
                    {formData.daily_batch_size ? (
                        <div className="space-y-2 pt-1 border-t border-gray-100">
                            <p className="text-[11px] text-gray-500">
                                Contacts are emailed in groups across consecutive business days.
                                Day 1 → contacts 1–{formData.daily_batch_size}, Day 2 → {formData.daily_batch_size + 1}–{formData.daily_batch_size * 2}, etc.
                            </p>
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] text-gray-500 whitespace-nowrap">Contacts per day</span>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.daily_batch_size}
                                    onChange={(e) => setFormData({ ...formData, daily_batch_size: parseInt(e.target.value) || 100 })}
                                    className="w-20 h-8 px-2 border border-gray-200 rounded-lg text-sm text-center bg-white focus:outline-none focus:border-blue-400"
                                />
                            </div>
                        </div>
                    ) : (
                        <p className="text-[11px] text-gray-400">
                            Off — all contacts are scheduled from Day 1. Enable to throttle to N contacts per day.
                        </p>
                    )}
                </div>

                {/* Start Date card */}
                <label
                    onClick={() => { if (dateInputRef.current?.showPicker) dateInputRef.current.showPicker(); else dateInputRef.current?.focus(); }}
                    className="block p-4 border border-gray-100 rounded-xl bg-gray-50/60 space-y-3 cursor-pointer hover:border-blue-300 hover:bg-white transition-all"
                >
                    <div className="flex items-center gap-2 pointer-events-none">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-600">Campaign Start Date</span>
                    </div>
                    <input
                        ref={dateInputRef}
                        type="date"
                        value={formData.start_date || ''}
                        min={localISODate()}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value || null })}
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400 transition-all"
                    />
                    {formData.start_date ? (
                        <p className="text-[11px] font-medium pointer-events-none"
                            style={{ color: '#2d6bbf' }}>
                            Begins {new Date(formData.start_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                    ) : (
                        <p className="text-[11px] text-gray-400 pointer-events-none">Starts immediately on launch day.</p>
                    )}
                </label>

            </div>
        </div>
    );
}
