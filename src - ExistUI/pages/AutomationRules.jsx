
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    Plus,
    Trash2,
    Clock,
    Mail,
    PauseCircle,
    PlayCircle,
    ChevronRight,
    Search,
    Filter,
    LayoutList,
    Activity,
    CheckCircle2,
    X
} from 'lucide-react';
import automationApi from '../api/automation';
import { campaignApi } from '../api/campaigns';
import Loading from '../components/common/Loading';

export default function AutomationRules() {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [campaigns, setCampaigns] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        campaign_id: '',
        trigger_type: 'EMAIL_OPENED',
        action_type: 'SEND_EMAIL',
        delay_hours: 1,
        template_id: ''
    });

    useEffect(() => {
        fetchRules();
        fetchCampaigns();
    }, []);

    const fetchRules = async () => {
        try {
            const data = await automationApi.getRules();
            setRules(data);
        } catch (error) {
            console.error('Error fetching automation rules:', error);
        } finally {
            setLoading(false);
        }
    };
    // ... existing fetches ...

    // Stats Calculation
    const stats = {
        total: rules.length,
        active: rules.filter(r => r.is_active).length,
        paused: rules.filter(r => !r.is_active).length
    };

    const getTriggerStyle = (type) => {
        switch (type) {
            case 'EMAIL_OPENED': return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-500' };
            case 'EMAIL_CLICKED': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-500' };
            case 'NO_REPLY': return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-500' };
            default: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-500' };
        }
    };

    const fetchCampaigns = async () => {
        try {
            const data = await campaignApi.list();
            setCampaigns(data.items || []);
        } catch (error) {
            console.error('Error fetching campaigns:', error);
        }
    };

    const fetchTemplates = async (campaignId) => {
        if (!campaignId) return;
        try {
            const data = await campaignApi.getTemplates(campaignId);
            setTemplates(data || []);
        } catch (error) {
            console.error('Error fetching templates:', error);
        }
    };

    const toggleRuleStatus = async (ruleId, currentStatus) => {
        try {
            await automationApi.updateRule(ruleId, { is_active: !currentStatus });
            setRules(rules.map(r => r.rule_id === ruleId ? { ...r, is_active: !currentStatus } : r));
        } catch (error) {
            console.error('Error toggling rule status:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                campaign_id: formData.campaign_id,
                trigger_type: formData.trigger_type,
                trigger_config: { delay_hours: formData.delay_hours },
                action_type: formData.action_type,
                action_config: formData.action_type === 'SEND_EMAIL' ? { template_id: formData.template_id } : {},
                is_active: true
            };

            const newRule = await automationApi.createRule(payload);
            setRules([...rules, newRule]);
            setIsModalOpen(false);
            setFormData({
                name: '',
                campaign_id: '',
                trigger_type: 'EMAIL_OPENED',
                action_type: 'SEND_EMAIL',
                delay_hours: 1,
                template_id: ''
            });
        } catch (error) {
            console.error('Error creating rule:', error);
            alert('Failed to create rule. Please check the fields.');
        }
    };

    const deleteRule = async (ruleId) => {
        if (!window.confirm('Are you sure you want to delete this rule?')) return;
        try {
            await automationApi.deleteRule(ruleId);
            setRules(rules.filter(r => r.rule_id !== ruleId));
        } catch (error) {
            console.error('Error deleting rule:', error);
        }
    };

    const getTriggerIcon = (type) => {
        switch (type) {
            case 'EMAIL_OPENED': return <Mail className="w-4 h-4 text-blue-500" />;
            case 'EMAIL_CLICKED': return <Zap className="w-4 h-4 text-amber-500" />;
            case 'NO_REPLY': return <Clock className="w-4 h-4 text-slate-500" />;
            default: return <Zap className="w-4 h-4 text-blue-500" />;
        }
    };

    const filteredRules = rules.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.trigger_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.trigger_type.replace('_', ' ').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-200">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        Automation Rules
                    </h1>
                    <p className="text-slate-500 mt-1 pl-1">Automate follow-ups and actions based on recipient behavior.</p>
                </div>

                {/* Quick Stats */}
                <div className="flex gap-4">
                    <div className="px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                        <LayoutList className="w-4 h-4 text-slate-400" />
                        <div>
                            <span className="text-sm font-bold text-slate-700">{stats.total}</span>
                            <span className="text-xs text-slate-400 ml-1">Total</span>
                        </div>
                    </div>
                    <div className="px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        <div>
                            <span className="text-sm font-bold text-emerald-700">{stats.active}</span>
                            <span className="text-xs text-emerald-600/70 ml-1">Active</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-200 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Create New Rule
                </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm backdrop-blur-sm bg-white/80">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search rules by name or trigger..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm group-hover:bg-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 flex items-center gap-2 hover:bg-slate-50 transition-colors">
                        <Filter className="w-4 h-4" />
                        Filters
                    </button>
                </div>
            </div>

            {/* Rules List */}
            <div className="grid grid-cols-1 gap-4">
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        <div className="col-span-full">
                            <Loading text="Loading your automations..." />
                        </div>
                    ) : filteredRules.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center"
                        >
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <Zap className="w-10 h-10 text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">No automation rules yet</h3>
                            <p className="text-slate-500 mt-2 max-w-sm mx-auto mb-6">
                                Create your first rule to automatically follow up with leads who open your emails.
                            </p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="px-6 py-2 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-600 rounded-xl font-bold transition-all"
                            >
                                <Plus className="w-4 h-4 inline-block mr-2" />
                                Create First Rule
                            </button>
                        </motion.div>
                    ) : (
                        filteredRules.map((rule, idx) => {
                            const style = getTriggerStyle(rule.trigger_type);
                            return (
                                <motion.div
                                    key={rule.rule_id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`group bg-white p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:shadow-slate-100 hover:translate-y-[-2px] relative overflow-hidden ${rule.is_active ? 'border-slate-200' : 'border-slate-100 opacity-75 grayscale-[0.5]'
                                        }`}
                                >
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.border} opacity-60`}></div>
                                    <div className="flex items-center justify-between gap-6 pl-2">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={`p-3 rounded-xl transition-colors ${style.bg} ${style.text}`}>
                                                {getTriggerIcon(rule.trigger_type)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-bold text-slate-800">{rule.name}</h3>
                                                    {!rule.is_active && (
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-md border border-slate-200">Paused</span>
                                                    )}
                                                    {rule.is_active && (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-md border border-emerald-100">
                                                            <CheckCircle2 className="w-3 h-3" /> Active
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <div className="flex items-center gap-2 py-1 px-3 bg-slate-50 rounded-lg border border-slate-100">
                                                        <span className="text-xs text-slate-400 font-medium lowercase">If</span>
                                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                                                            {rule.trigger_type.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                    <div className="w-4 h-[1px] bg-slate-300"></div>
                                                    <div className="flex items-center gap-2 py-1 px-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-700">
                                                        <Clock className="w-3 h-3" />
                                                        <span className="text-xs font-bold">
                                                            Wait {rule.delay_hours}h
                                                        </span>
                                                    </div>
                                                    <div className="w-4 h-[1px] bg-slate-300"></div>
                                                    <div className="flex items-center gap-2 py-1 px-3 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                                                        <Zap className="w-3 h-3" />
                                                        <span className="text-xs font-bold uppercase">{rule.action_type.replace('_', ' ')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleRuleStatus(rule.rule_id, rule.is_active)}
                                                className={`p-2 rounded-xl transition-all ${rule.is_active
                                                    ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                                    }`}
                                                title={rule.is_active ? "Pause Rule" : "Activate Rule"}
                                            >
                                                {rule.is_active ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                                            </button>
                                            <button
                                                onClick={() => deleteRule(rule.rule_id)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                title="Delete Rule"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })
                    )}
                </AnimatePresence>
            </div>

            {/* Rule Builder Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-blue-600" />
                                    Create Automation Rule
                                </h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <div className="space-y-4">
                                    {/* Rule Name */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Rule Name</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="e.g., Follow up after open"
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>

                                    {/* Campaign Selection */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Target Campaign</label>
                                        <select
                                            required
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            value={formData.campaign_id}
                                            onChange={(e) => {
                                                const cid = e.target.value;
                                                setFormData({ ...formData, campaign_id: cid, template_id: '' });
                                                fetchTemplates(cid);
                                            }}
                                        >
                                            <option value="">Select a campaign...</option>
                                            {campaigns.map(c => (
                                                <option key={c.campaign_id} value={c.campaign_id}>{c.campaign_name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Trigger Type */}
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Trigger</label>
                                            <select
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                value={formData.trigger_type}
                                                onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
                                            >
                                                <option value="EMAIL_OPENED">If Email Opened</option>
                                                <option value="EMAIL_CLICKED">If Email Clicked</option>
                                                <option value="NO_REPLY">If No Reply</option>
                                            </select>
                                        </div>

                                        {/* Delay */}
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Delay (Hours)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                value={formData.delay_hours}
                                                onChange={(e) => setFormData({ ...formData, delay_hours: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 border-dashed flex items-center gap-3">
                                        <ChevronRight className="w-5 h-5 text-blue-500" />
                                        <span className="text-sm font-bold text-blue-700 uppercase tracking-tight">Then Perform Action:</span>
                                    </div>

                                    {/* Action Type */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Action</label>
                                        <select
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-blue-600"
                                            value={formData.action_type}
                                            onChange={(e) => setFormData({ ...formData, action_type: e.target.value })}
                                        >
                                            <option value="SEND_EMAIL">Send AI Template</option>
                                            <option value="PAUSE_CAMPAIGN">Pause Campaign</option>
                                        </select>
                                    </div>

                                    {/* Template Selection (If SEND_EMAIL) */}
                                    {formData.action_type === 'SEND_EMAIL' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                        >
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Select Template</label>
                                            <select
                                                required
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                value={formData.template_id}
                                                onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                                            >
                                                <option value="">Select a template...</option>
                                                {templates.map(t => (
                                                    <option key={t.template_id} value={t.template_id}>{t.subject}</option>
                                                ))}
                                            </select>
                                            {!formData.campaign_id && <p className="text-[10px] text-amber-600 mt-1 font-medium">* Select a campaign first to see templates</p>}
                                        </motion.div>
                                    )}
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-3 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-200"
                                    >
                                        Create Rule
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
