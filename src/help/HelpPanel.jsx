import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Search, ArrowLeft, BookOpen, ExternalLink, Keyboard } from 'lucide-react';
import HelpArticle from './HelpArticle';
import { articleById, articleForPath, searchHelp } from './helpIndex';

const HelpContext = createContext({ open: false, openHelp: () => {}, closeHelp: () => {} });
export const useHelp = () => useContext(HelpContext);

const typing = (el) => el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable);

/** Help available everywhere: ? or F1 opens help for the current screen. */
export function HelpProvider({ children }) {
    const [state, setState] = useState({ open: false, articleId: null });
    const openHelp = useCallback((articleId = null) => setState({ open: true, articleId }), []);
    const closeHelp = useCallback(() => setState(s => ({ ...s, open: false })), []);
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'F1') { e.preventDefault(); setState(s => ({ open: !s.open, articleId: null })); return; }
            if (e.key === '?' && !typing(e.target) && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setState(s => ({ open: !s.open, articleId: null })); return; }
            if (e.key === 'Escape') setState(s => (s.open ? { ...s, open: false } : s));
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
    const value = useMemo(() => ({ ...state, openHelp, closeHelp }), [state, openHelp, closeHelp]);
    return (
        <HelpContext.Provider value={value}>
            {children}
            {state.open && <HelpPanel initialId={state.articleId} onClose={closeHelp} />}
        </HelpContext.Provider>
    );
}

function HelpPanel({ initialId, onClose }) {
    const location = useLocation();
    const screenArticle = articleForPath(location.pathname);
    const [stack, setStack] = useState(() => [initialId ? articleById(initialId) || screenArticle : screenArticle]);
    const [query, setQuery] = useState('');
    // Follow the screen while the panel stays open
    useEffect(() => { if (!initialId) { setStack([articleForPath(location.pathname)]); setQuery(''); } }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps
    const article = stack[stack.length - 1];
    const results = query.trim() ? searchHelp(query) : null;
    const show = (a) => { setStack(s => [...s, a]); setQuery(''); };

    return (
        <aside role="dialog" aria-label="Help" className="fixed top-14 right-0 bottom-0 w-[420px] max-w-full z-40 bg-white border-l border-slate-200 shadow-2xl flex flex-col">
            <div className="h-1 w-full shrink-0" style={{ background: 'linear-gradient(90deg, #2d6bbf, #73C8D2)' }} />
            <div className="px-4 pt-3 pb-3 border-b border-slate-100 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900 flex items-center gap-2"><BookOpen className="w-4 h-4 text-indigo-600" /> Help</p>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Close help"><X className="w-4 h-4" /></button>
                </div>
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search help…"
                        className="w-full h-9 pl-9 pr-3 bg-slate-100 border border-transparent rounded-lg text-sm focus:bg-white focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
                {results ? (
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{results.length} result{results.length === 1 ? '' : 's'}</p>
                        <ul className="space-y-1">
                            {results.map(a => (
                                <li key={a.id}>
                                    <button onClick={() => show(a)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50">
                                        <span className="block text-sm font-medium text-slate-800">{a.title}</span>
                                        <span className="block text-xs text-slate-500 line-clamp-2">{a.summary}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {!results.length && <p className="text-sm text-slate-500">Nothing matches “{query}”. Try a shorter word, or browse the Help Center.</p>}
                    </div>
                ) : (
                    <>
                        {stack.length > 1 && (
                            <button onClick={() => setStack(s => s.slice(0, -1))} className="mb-3 text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
                        )}
                        {article === screenArticle && stack.length === 1 && <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wide mb-1">Help for this screen</p>}
                        <h2 className="text-lg font-semibold tracking-tight text-slate-900 mb-2">{article.title}</h2>
                        <HelpArticle article={article} compact />
                        {(article.related || []).length > 0 && (
                            <div className="mt-6 pt-4 border-t border-slate-100">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Related</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {article.related.map(articleById).filter(Boolean).map(r => (
                                        <button key={r.id} onClick={() => show(r)} className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-xs font-medium text-slate-700">{r.title}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
                <Link to={`/app/help/${article.id}`} onClick={onClose} className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    Open in Help Center <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <button onClick={() => show(articleById('keyboard-shortcuts'))} className="text-slate-500 hover:text-slate-800 flex items-center gap-1"><Keyboard className="w-3.5 h-3.5" /> Shortcuts</button>
            </div>
        </aside>
    );
}
