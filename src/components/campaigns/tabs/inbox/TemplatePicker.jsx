import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { templatesApi } from '../../../../api/sales';
import { stripHtml } from './inboxShared';

/** Pick a library template; it is filled in for this contact and dropped into the reply (BR-SF-10). */
export default function TemplatePicker({ prospectId, onPick }) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState(null);
    const [q, setQ] = useState('');
    const [busy, setBusy] = useState(null);
    useEffect(() => {
        if (open && items === null) templatesApi.list().then(r => setItems(r.items)).catch(() => setItems([]));
    }, [open, items]);
    const pick = async (t) => {
        setBusy(t.template_id);
        try {
            const r = await templatesApi.render(t.template_id, prospectId, true);
            onPick(stripHtml(r.body));
            setOpen(false);
        } finally { setBusy(null); }
    };
    const shown = (items || []).filter(t => !q || `${t.name} ${t.subject}`.toLowerCase().includes(q.toLowerCase()));
    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen(o => !o)} title="Insert a template"
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
                <FileText className="w-4 h-4" /> Templates
            </button>
            {open && (
                <div className="absolute bottom-10 left-0 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-20 p-2">
                    <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search templates…"
                        className="w-full h-8 px-2.5 mb-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400" />
                    <div className="max-h-64 overflow-y-auto">
                        {items === null && <p className="text-xs text-gray-400 p-2">Loading…</p>}
                        {items && !shown.length && <p className="text-xs text-gray-400 p-2">No templates. Add some under Sales → Templates.</p>}
                        {shown.map(t => (
                            <button type="button" key={t.template_id} onClick={() => pick(t)} disabled={!!busy}
                                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                                <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                                <p className="text-[11px] text-gray-400 truncate">{t.category ? `${t.category} · ` : ''}{t.subject}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
