import { AlertCircle, Check, Loader2, Mail } from 'lucide-react';

// Step 1 "Sender Rotation Pool": the inboxes the campaign rotates through.
export default function SenderPoolSection({ wizard }) {
    const {
        errors, formData, inboxes, inboxesLoading, setFormData
    } = wizard;
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #FF901322, #cc6f0022)' }}>
                        <Mail className="w-3.5 h-3.5" style={{ color: '#FF9013' }} />
                    </div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sender Rotation Pool</span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: formData.inbox_ids.length > 0 ? 'rgba(45,107,191,0.08)' : 'rgba(239,68,68,0.08)', color: formData.inbox_ids.length > 0 ? '#2d6bbf' : '#ef4444' }}>
                    {formData.inbox_ids.length} selected
                </span>
            </div>

            <div className="border border-gray-100 rounded-xl overflow-hidden bg-white"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="max-h-[240px] overflow-y-auto divide-y divide-gray-50">
                    {inboxesLoading && (
                        <div className="px-4 py-5 flex items-center gap-2 text-sm text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                            Loading sender inboxes...
                        </div>
                    )}
                    {!inboxesLoading && (!inboxes || inboxes.length === 0) && (
                        <div className="px-4 py-5 text-sm text-gray-500">
                            No sender inboxes found. Add inboxes from Email Accounts first.
                        </div>
                    )}
                    {!inboxesLoading && inboxes?.map(inbox => {
                        const isSelected = formData.inbox_ids.includes(inbox.inbox_id);
                        return (
                            <div
                                key={inbox.inbox_id}
                                onClick={() => {
                                    const ids = [...formData.inbox_ids];
                                    setFormData({ ...formData, inbox_ids: isSelected ? ids.filter(id => id !== inbox.inbox_id) : [...ids, inbox.inbox_id] });
                                }}
                                className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all"
                                style={{ background: isSelected ? 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.04))' : 'transparent' }}
                                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafaf9'; }}
                                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                            >
                                {/* Custom checkbox */}
                                <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all border"
                                    style={isSelected
                                        ? { background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)', borderColor: 'transparent' }
                                        : { background: '#fff', borderColor: '#d1d5db' }}>
                                    {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                </div>

                                {/* Email + status */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                                            {inbox.email_address}
                                        </p>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${inbox.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {inbox.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Provider pill */}
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                                    style={{ background: 'rgba(0,0,0,0.04)', color: '#6b7280' }}>
                                    {inbox.provider || 'SMTP'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
            {errors.inboxes && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{errors.inboxes}
                </p>
            )}
        </div>
    );
}
