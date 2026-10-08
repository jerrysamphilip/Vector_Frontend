import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Search, ArrowRight, BookOpen } from 'lucide-react';
import HelpArticle from '../help/HelpArticle';
import { ARTICLES, CATEGORIES, articleById, screenPathFor, searchHelp } from '../help/helpIndex';
import { card } from '../components/sales/shared';

/** The whole help library: browse by topic, search, and deep links (/app/help/<article>). */
export default function HelpCenter() {
    const { articleId } = useParams();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const article = articleById(articleId) || articleById('getting-started');
    const results = query.trim() ? searchHelp(query) : null;
    const screen = screenPathFor(article);
    const related = (article.related || []).map(articleById).filter(Boolean);

    return (
        <div className="space-y-5">
            <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900 flex items-center gap-2"><BookOpen className="w-5 h-5 text-indigo-600" /> Help Center</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Guides for every screen. Press <kbd className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-[11px]">?</kbd> anywhere for help on the screen you are on.</p>
                </div>
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search all help…"
                        className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5 items-start">
                <nav className={`${card} p-3 lg:sticky lg:top-20 max-h-[calc(100vh-120px)] overflow-y-auto`} aria-label="Help topics">
                    {results ? (
                        <>
                            <p className="px-2 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{results.length} result{results.length === 1 ? '' : 's'}</p>
                            {results.map(a => (
                                <button key={a.id} onClick={() => { navigate(`/app/help/${a.id}`); setQuery(''); }}
                                    className="w-full text-left px-2 py-1.5 rounded-md text-sm text-slate-700 hover:bg-slate-50">{a.title}</button>
                            ))}
                            {!results.length && <p className="px-2 py-2 text-sm text-slate-500">No matches.</p>}
                        </>
                    ) : CATEGORIES.map(c => (
                        <div key={c} className="mb-3">
                            <p className="px-2 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{c}</p>
                            {ARTICLES.filter(a => a.category === c).map(a => (
                                <Link key={a.id} to={`/app/help/${a.id}`}
                                    className={`block px-2 py-1.5 rounded-md text-sm ${a.id === article.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}>{a.title}</Link>
                            ))}
                        </div>
                    ))}
                </nav>

                <article className={`${card} p-6 lg:p-8 min-w-0`}>
                    <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wide">{article.category}</p>
                    <div className="flex items-start justify-between gap-4 mt-1 mb-4">
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{article.title}</h2>
                        {screen && (
                            <Link to={screen} className="shrink-0 h-9 px-3.5 rounded-lg text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex items-center gap-1.5">
                                Go to this screen <ArrowRight className="w-4 h-4" />
                            </Link>
                        )}
                    </div>
                    <div className="max-w-3xl"><HelpArticle article={article} /></div>
                    {related.length > 0 && (
                        <div className="mt-8 pt-5 border-t border-slate-100">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Related</p>
                            <div className="flex flex-wrap gap-2">
                                {related.map(r => <Link key={r.id} to={`/app/help/${r.id}`} className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-sm text-slate-700">{r.title}</Link>)}
                            </div>
                        </div>
                    )}
                </article>
            </div>
        </div>
    );
}
