import DialogPanel from '../../common/DialogPanel';
import { Sparkles, X as XIcon } from 'lucide-react';

// Step 1: dialog editing the campaign description the AI uses as context (saved into the form on "Save Context").
export default function CampaignContextDialog({ wizard }) {
    const {
        contextRef, formData, setFormData, setIsContextOpen, setTempContext, tempContext
    } = wizard;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setIsContextOpen(false)}>
            <DialogPanel onClose={() => setIsContextOpen(false)} labelledBy="campaign-context-title"
                className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}>
                <div className="h-1 w-full" style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }} />
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" style={{ color: '#2d6bbf' }} />
                            <h3 id="campaign-context-title" className="text-base font-bold text-gray-900">Campaign Context for AI</h3>
                        </div>
                        <button onClick={() => setIsContextOpen(false)} aria-label="Close"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <textarea
                        ref={contextRef}
                        value={tempContext}
                        onChange={(e) => setTempContext(e.target.value)}
                        placeholder="Example: Conference campaign for Asembia AXS26 (Apr 27-28, Las Vegas). Focus on AccessHub and Prior Auth automation for specialty pharmacy hub managers. Abhi (Head HealthTech Solutions) will attend in person."
                        rows={7}
                        className="w-full p-4 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white resize-none text-sm text-gray-700 leading-relaxed transition-all"
                    />
                    <p className="text-xs text-gray-400 mt-2">
                        <span className="font-semibold text-gray-500">How it works:</span> AI auto-detects your campaign type from this description. For conference/in-person emails, include event name, dates, location, and visiting rep name &amp; title. For cold outreach, describe the target audience and pain points to focus on. Leave blank to let AI pick from all Neutrino services automatically.
                    </p>
                    <div className="flex justify-end gap-2.5 mt-4">
                        <button onClick={() => setIsContextOpen(false)}
                            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={() => { setFormData({ ...formData, campaign_description: tempContext }); setIsContextOpen(false); }}
                            className="px-5 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:scale-[1.02]"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                            Save Context
                        </button>
                    </div>
                </div>
            </DialogPanel>
        </div>
    );
}
