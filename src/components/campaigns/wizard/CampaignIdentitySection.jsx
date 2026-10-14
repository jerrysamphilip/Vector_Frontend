import CampaignContextDialog from './CampaignContextDialog';
import { AlertCircle, Edit2, User } from 'lucide-react';

// Step 1 "Campaign Identity": name, company profile, AI context and the subject / unsubscribe toggles.
export default function CampaignIdentitySection({ wizard }) {
    const {
        companyProfiles, errors, formData, handleProfileSelect, isContextOpen, selectedProfileId, setFormData,
        setIsContextOpen, setTempContext
    } = wizard;
    return (
        <div className="space-y-5">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}>
                    <User className="w-3.5 h-3.5" style={{ color: '#2d6bbf' }} />
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Campaign Identity</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Campaign Name */}
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaign Name <span className="text-red-400">*</span></label>
                    <input
                        name="campaign_name"
                        value={formData.campaign_name}
                        onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                        placeholder="e.g. Q4 Enterprise Outreach"
                        autoFocus
                        className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                        style={{ focusBorderColor: '#2d6bbf' }}
                    />
                    {errors.campaign_name && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />{errors.campaign_name}
                        </p>
                    )}
                </div>

                {/* Company Profile */}
                {companyProfiles?.length > 0 && (
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Company Profile</label>
                        <select
                            value={selectedProfileId}
                            onChange={(e) => handleProfileSelect(e.target.value)}
                            className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-blue-400 focus:bg-white transition-all appearance-none"
                        >
                            <option value="">— Select Identity —</option>
                            {companyProfiles?.map(profile => (
                                <option key={profile.profile_id} value={profile.profile_id}>
                                    {profile.profile_name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* AI Context */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Context</label>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(45,107,191,0.08)', color: '#2d6bbf' }}>
                        Powers email generation
                    </span>
                </div>
                <div
                    onClick={() => { setTempContext(formData.campaign_description); setIsContextOpen(true); }}
                    className="w-full min-h-[80px] px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer text-sm text-gray-700 leading-relaxed hover:border-blue-300 hover:bg-white transition-all group relative"
                >
                    {formData.campaign_description
                        ? <span className="text-gray-700">{formData.campaign_description}</span>
                        : <span className="text-gray-400 italic">Describe your campaign — include campaign type, target audience, and products to highlight…</span>
                    }
                    <span className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                    </span>
                </div>

                {/* Context modal */}
                {isContextOpen && <CampaignContextDialog wizard={wizard} />}

                {/* Personalization toggle */}
                <label className="flex items-center gap-3 cursor-pointer select-none mt-2 group">
                    <div
                        onClick={() => setFormData({ ...formData, include_first_name_in_subject: !formData.include_first_name_in_subject })}
                        className="relative w-9 h-5 rounded-full transition-all shrink-0"
                        style={{ background: formData.include_first_name_in_subject ? 'linear-gradient(135deg, #2d6bbf, #73C8D2)' : '#d1d5db' }}>
                        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                            style={{ transform: formData.include_first_name_in_subject ? 'translateX(16px)' : 'translateX(0)' }} />
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-700">Personalize subject with first name</span>
                        <span className="text-xs text-gray-400 ml-2">AI adds {`{{ first_name }}`} to subjects</span>
                    </div>
                </label>

                {/* Unsubscribe mode toggle */}
                <label className="flex items-center gap-3 cursor-pointer select-none mt-2 group">
                    <div
                        onClick={() => setFormData({ ...formData, unsubscribe_mode: formData.unsubscribe_mode === 'html' ? 'plain' : 'html' })}
                        className="relative w-9 h-5 rounded-full transition-all shrink-0"
                        style={{ background: formData.unsubscribe_mode === 'html' ? 'linear-gradient(135deg, #2d6bbf, #73C8D2)' : '#d1d5db' }}>
                        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                            style={{ transform: formData.unsubscribe_mode === 'html' ? 'translateX(16px)' : 'translateX(0)' }} />
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-700">Clickable unsubscribe link</span>
                        <span className="text-xs text-gray-400 ml-2">{formData.unsubscribe_mode === 'html' ? 'HTML hyperlink (may affect deliverability)' : 'Plain text reply-based'}</span>
                    </div>
                </label>
            </div>
        </div>
    );
}
