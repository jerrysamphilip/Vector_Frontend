import { Avatar, fmtDate, getConvType, CONV_TYPE_META } from './inboxShared';

// One conversation in the list: contact, type (reply / sent / bounce), subject, snippet, unread dot.
export default function ConversationListItem({ c, inbox }) {
    const {
        selectedId, setSelectedId
    } = inbox;
    const isActive = selectedId === c.id;
    const convType = getConvType(c);
    const meta = CONV_TYPE_META[convType];
    const TypeIcon = meta.Icon;

    return (
        <button
            onClick={() => setSelectedId(c.id)}
            className="w-full text-left px-4 py-3 transition-all relative"
            style={{
                background: isActive
                    ? 'linear-gradient(90deg, rgba(45,107,191,0.08), rgba(115,200,210,0.06))'
                    : 'transparent',
                borderLeft: isActive ? '3px solid #2d6bbf' : '3px solid transparent',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.025)'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
        >
            <div className="flex items-start gap-3">
                <div className="relative">
                    <Avatar name={c.prospect_name} email={c.prospect_email} size={36} />
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white"
                        style={{ background: meta.bg }}>
                        <TypeIcon className="w-2 h-2" style={{ color: meta.color }} />
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                        <span className={`text-xs font-semibold truncate ${c.is_unread ? 'text-gray-900' : 'text-gray-600'}`}>
                            {c.prospect_name || c.prospect_email}
                        </span>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2 shrink-0">
                            {fmtDate(c.last_message_at)}
                        </span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">{c.subject}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: meta.bg, color: meta.color }}>
                            {meta.label}
                        </span>
                        {c.last_message_snippet && (
                            <p className="text-[11px] text-gray-400 truncate italic flex-1">
                                {c.last_message_snippet}
                            </p>
                        )}
                    </div>
                </div>
                {c.is_unread && (
                    <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: '#2d6bbf' }} />
                )}
            </div>
        </button>
    );
}
