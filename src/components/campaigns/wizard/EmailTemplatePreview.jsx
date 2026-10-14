import { Button } from '../../ui/Button';
import RichTextEditor from '../../common/RichTextEditor';
import AttachmentManager from '../../common/AttachmentManager';
import { sanitizeHtml } from '../../../lib/sanitizeHtml';
import { Eye, Loader2 } from 'lucide-react';

// Step 4: the selected persona's sequence - email tabs, subject/body edit or AI regenerate, live preview
// with sample prospects, attachments.
export default function EmailTemplatePreview({ wizard }) {
    const {
        editValue, editing, formatEmailBodyForPreview, getSampleProspects, getSelectedEmailFromSequence,
        getSelectedTemplate, handleEdit, handleRegenerate, handleSaveEdit, previewProspect, regenerating,
        selectedEmailStep, selectedPersona, setEditValue, setEditing, setPreviewProspect, setSelectedEmailStep,
        setShowPreview, showPreview, substituteProspectData
    } = wizard;
    return (
        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100" style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.05), rgba(115,200,210,0.05))' }}>
                <div>
                    <p className="font-bold text-gray-900 text-base">{getSelectedTemplate()?.persona_label || selectedPersona} Sequence</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{getSelectedTemplate()?.sequence_count || 1} Emails</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className="gap-2 font-bold border-2"
                >
                    <Eye className="w-4 h-4" />
                    {showPreview ? 'Static Code' : 'Live Preview'}
                </Button>
            </div>

            {/* Email Step Tabs */}
            <div className="px-6 py-3 bg-white border-b border-slate-100 flex gap-2 overflow-x-auto custom-scrollbar">
                {(getSelectedTemplate()?.all_emails || [getSelectedTemplate()?.template]).map((email, idx) => {
                    const stepNum = email?.step_number || idx + 1;
                    const schedule = email?.schedule || `Day ${idx + 1}`;
                    return (
                        <button
                            key={stepNum}
                            onClick={() => setSelectedEmailStep(stepNum)}
                            className="px-4 py-1.5 text-xs font-black rounded-full transition-all whitespace-nowrap uppercase tracking-tighter"
                            style={selectedEmailStep === stepNum
                                ? { background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)', color: '#fff' }
                                : { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}
                        >
                            {schedule}
                        </button>
                    );
                })}
            </div>

            <div className="p-6 space-y-6">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject Line</p>
                        <div className="flex items-center gap-3">
                            <button onClick={() => handleEdit('subject')} className="text-[10px] font-bold text-slate-500 hover:text-blue-600 uppercase">Edit</button>
                            <button
                                onClick={() => handleRegenerate('subject')}
                                disabled={regenerating === 'subject'}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase flex items-center gap-1 disabled:opacity-50"
                            >
                                {regenerating === 'subject' ? (
                                    <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                                ) : 'Regenerate'}
                            </button>
                        </div>
                    </div>
                    {editing === 'subject' ? (
                        // <div className="flex gap-2">
                        //     <textarea
                        //         value={editValue}
                        //         onChange={(e) => setEditValue(e.target.value)}
                        //         className="flex-1 w-full h-14 p-4 text-sm border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:ring-0 overflow-auto"
                        //         autoFocus
                        //     />
                        //     <Button size="sm" onClick={() => handleSaveEdit('subject')} className="bg-blue-600 text-white">Save</Button>
                        //     <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                        // </div>
                        <div className="space-y-2">
                            <textarea
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="flex-1 w-full h-14 p-4 text-sm border-2 border-blue-600 rounded-xl focus:border-blue-600 focus:ring-0 focus:outline-none outline-none"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                                <Button size="sm" onClick={() => handleSaveEdit('subject')} className="bg-blue-600 text-white">Save</Button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm font-bold text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            {showPreview && previewProspect
                                ? substituteProspectData(getSelectedEmailFromSequence()?.subject, previewProspect)
                                : getSelectedEmailFromSequence()?.subject
                            }
                        </p>
                    )}
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Blueprint</p>
                        <div className="flex items-center gap-3">

                            <button onClick={() => handleEdit('body')} className="text-[10px] font-bold text-slate-500 hover:text-blue-600 uppercase">Edit</button>
                            <button
                                onClick={() => handleRegenerate('body')}
                                disabled={regenerating === 'body'}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase flex items-center gap-1 disabled:opacity-50"
                            >
                                {regenerating === 'body' ? (
                                    <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                                ) : 'Regenerate'}
                            </button>
                        </div>
                    </div>
                    {editing === 'body' ? (
                        <div className="space-y-3">
                            <RichTextEditor
                                value={editValue}
                                onChange={setEditValue}
                                minHeightClass="min-h-[16rem]"
                                className="border-blue-600"
                            />
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                                <Button size="sm" onClick={() => handleSaveEdit('body')} className="bg-blue-600 text-white">Save</Button>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="text-sm text-gray-700 bg-gray-50 p-6 rounded-xl border border-gray-100 prose prose-sm max-w-none text-left"
                            dangerouslySetInnerHTML={{
                                __html: sanitizeHtml(showPreview && previewProspect
                                    ? formatEmailBodyForPreview(getSelectedEmailFromSequence()?.body, previewProspect)
                                    : formatEmailBodyForPreview(getSelectedEmailFromSequence()?.body))
                            }}
                        />
                    )}

                    {/* Attachments (Gmail-style) */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Attachments</p>
                        <AttachmentManager templateId={getSelectedEmailFromSequence()?.template_id} />
                    </div>
                </div>

                {/* Prospect Picker */}
                {showPreview && getSampleProspects().length > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Active Preview Data:</p>
                        <div className="flex flex-wrap gap-2">
                            {getSampleProspects().map((p, i) => (
                                <button
                                    key={i}
                                    onClick={() => setPreviewProspect(p)}
                                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${previewProspect?.prospect_id === p.prospect_id
                                        ? 'bg-blue-500 text-white shadow-none'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {p.first_name} {p.last_name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
