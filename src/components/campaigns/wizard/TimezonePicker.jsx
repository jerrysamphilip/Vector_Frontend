import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X as XIcon } from 'lucide-react';
import { TIMEZONE_OPTIONS, tzMatches } from './timezones';

// Searchable timezone picker component
export default function TimezonePicker({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef(null);
    const searchRef = useRef(null);

    const filtered = query.trim()
        ? TIMEZONE_OPTIONS.filter(tz => tzMatches(tz, query))
        : TIMEZONE_OPTIONS;

    const selected = TIMEZONE_OPTIONS.find(tz => tz.value === value);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Focus search on open
    useEffect(() => {
        if (open) setTimeout(() => searchRef.current?.focus(), 50);
    }, [open]);

    const handleSelect = (tz) => {
        onChange(tz.value);
        setOpen(false);
        setQuery('');
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full h-10 px-3 flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-400 focus:outline-none focus:border-blue-400 transition-all"
            >
                <span className="truncate text-left">{selected?.shortLabel || selected?.label || value}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                    style={{ maxHeight: '280px' }}>
                    {/* Search input */}
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 bg-gray-50/80">
                        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <input
                            ref={searchRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder='Search by city, country or offset (e.g. "India", "EST", "+05:30")'
                            className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400 text-gray-700"
                        />
                        {query && (
                            <button type="button" onClick={() => setQuery('')}>
                                <XIcon className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                            </button>
                        )}
                    </div>

                    {/* Options list */}
                    <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
                        {filtered.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-gray-400 italic">No timezones match "{query}"</p>
                        ) : (
                            filtered.map(tz => (
                                <button
                                    key={tz.value}
                                    type="button"
                                    onClick={() => handleSelect(tz)}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between gap-2
                                        ${tz.value === value ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}
                                >
                                    <div className="flex flex-col min-w-0">
                                        <span className="truncate font-medium">{tz.city}</span>
                                        <span className="text-[11px] text-gray-400 truncate">{tz.label}</span>
                                    </div>
                                    {tz.value === value && <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                </button>
                            ))
                        )}
                    </div>

                    {/* Result count hint */}
                    {query.trim() && filtered.length > 0 && (
                        <div className="px-4 py-1.5 border-t border-gray-100 bg-gray-50/60">
                            <span className="text-[10px] text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
