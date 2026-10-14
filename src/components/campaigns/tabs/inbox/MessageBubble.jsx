import { Check, CheckCheck, Clock, Target, User } from 'lucide-react';
import { Avatar } from './inboxShared';

// One message of the thread: bubble, time, delivery state (outbound) or "Create lead" (replies).
export default function MessageBubble({ m, inbox }) {
    const {
        activeConversation, createLead, leadBusy
    } = inbox;
    const isOut = m.direction === 'OUTBOUND';
    const isBounce = !isOut && (m.subject || '').toLowerCase().includes('delivery failed');

    return (
        <div
            className={`flex ${isOut ? 'justify-end' : 'justify-start'} items-end gap-2`}>
            {!isOut && (
                <Avatar name={isBounce ? 'System' : activeConversation?.prospect_name}
                    email={isBounce ? 'bounce' : activeConversation?.prospect_email} size={28} />
            )}
            <div className={`flex flex-col gap-1 max-w-[72%] ${isOut ? 'items-end' : 'items-start'}`}>
                {isBounce && <span className="text-[10px] font-semibold text-red-500 px-1">Delivery Failed</span>}
                <div className="px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed"
                    style={{
                        overflowWrap: 'anywhere',
                        ...(isOut ? {
                            background: 'linear-gradient(135deg, #2d6bbf, #4a9fd4)',
                            color: '#fff', borderBottomRightRadius: 4,
                            boxShadow: '0 2px 8px rgba(45,107,191,0.25)',
                        } : isBounce ? {
                            background: '#fef2f2', color: '#b91c1c',
                            border: '1px solid #fecaca', borderBottomLeftRadius: 4,
                        } : {
                            background: '#fff', color: '#374151',
                            border: '1px solid #e5e7eb', borderBottomLeftRadius: 4,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }),
                    }}>
                    {m.cleaned_body || '(No content)'}
                </div>
                <div className="flex items-center gap-1 px-1">
                    {m.display_time && (
                        <span className="text-[10px] text-gray-400">
                            {new Date(m.display_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    {isOut && (
                        m.status === 'QUEUED' ? (
                            <Clock className="w-3 h-3" style={{ color: '#9ca3af' }} title="Queued to send" />
                        ) : m.delivered_at ? (
                            <CheckCheck className="w-3 h-3" style={{ color: '#059669' }} title={`Delivered ${new Date(m.delivered_at).toLocaleString()}`} />
                        ) : (
                            <Check className="w-3 h-3" style={{ color: '#2d6bbf' }} title="Sent — delivery not yet confirmed" />
                        )
                    )}
                    {!isOut && !isBounce && m.message_id && (
                        <button type="button" onClick={() => createLead(m.message_id)} disabled={leadBusy === m.message_id}
                            className="ml-1 flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                            title="Turn this reply into a lead">
                            <Target className="w-3 h-3" /> {leadBusy === m.message_id ? 'Creating…' : 'Create lead'}
                        </button>
                    )}
                </div>
            </div>
            {isOut && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                    <User className="w-3.5 h-3.5 text-white" />
                </div>
            )}
        </div>
    );
}
