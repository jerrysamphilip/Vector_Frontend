import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    Mail,
    User,
    Building2,
    Briefcase,
    Copy,
    Check,
    RefreshCw,
    Layers,
    Target,
    AlertTriangle,
    Shield,
    Calendar,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { aiEmailApi } from '../api/aiEmail';
import PageTransition, { containerVariants, itemVariants } from '../components/layout/PageTransition';
import Loading from '../components/common/Loading';

export default function AIEmailGenerator() {
    const [designation, setDesignation] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [productName, setProductName] = useState('OutreachAI');
    const [productDescription, setProductDescription] = useState('');
    const [classification, setClassification] = useState(null);
    const [sequence, setSequence] = useState(null);
    const [compliance, setCompliance] = useState(null);
    const [copied, setCopied] = useState(null);
    const [expandedEmail, setExpandedEmail] = useState(1);
    const [activeTab, setActiveTab] = useState('single'); // single | sequence

    // Fetch blueprints
    const { data: blueprints = [], isLoading: blueprintsLoading } = useQuery({
        queryKey: ['blueprints'],
        queryFn: () => aiEmailApi.getBlueprints(),
    });

    // Classification mutation
    const classifyMutation = useMutation({
        mutationFn: ({ designation, companyName }) =>
            aiEmailApi.classifyTest(designation, companyName),
        onSuccess: (data) => {
            setClassification(data);
        },
    });

    // Compliance check mutation
    const complianceMutation = useMutation({
        mutationFn: ({ subject, body }) =>
            aiEmailApi.checkCompliance(subject, body),
        onSuccess: (data) => {
            setCompliance(data);
        },
    });

    // Check compliance when sequence changes
    useEffect(() => {
        if (sequence?.email_1?.subject && sequence?.email_1?.body) {
            complianceMutation.mutate({
                subject: sequence.email_1.subject,
                body: sequence.email_1.body
            });
        }
    }, [sequence]);

    // Handle classification
    const handleClassify = () => {
        if (!designation.trim()) return;
        classifyMutation.mutate({ designation, companyName });
        setSequence(null);
        setCompliance(null);
    };

    // Generate sequence (mock for now since we need prospect_id)
    const handleGenerateSequence = () => {
        // Create mock sequence based on classification
        const mockSequence = {
            email_1: {
                subject: `Quick question for ${companyName || 'you'}`,
                body: `Hi there,\n\n` +
                    (classification?.persona_type === 'TECHNICAL'
                        ? 'Many engineering teams struggle to keep tests in sync as codebases evolve.'
                        : 'As teams scale, efficiency becomes a key differentiator.') +
                    `\n\n${productName} helps teams achieve better results with less effort.\n\nWorth a quick look?\n\nBest,\n[Your name]`,
                cta: 'Worth a quick look?'
            },
            email_2: {
                subject: `Following up, {{first_name}}`,
                body: `Hi there,\n\nWanted to circle back on my previous note.\n\n` +
                    `Happy to share how ${productName} could help.\n\nDid this land on your radar?\n\nBest,\n[Your name]`,
                cta: 'Did this land on your radar?'
            },
            email_3: {
                subject: `Last thought`,
                body: `Hi there,\n\nI'll keep this brief - I know you're busy.\n\n` +
                    `If ${productName} isn't right for ${companyName || 'your team'} right now, no worries at all.\n\n` +
                    `Should I close the loop?\n\nBest,\n[Your name]`,
                cta: 'Should I close the loop?'
            },
            schedule: {
                email_1: { day: 1, purpose: 'Introduction' },
                email_2: { day: 3, purpose: 'Reminder' },
                email_3: { day: 7, purpose: 'Last Chance' }
            },
            generation_method: 'BLUEPRINT',
            persona_type: classification?.persona_type || 'OTHER'
        };
        setSequence(mockSequence);
    };

    // Handle copy to clipboard
    const handleCopy = (emailNum) => {
        if (sequence?.[`email_${emailNum}`]) {
            const email = sequence[`email_${emailNum}`];
            const text = `Subject: ${email.subject}\n\n${email.body}`;
            navigator.clipboard.writeText(text);
            setCopied(emailNum);
            setTimeout(() => setCopied(null), 2000);
        }
    };

    // Get persona badge color
    const getPersonaColor = (type) => {
        const colors = {
            PATIENT_SERVICES_HUB: 'bg-purple-100 text-purple-700',
            MARKET_ACCESS: 'bg-blue-100 text-blue-700',
            OPERATIONS_PHARMACY: 'bg-green-100 text-green-700',
            TECHNOLOGY_DATA_DIGITAL: 'bg-cyan-100 text-cyan-700',
            INNOVATION_STRATEGY_PRODUCT: 'bg-pink-100 text-pink-700',
            OTHER: 'bg-gray-100 text-gray-700',
        };
        return colors[type] || colors.OTHER;
    };

    // Get compliance status color
    const getComplianceColor = (status) => {
        const colors = {
            passed: 'text-green-600 bg-green-50 border-green-200',
            warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
            failed: 'text-red-600 bg-red-50 border-red-200',
        };
        return colors[status] || colors.warning;
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 p-6">
                <motion.div
                    initial="hidden"
                    animate="show"
                    variants={containerVariants}
                    className="max-w-7xl mx-auto space-y-6"
                >
                    {/* Header */}
                    <motion.div variants={itemVariants} className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                                <Sparkles className="w-8 h-8 text-blue-500" />
                                AI Email Generator
                            </h1>
                            <p className="mt-2 text-slate-500">
                                Generate personalized cold emails and sequences using AI
                            </p>
                        </div>

                        {/* Tab Switcher */}
                        <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                            <button
                                onClick={() => setActiveTab('single')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'single'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                Single Email
                            </button>
                            <button
                                onClick={() => setActiveTab('sequence')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'sequence'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                3-Email Sequence
                            </button>
                        </div>
                    </motion.div>

                    {/* Main Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Left Panel - Input */}
                        <motion.div variants={itemVariants} className="space-y-6">

                            {/* Prospect Info Card */}
                            <div className="card border border-slate-200 bg-white p-6 shadow-sm rounded-xl">
                                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Prospect Information
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1.5">
                                            <Briefcase className="w-3.5 h-3.5 inline mr-1" />
                                            Designation / Job Title
                                        </label>
                                        <input
                                            type="text"
                                            value={designation}
                                            onChange={(e) => setDesignation(e.target.value)}
                                            placeholder="e.g. Senior Backend Engineer"
                                            className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1.5">
                                            <Building2 className="w-3.5 h-3.5 inline mr-1" />
                                            Company Name
                                        </label>
                                        <input
                                            type="text"
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            placeholder="e.g. TechCorp"
                                            className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1.5">
                                            <Target className="w-3.5 h-3.5 inline mr-1" />
                                            Product Name
                                        </label>
                                        <input
                                            type="text"
                                            value={productName}
                                            onChange={(e) => setProductName(e.target.value)}
                                            placeholder="Your product name"
                                            className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition"
                                        />
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleClassify}
                                    disabled={!designation.trim() || classifyMutation.isPending}
                                    className="mt-6 w-full h-11 rounded-lg text-white font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                                >
                                    {classifyMutation.isPending ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Sparkles className="w-4 h-4" />
                                    )}
                                    Classify Persona
                                </motion.button>
                            </div>

                            {/* Classification Result */}
                            {classification && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="card border border-slate-200 bg-white p-6 shadow-sm rounded-xl"
                                >
                                    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                        <Layers className="w-4 h-4" />
                                        Classification Result
                                    </h3>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Persona Type</p>
                                            <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-medium ${getPersonaColor(classification.persona_type)}`}>
                                                {classification.persona_type}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500 mb-1">Confidence</p>
                                            <span className="text-2xl font-bold text-slate-800">
                                                {(classification.confidence_score * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>

                                    {activeTab === 'sequence' && (
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleGenerateSequence}
                                            className="mt-4 w-full h-10 rounded-lg text-white font-medium bg-emerald-600 hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                                        >
                                            <Calendar className="w-4 h-4" />
                                            Generate 3-Email Sequence
                                        </motion.button>
                                    )}
                                </motion.div>
                            )}

                            {/* Compliance Status */}
                            {compliance && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`card border p-4 shadow-sm rounded-xl ${getComplianceColor(compliance.status)}`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <Shield className="w-4 h-4" />
                                        <span className="text-sm font-semibold">Compliance Check</span>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Spam Score:</span>
                                            <span className="font-medium">{compliance.spam_score}/100</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Unsubscribe Link:</span>
                                            <span>{compliance.has_unsubscribe_link ? '✅' : '❌'}</span>
                                        </div>
                                        {compliance.spam_triggers?.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-current/20">
                                                <p className="text-xs opacity-80">Flagged: {compliance.spam_triggers.join(', ')}</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>

                        {/* Right Panel - Generated Content */}
                        <motion.div variants={itemVariants} className="lg:col-span-2">
                            <div className="card border border-slate-200 bg-white p-6 shadow-sm rounded-xl h-full">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        {activeTab === 'sequence' ? '3-Email Sequence' : 'Generated Email'}
                                    </h3>
                                </div>

                                {!classification ? (
                                    <div className="h-80 flex flex-col items-center justify-center text-center text-slate-400">
                                        <Sparkles className="w-12 h-12 mb-3 opacity-50" />
                                        <p className="text-sm">Enter prospect details and click Classify</p>
                                    </div>
                                ) : activeTab === 'sequence' && sequence ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map((num) => (
                                            <motion.div
                                                key={num}
                                                className="border border-slate-200 rounded-lg overflow-hidden"
                                            >
                                                <button
                                                    onClick={() => setExpandedEmail(expandedEmail === num ? null : num)}
                                                    className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${num === 1 ? 'bg-blue-100 text-blue-700' :
                                                            num === 2 ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                            {num}
                                                        </span>
                                                        <div className="text-left">
                                                            <p className="text-sm font-medium text-slate-800">
                                                                {sequence.schedule[`email_${num}`]?.purpose}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                Day {sequence.schedule[`email_${num}`]?.day}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {expandedEmail === num ? (
                                                        <ChevronUp className="w-4 h-4 text-slate-400" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                                    )}
                                                </button>

                                                <AnimatePresence>
                                                    {expandedEmail === num && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="px-4 py-3 bg-white"
                                                        >
                                                            <div className="flex justify-between items-center mb-2">
                                                                <p className="text-xs text-slate-500">Subject</p>
                                                                <button
                                                                    onClick={() => handleCopy(num)}
                                                                    className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1"
                                                                >
                                                                    {copied === num ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                                    {copied === num ? 'Copied!' : 'Copy'}
                                                                </button>
                                                            </div>
                                                            <p className="font-medium text-slate-800 mb-3">
                                                                {sequence[`email_${num}`]?.subject}
                                                            </p>
                                                            <p className="text-xs text-slate-500 mb-1">Body</p>
                                                            <div className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg">
                                                                {sequence[`email_${num}`]?.body}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        ))}

                                        {/* Generation method badge */}
                                        <div className="flex items-center gap-2 text-xs text-slate-400 pt-2">
                                            <span>Method: {sequence.generation_method}</span>
                                            <span>•</span>
                                            <span>Persona: {sequence.persona_type}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                                            <p className="text-xs text-slate-500">Subject</p>
                                            <p className="font-medium text-slate-800">
                                                Quick question for {companyName || 'you'}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-white min-h-[200px]">
                                            <div className="prose prose-sm max-w-none text-slate-600">
                                                <p>Hi there,</p>
                                                <br />
                                                <p>
                                                    {classification.persona_type === 'TECHNICAL'
                                                        ? 'Many engineering teams struggle to keep tests in sync as codebases evolve.'
                                                        : classification.persona_type === 'DECISION_MAKER'
                                                            ? 'As engineering teams scale, test maintenance often slows delivery and increases overhead.'
                                                            : 'I wanted to share something that might be useful for your team.'
                                                    }
                                                </p>
                                                <br />
                                                <p>
                                                    {productName} helps {classification.persona_type === 'TECHNICAL'
                                                        ? 'reduce test maintenance overhead by 60%'
                                                        : 'accelerate release cycles without compromising quality'
                                                    }.
                                                </p>
                                                <br />
                                                <p>Worth a quick look?</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Blueprints Grid */}
                    <motion.div variants={itemVariants} className="card border border-slate-200 bg-white p-6 shadow-sm rounded-xl">
                        <h3 className="text-sm font-semibold text-slate-700 mb-4">
                            Available Persona Blueprints ({blueprints.length})
                        </h3>

                        {blueprintsLoading ? (
                            <div className="h-20 flex items-center justify-center">
                                <Loading size="sm" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                                {blueprints.map((bp) => (
                                    <motion.div
                                        key={bp.blueprint_id}
                                        whileHover={{ scale: 1.05 }}
                                        className={`p-3 rounded-lg text-center cursor-default ${getPersonaColor(bp.persona_type)}`}
                                    >
                                        <p className="text-xs font-medium truncate">{bp.persona_type}</p>
                                        <p className="text-[10px] mt-1 opacity-70">
                                            {bp.openers?.length || 0} openers
                                        </p>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            </div>
        </PageTransition>
    );
}
