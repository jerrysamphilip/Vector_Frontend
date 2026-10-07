import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Building2, User } from 'lucide-react';
import { searchApi } from '../../api/contacts';

/** Header search across contacts (name, email, phone, company) and companies (BR-CM-07). Ctrl/⌘+K focuses it. */
export default function GlobalSearch() {
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const [text, setText] = useState('');
    const [term, setTerm] = useState('');
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);

    useEffect(() => { const t = setTimeout(() => setTerm(text.trim()), 200); return () => clearTimeout(t); }, [text]);
    useEffect(() => {
        const onKey = e => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const { data, isFetching } = useQuery({
        queryKey: ['global-search', term], queryFn: () => searchApi.search(term), enabled: term.length >= 2, staleTime: 15000,
    });
    const results = [
        ...(data?.contacts || []).map(c => ({ key: c.prospect_id, href: `/app/contacts/${c.prospect_id}`, icon: User, title: c.full_name || c.email, sub: [c.email, c.company_name].filter(Boolean).join(' · ') })),
        ...(data?.companies || []).map(a => ({ key: a.account_id, href: `/app/accounts/${a.account_id}`, icon: Building2, title: a.name, sub: [a.domain, a.industry].filter(Boolean).join(' · ') || 'Company' })),
    ];
    const go = r => { setOpen(false); setText(''); inputRef.current?.blur(); navigate(r.href); };

    const onKeyDown = e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
        else if (e.key === 'Enter') {
            if (results[active]) go(results[active]);
            else if (term.length >= 2) { setOpen(false); navigate(`/app/contacts?q=${encodeURIComponent(term)}`); }
        } else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
    };

    return (
        <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input ref={inputRef} value={text} placeholder="Search contacts and companies…" aria-label="Search contacts and companies"
                onChange={e => { setText(e.target.value); setOpen(true); setActive(0); }}
                onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onKeyDown={onKeyDown}
                className="w-full h-9 pl-9 pr-14 bg-slate-100 border border-transparent rounded-lg text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium">
                {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ctrl K'}
            </span>
            {open && term.length >= 2 && data && (
                <div className="absolute z-40 mt-1.5 w-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                    {results.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-slate-500">No matches for “{term}”</p>
                    ) : (
                        <ul className="max-h-96 overflow-y-auto py-1">
                            {results.map((r, i) => (
                                <li key={r.key}>
                                    <button onMouseDown={e => e.preventDefault()} onClick={() => go(r)} onMouseEnter={() => setActive(i)}
                                        className={`w-full flex items-center gap-3 px-4 py-2 text-left ${i === active ? 'bg-indigo-50' : ''}`}>
                                        <r.icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold text-slate-800 truncate">{r.title}</span>
                                            <span className="block text-xs text-slate-500 truncate">{r.sub}</span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <button onMouseDown={e => e.preventDefault()} onClick={() => { setOpen(false); navigate(`/app/contacts?q=${encodeURIComponent(term)}`); }}
                        className="w-full px-4 py-2 text-left text-xs font-semibold text-indigo-600 hover:bg-slate-50 border-t border-slate-100">
                        See all contacts matching “{term}” →
                    </button>
                </div>
            )}
        </div>
    );
}
