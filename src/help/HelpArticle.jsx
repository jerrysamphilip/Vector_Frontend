import { Lightbulb, Info } from 'lucide-react';

/** **Label** in help text marks an on-screen label. */
function Rich({ text }) {
    const parts = String(text).split(/\*\*(.+?)\*\*/g);
    return parts.map((p, i) => (i % 2 ? <strong key={i} className="font-semibold text-slate-900">{p}</strong> : p));
}

/** Renders one help article's body blocks. */
export default function HelpArticle({ article, compact = false }) {
    const h = compact ? 'text-sm' : 'text-base';
    return (
        <div className={`text-slate-700 leading-relaxed ${compact ? 'text-[13px] space-y-3' : 'text-sm space-y-4'}`}>
            {article.summary && <p className={`${compact ? 'text-sm' : 'text-[15px]'} text-slate-600`}><Rich text={article.summary} /></p>}
            {(article.body || []).map((b, i) => {
                if (b.h) return <h3 key={i} className={`${h} font-semibold text-slate-900 pt-1`}>{b.h}</h3>;
                if (b.p) return <p key={i}><Rich text={b.p} /></p>;
                if (b.steps) return (
                    <ol key={i} className="space-y-1.5">
                        {b.steps.map((s, j) => (
                            <li key={j} className="flex gap-2.5">
                                <span className="shrink-0 w-5 h-5 mt-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold flex items-center justify-center">{j + 1}</span>
                                <span><Rich text={s} /></span>
                            </li>
                        ))}
                    </ol>
                );
                if (b.list) return (
                    <ul key={i} className="space-y-1.5">
                        {b.list.map((s, j) => (
                            <li key={j} className="flex gap-2">
                                <span className="shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-slate-400" />
                                <span>{typeof s === 'string' ? <Rich text={s} /> : <><strong className="font-semibold text-slate-900">{s.term}</strong> — <Rich text={s.text} /></>}</span>
                            </li>
                        ))}
                    </ul>
                );
                if (b.tip) return (
                    <div key={i} className="flex gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-900">
                        <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" /><span><Rich text={b.tip} /></span>
                    </div>
                );
                if (b.note) return (
                    <div key={i} className="flex gap-2.5 p-3 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-900">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" /><span><Rich text={b.note} /></span>
                    </div>
                );
                return null;
            })}
        </div>
    );
}
