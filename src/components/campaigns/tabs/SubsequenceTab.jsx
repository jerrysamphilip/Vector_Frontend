import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sequenceApi, campaignApi, templateApi } from '../../../api/campaigns';
import { Clock, Mail, MoreHorizontal, RefreshCw, Sparkles, Check, X, ChevronDown, ChevronUp, AlertCircle, Edit2, Plus, Trash2, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '../../layout/PageTransition';
import Loading from '../../common/Loading';
import RichTextEditor from '../../common/RichTextEditor';
import AttachmentManager from '../../common/AttachmentManager';
import { sanitizeHtml, htmlToText } from '../../../lib/sanitizeHtml';

export default function SubsequenceTab({ campaignId }) {
    const queryClient = useQueryClient();
    const [expandedStep, setExpandedStep] = useState(null);
    const [regeneratingId, setRegeneratingId] = useState(null);

    // Fetch sequences
    const { data: sequencesData, isLoading: seqLoading } = useQuery({
        queryKey: ['campaign-sequences', campaignId],
        queryFn: () => sequenceApi.list(campaignId),
    });

    // Fetch templates with AI metadata
    const { data: templatesData, isLoading: templLoading } = useQuery({
        queryKey: ['campaign-templates', campaignId],
        queryFn: () => campaignApi.getTemplates(campaignId),
    });

    // Regeneration mutation
    const regenerateMutation = useMutation({
        mutationFn: ({ templateId, options }) =>
            campaignApi.regenerateTemplate(campaignId, templateId, options),
        onSuccess: () => {
            queryClient.invalidateQueries(['campaign-templates', campaignId]);
            setRegeneratingId(null);
        },
        onError: (error) => {
            console.error('Regeneration failed:', error);
            setRegeneratingId(null);
        }
    });

    // Approval mutation
    const [approvingId, setApprovingId] = useState(null);
    const approveMutation = useMutation({
        mutationFn: (templateId) => campaignApi.approveTemplate(campaignId, templateId),
        onSuccess: () => {
            queryClient.invalidateQueries(['campaign-templates', campaignId]);
            setApprovingId(null);
        },
        onError: (error) => {
            console.error('Approval failed:', error);
            setApprovingId(null);
        }
    });

    // Approve all mutation
    const approveAllMutation = useMutation({
        mutationFn: () => campaignApi.approveAllTemplates(campaignId),
        onSuccess: () => {
            queryClient.invalidateQueries(['campaign-templates', campaignId]);
        },
    });

    // Edit sequence state
    const [editingSequence, setEditingSequence] = useState(null); // 'all' or null

    // Update sequence mutation
    const updateSequenceMutation = useMutation({
        mutationFn: ({ sequenceId, waitDays }) => sequenceApi.update(sequenceId, { wait_days: waitDays }),
        onSuccess: () => {
            queryClient.invalidateQueries(['campaign-sequences', campaignId]);
        },
    });

    // Manual template content editing (subject/body) — supported by the backend
    // at any campaign status, just wasn't wired into this tab before.
    const [editingTemplateId, setEditingTemplateId] = useState(null);
    const [editSubject, setEditSubject] = useState('');
    const [editBody, setEditBody] = useState('');

    const updateTemplateMutation = useMutation({
        mutationFn: ({ templateId, subject, body }) => templateApi.update(templateId, { subject, body }),
        onSuccess: () => {
            queryClient.invalidateQueries(['campaign-templates', campaignId]);
            setEditingTemplateId(null);
        },
        onError: (error) => {
            alert(`❌ Error saving template: ${error.response?.data?.detail || error.message}`);
        }
    });

    const startEditingTemplate = (template) => {
        setEditingTemplateId(template.template_id);
        setEditSubject(template.subject || '');
        const body = template.body || '';
        setEditBody(hasHtmlTags(body) ? body : plainTextToHtml(body));
    };

    const saveTemplateEdit = () => {
        updateTemplateMutation.mutate({ templateId: editingTemplateId, subject: editSubject, body: editBody });
    };

    const handleRegenerate = async (templateId) => {
        setRegeneratingId(templateId);
        regenerateMutation.mutate({
            templateId,
            options: {
                tone: 'professional',
                regenerateSubject: true,
                regenerateBody: true,
                creativeEmail: true,
                customInstruction: 'Avoid generic outreach phrasing. Write specific, concrete, and standout copy.'
            }
        });
    };

    const handleApprove = async (templateId) => {
        setApprovingId(templateId);
        approveMutation.mutate(templateId);
    };

    const handleApproveAll = async () => {
        approveAllMutation.mutate();
    };

    // Build steps with template info
    // Templates come from /templates endpoint with full data
    // Handle both wrapped {templates: []} and unwrapped [] responses
    const templates = Array.isArray(templatesData) ? templatesData : (templatesData?.templates || []);
    // Sequence steps come from /sequences endpoint
    const sequenceSteps = sequencesData?.steps || [];

    // Log data for debugging
    console.log('Sequences:', sequencesData);
    console.log('Templates:', templatesData);

    // Combine sequence steps with their templates
    const steps = sequenceSteps.map(seq => {
        // First try to find template by sequence_id (most accurate)
        let matchingTemplate = templates.find(t => t.sequence_id === seq.sequence_id);

        // Fallback: try by step_number
        if (!matchingTemplate) {
            matchingTemplate = templates.find(t => t.step_number === seq.step_number);
        }

        // If template found, use it; otherwise use inline info from sequence API
        const template = matchingTemplate || (seq.template_id ? {
            template_id: seq.template_id,
            subject: seq.template_subject || 'No Subject',
            body: '(Template body not loaded - check template endpoint)',
        } : null);

        return {
            ...seq,
            template
        };
    });

    const stripHtml = (html) => {
        if (!html) return '';

        return htmlToText(html);
    };

    const hasHtmlTags = (value) => /<[^>]+>/.test(value || '');

    // The rich text editor works in HTML; wrap legacy plain-text bodies once so
    // line breaks aren't lost when they're first loaded into the editor.
    const plainTextToHtml = (text) => {
        if (!text) return '';

        const blocks = [];
        let bulletBuffer = [];
        const flushBullets = () => {
            if (bulletBuffer.length) {
                blocks.push(`<ul>${bulletBuffer.map(item => `<li>${item}</li>`).join('')}</ul>`);
                bulletBuffer = [];
            }
        };

        text.split('\n').forEach((line) => {
            const trimmed = line.trim();
            if (/^[•\-*]\s+/.test(trimmed)) {
                bulletBuffer.push(trimmed.replace(/^[•\-*]\s+/, '').trim());
                return;
            }
            flushBullets();
            if (trimmed !== '') blocks.push(`<p>${line}</p>`);
        });
        flushBullets();

        return blocks.join('');
    };

    // Show loading
    if (seqLoading || templLoading) {
        return <Loading text="Loading sequence..." size="md" />;
    }

    // No sequences at all
    if (sequenceSteps.length === 0) {
        return (
            <div
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
                <div
                    className="flex items-center gap-3 px-5 py-4"
                    style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}
                >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}>
                        <Mail className="w-4 h-4" style={{ color: '#2d6bbf' }} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">Campaign Sequence</p>
                        <p className="text-xs text-gray-400">No steps yet</p>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.1), rgba(115,200,210,0.1))' }}>
                        <Mail className="w-7 h-7" style={{ color: '#2d6bbf' }} />
                    </div>
                    <h3 className="text-base font-semibold text-gray-800 mb-1">No Sequence Steps</h3>
                    <p className="text-sm text-gray-400 max-w-sm">
                        This campaign doesn't have any sequence steps yet.<br />
                        Create steps using the Campaign Wizard to add email sequences.
                    </p>
                </div>
            </div>
        );
    }

    // Show steps (even without templates - but indicate they need to be generated)

    return (
        <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
            {/* Section Header */}
            <div
                className="flex justify-between items-center px-5 py-4"
                style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}>
                        <Mail className="w-4 h-4" style={{ color: '#2d6bbf' }} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">Campaign Sequence</p>
                        <p className="text-xs text-gray-400">{steps.length} step{steps.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        onClick={() => {
                            steps.forEach(step => {
                                if (step.template?.template_id) handleRegenerate(step.template.template_id);
                            });
                        }}
                        disabled={regeneratingId !== null}
                    >
                        <Sparkles className="w-3 h-3" /> Regenerate All
                    </button>
                    <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        onClick={handleApproveAll}
                        disabled={approveAllMutation.isPending}
                    >
                        <Check className="w-3 h-3" /> {approveAllMutation.isPending ? 'Approving...' : 'Approve All'}
                    </button>
                    <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all hover:shadow-md"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                        onClick={() => setEditingSequence(editingSequence ? null : 'all')}
                    >
                        {editingSequence ? 'Done Editing' : 'Edit Sequence'}
                    </button>
                </div>
            </div>

            <div className="p-6">
            <div className="space-y-8 relative pl-4">
                <div className="absolute left-[27px] top-4 bottom-4 w-[2px] bg-slate-100" />

                {steps.map((step, index) => (
                    <motion.div variants={itemVariants} key={index} className="relative flex gap-6">
                        {/* Step Circle */}
                        <div className="z-10 w-14 h-14 rounded-full bg-white border-2 border-slate-100 flex flex-col items-center justify-center text-slate-500 shadow-sm">
                            <span className="text-xs font-bold text-slate-400">STEP</span>
                            <span className="text-lg font-bold text-slate-800">{step.step_number}</span>
                        </div>

                        {/* Content Card */}
                        <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors group">
                            {/* Header */}
                            <div className="p-5 pb-3">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-600 flex items-center gap-1">
                                            <Mail className="w-3 h-3" /> Email
                                        </span>

                                        {/* Editable wait_days when in edit mode */}
                                        {editingSequence === 'all' && step.step_number > 1 ? (
                                            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded">
                                                <Clock className="w-3 h-3 text-blue-500" />
                                                <span className="text-xs text-blue-600">Wait</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="30"
                                                    defaultValue={step.wait_days}
                                                    onBlur={(e) => {
                                                        const newDays = parseInt(e.target.value) || 1;
                                                        if (newDays !== step.wait_days) {
                                                            updateSequenceMutation.mutate({
                                                                sequenceId: step.sequence_id,
                                                                waitDays: newDays
                                                            });
                                                        }
                                                    }}
                                                    className="w-12 h-5 text-xs text-center border border-blue-300 rounded bg-white"
                                                />
                                                <span className="text-xs text-blue-600">days</span>
                                            </div>
                                        ) : step.wait_days > 0 ? (
                                            <span className="px-2 py-1 bg-amber-50 border border-amber-100 rounded text-xs font-medium text-amber-600 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> Wait {step.wait_days} days
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-emerald-50 border border-emerald-100 rounded text-xs font-medium text-emerald-600">
                                                Immediate
                                            </span>
                                        )}
                                        {step.template?.is_ai_generated && (
                                            <span className="px-2 py-1 bg-purple-50 border border-purple-100 rounded text-xs font-medium text-purple-600 flex items-center gap-1">
                                                <Sparkles className="w-3 h-3" /> AI Generated
                                            </span>
                                        )}
                                        {step.template?.is_approved ? (
                                            <span className="px-2 py-1 bg-emerald-50 border border-emerald-100 rounded text-xs font-medium text-emerald-600 flex items-center gap-1">
                                                <Check className="w-3 h-3" /> Approved
                                            </span>
                                        ) : step.template && (
                                            <span className="px-2 py-1 bg-orange-50 border border-orange-100 rounded text-xs font-medium text-orange-600">
                                                Pending Approval
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {step.template && editingTemplateId !== step.template.template_id && (
                                            <>
                                                <button
                                                    onClick={() => startEditingTemplate(step.template)}
                                                    className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                                                >
                                                    <Edit2 className="w-3 h-3" /> Edit
                                                </button>
                                                <button
                                                    onClick={() => handleRegenerate(step.template.template_id)}
                                                    disabled={regeneratingId === step.template?.template_id}
                                                    className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                                                >
                                                    <RefreshCw className={`w-3 h-3 ${regeneratingId === step.template?.template_id ? 'animate-spin' : ''}`} />
                                                    {regeneratingId === step.template?.template_id ? 'Regenerating...' : 'Regenerate'}
                                                </button>
                                                {!step.template.is_approved && (
                                                    <button
                                                        onClick={() => handleApprove(step.template.template_id)}
                                                        disabled={approvingId === step.template?.template_id}
                                                        className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                                                    >
                                                        <Check className="w-3 h-3" />
                                                        {approvingId === step.template?.template_id ? 'Approving...' : 'Approve'}
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        {!(step.template && editingTemplateId === step.template.template_id) && (
                                            <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-4 h-4" /></button>
                                        )}
                                    </div>
                                </div>

                                {step.template && editingTemplateId === step.template.template_id ? (
                                    /* Manual edit form — subject + body, saved via PUT /templates/{id} */
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={editSubject}
                                            onChange={(e) => setEditSubject(e.target.value)}
                                            placeholder="Subject"
                                            className="w-full px-3 py-2 text-sm font-semibold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                                        />
                                        <RichTextEditor
                                            value={editBody}
                                            onChange={setEditBody}
                                            placeholder="Email body"
                                            minHeightClass="min-h-[10rem]"
                                        />
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Attachments</p>
                                            <AttachmentManager templateId={step.template.template_id} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={saveTemplateEdit}
                                                disabled={updateTemplateMutation.isPending}
                                                className="text-xs px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                                            >
                                                <Save className="w-3 h-3" />
                                                {updateTemplateMutation.isPending ? 'Saving...' : 'Save'}
                                            </button>
                                            <button
                                                onClick={() => setEditingTemplateId(null)}
                                                disabled={updateTemplateMutation.isPending}
                                                className="text-xs px-3 py-1.5 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1 transition-colors"
                                            >
                                                <X className="w-3 h-3" /> Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Subject Line - always visible */}
                                        <h4 className="font-semibold text-slate-900 mb-1">{step.template?.subject || "No Subject"}</h4>

                                        {/* Body preview - only when collapsed */}
                                        {expandedStep !== index && (
                                            <p className="text-sm text-slate-500 line-clamp-2">{stripHtml(step.template?.body)?.substring(0, 120) || "No content..."}...</p>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Expandable Template Content */}
                            {step.template && editingTemplateId !== step.template.template_id && (
                                <>
                                    <button
                                        onClick={() => setExpandedStep(expandedStep === index ? null : index)}
                                        className="w-full px-5 py-2 border-t border-slate-200/50 text-xs text-slate-500 hover:bg-slate-100/50 flex items-center justify-center gap-1 transition-colors"
                                    >
                                        {expandedStep === index ? (
                                            <><ChevronUp className="w-4 h-4" /> Hide Template</>
                                        ) : (
                                            <><ChevronDown className="w-4 h-4" /> View Full Template</>
                                        )}
                                    </button>

                                    {expandedStep === index && (
                                        <div className="px-5 pb-5 pt-3 border-t border-slate-200/50 bg-slate-50/80">
                                            <div className="space-y-4">
                                                {/* Email Body */}
                                                <div className="p-4 bg-white rounded-lg border border-slate-200">
                                                    <div
                                                        className="text-sm text-slate-700 leading-relaxed"
                                                        dangerouslySetInnerHTML={{
                                                            __html: sanitizeHtml(step.template.body?.replace(/\n/g, '<br />'))
                                                        }}
                                                    />
                                                </div>

                                                {/* Metadata footer */}
                                                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                                                    <span>
                                                        {step.template.ai_model && <>Model: {step.template.ai_model}</>}
                                                        {step.template.tone && <> • Tone: {step.template.tone}</>}
                                                    </span>
                                                    {step.template.is_approved && (
                                                        <span className="text-emerald-600 font-medium">✓ Approved</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
            </div>
        </motion.div>
    );
}
