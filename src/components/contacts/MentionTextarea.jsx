import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { contactsApi } from '../../api/contacts';

// "@" at the start or after whitespace, then up to 30 name characters, right before the caret
const TRIGGER = /(^|\s)@([^\s@]{0,30}(?: [^\s@]{0,30})?)$/;

/** The mentions whose "@Name" is still in the text (a mention deleted from the text is dropped). */
export function activeMentions(text, mentions) {
    return (mentions || []).filter(m => text.includes(`@${m.name}`));
}

/**
 * Textarea with an @mention picker (BR-CM-16): typing "@" opens a list of colleagues;
 * arrow keys move, Enter or Tab picks, Escape closes. The picked person goes into the text
 * as "@First Last" and into `mentions` ([{user_id, name}]).
 */
export default function MentionTextarea({ value, onChange, mentions, onMentionsChange, className, ...props }) {
    const ref = useRef(null);
    const [query, setQuery] = useState(null); // null = picker closed
    const [debounced, setDebounced] = useState('');
    const [active, setActive] = useState(0);

    useEffect(() => {
        if (query === null) return undefined;
        const t = setTimeout(() => setDebounced(query), 150);
        return () => clearTimeout(t);
    }, [query]);

    const { data: users = [] } = useQuery({
        queryKey: ['mentionable-users', debounced],
        queryFn: () => contactsApi.mentionableUsers(debounced),
        enabled: query !== null,
        staleTime: 60000,
    });
    const open = query !== null && users.length > 0;

    const detect = (text, caret) => {
        const m = TRIGGER.exec(text.slice(0, caret));
        setQuery(m ? m[2] : null);
        setActive(0);
    };

    const pick = (user) => {
        const el = ref.current;
        const caret = el ? el.selectionStart : value.length;
        const before = value.slice(0, caret);
        const m = TRIGGER.exec(before);
        if (!m) return;
        const start = caret - m[2].length - 1;
        const insert = `@${user.name} `;
        const next = value.slice(0, start) + insert + value.slice(caret);
        onChange(next);
        if (!(mentions || []).some(x => x.user_id === user.user_id)) onMentionsChange([...(mentions || []), { user_id: user.user_id, name: user.name }]);
        setQuery(null);
        requestAnimationFrame(() => {
            if (!el) return;
            el.focus();
            el.setSelectionRange(start + insert.length, start + insert.length);
        });
    };

    const onKeyDown = (e) => {
        if (!open) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => (a + 1) % users.length); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => (a - 1 + users.length) % users.length); }
        else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(users[Math.min(active, users.length - 1)]); }
        else if (e.key === 'Escape') { e.preventDefault(); setQuery(null); }
    };

    return (
        <div className="relative">
            <textarea ref={ref} value={value} className={className} {...props}
                onChange={e => { onChange(e.target.value); detect(e.target.value, e.target.selectionStart); }}
                onKeyDown={onKeyDown}
                onClick={e => detect(e.target.value, e.target.selectionStart)}
                onBlur={() => setTimeout(() => setQuery(null), 150)}
                aria-autocomplete="list" aria-expanded={open} aria-controls={open ? 'mention-list' : undefined} />
            {open && (
                <ul id="mention-list" role="listbox" aria-label="Mention a colleague"
                    className="absolute left-2 z-30 mt-1 w-72 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1">
                    {users.map((u, i) => (
                        <li key={u.user_id} role="option" aria-selected={i === active}
                            onMouseDown={e => { e.preventDefault(); pick(u); }} onMouseEnter={() => setActive(i)}
                            className={`px-3 py-2 cursor-pointer ${i === active ? 'bg-indigo-50' : ''}`}>
                            <span className="block text-sm font-medium text-slate-800">{u.name}</span>
                            <span className="block text-xs text-slate-500">{u.email}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/** Note text with each "@Name" of a mentioned colleague highlighted. */
export function MentionText({ text, mentions, className }) {
    const names = [...new Set((mentions || []).map(m => m.name).filter(Boolean))].sort((a, b) => b.length - a.length);
    if (!text || !names.length) return <span className={className}>{text}</span>;
    const escaped = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const parts = text.split(new RegExp(`(@(?:${escaped.join('|')}))`, 'g'));
    return (
        <span className={className}>
            {parts.map((part, i) => (part.startsWith('@') && names.includes(part.slice(1))
                ? <span key={i} className="px-1 rounded bg-indigo-50 text-indigo-700 font-medium" data-mention="">{part}</span>
                : <span key={i}>{part}</span>))}
        </span>
    );
}
