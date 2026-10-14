import TemplatePicker from './TemplatePicker';
import { RefreshCw, Send } from 'lucide-react';

// Reply box: Enter sends, Shift+Enter adds a line; template picker.
export default function ReplyComposer({ inbox }) {
    const {
        activeConversation, handleSend, leadError, replyText, sending, setReplyText
    } = inbox;
    return (
        <div className="shrink-0 p-4 border-t border-gray-100 bg-white">
            {leadError && <p className="text-xs text-red-600 mb-2">{leadError}</p>}
            <form onSubmit={handleSend}>
                <div className="relative rounded-2xl border border-gray-200 bg-gray-50 focus-within:border-blue-400 focus-within:bg-white transition-all">
                    <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Type your reply… (Enter to send, Shift+Enter for new line)"
                        className="w-full bg-transparent px-4 pt-3 pb-12 text-sm text-gray-700 placeholder-gray-400 focus:outline-none resize-none min-h-[90px] max-h-[220px]"
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                    />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <TemplatePicker prospectId={activeConversation?.prospect_id}
                                onPick={text => setReplyText(prev => (prev.trim() ? `${prev}\n\n${text}` : text))} />
                        </div>
                        <button type="submit" disabled={!replyText.trim() || sending}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                            {sending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Send
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
