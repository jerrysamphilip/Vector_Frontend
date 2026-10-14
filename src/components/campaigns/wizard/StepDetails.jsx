import { motion } from 'framer-motion';
import { stepVariants } from './constants';
import CampaignIdentitySection from './CampaignIdentitySection';
import SenderPoolSection from './SenderPoolSection';
import SenderDetailsSection from './SenderDetailsSection';
import DeliverySettingsSection from './DeliverySettingsSection';
import { AlertCircle, ArrowRight, Loader2, Rocket } from 'lucide-react';

// Wizard step 1 (Details): campaign setup form; "Save & Continue" creates or updates the campaign.
export default function StepDetails({ wizard }) {
    const {
        createMutation, errors, handleStep1Submit
    } = wizard;
    return (
        <motion.div variants={stepVariants} initial="hidden" animate="visible" exit="exit"
            className="bg-white border border-gray-100 rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <form onSubmit={handleStep1Submit}>

                {/* ── Card gradient header ── */}
                <div className="px-8 py-6 border-b border-gray-100"
                    style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.05), rgba(115,200,210,0.05))' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                            <Rocket className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Campaign Setup</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Define identity, sender pool, and delivery settings.</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8">

                    {/* ── SECTION 1: Identity ── */}
                    <CampaignIdentitySection wizard={wizard} />

                    {/* ── Divider ── */}
                    <div className="h-px bg-gray-100" />

                    {/* ── SECTION 2: Sender Pool ── */}
                    <SenderPoolSection wizard={wizard} />

                    {/* ── Divider ── */}
                    <div className="h-px bg-gray-100" />

                    {/* ── SECTION 3: Sender Details ── */}
                    <SenderDetailsSection wizard={wizard} />

                    {/* ── Divider ── */}
                    <div className="h-px bg-gray-100" />

                    {/* ── SECTION 4: Delivery Settings ── */}
                    <DeliverySettingsSection wizard={wizard} />

                </div>

                {/* ── Footer ── */}
                <div className="px-8 py-5 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                        {errors.submit && <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.submit}</span>}
                    </p>
                    <button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="flex items-center gap-2 text-white font-semibold h-11 px-8 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                    >
                        {createMutation.isPending
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                            : <><span>Save & Continue</span><ArrowRight className="w-4 h-4" /></>
                        }
                    </button>
                </div>
            </form>
        </motion.div>
    );
}
