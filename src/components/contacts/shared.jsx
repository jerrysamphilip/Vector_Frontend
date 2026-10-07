import { useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';

export const BRAND_GRADIENT = 'linear-gradient(135deg, #2d6bbf, #73C8D2)';

const GRADIENTS = [
    'from-indigo-400 to-violet-500',
    'from-blue-400 to-indigo-500',
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
    'from-pink-400 to-rose-500',
    'from-cyan-400 to-blue-500',
    'from-purple-400 to-pink-500',
    'from-teal-400 to-emerald-500',
];

function hashGradient(seed = '') {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export function initials(first, last, fallback = '') {
    const value = `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
    return value || (fallback[0] || '?').toUpperCase();
}

export function Avatar({ first, last, seed, size = 'md', square = false }) {
    const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-xl' };
    return (
        <div className={`${sizes[size]} ${square ? 'rounded-xl' : 'rounded-full'} bg-gradient-to-br ${hashGradient(seed || `${first}${last}`)} flex items-center justify-center text-white font-bold flex-shrink-0`}>
            {initials(first, last, seed)}
        </div>
    );
}

/** API timestamps are UTC without a zone suffix; parse them as UTC. */
export function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
}

export function relativeDate(value) {
    if (!value) return '—';
    const d = parseDate(value);
    const diff = Math.floor((Date.now() - d) / 86400000);
    if (diff <= 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
    if (diff < 365) return `${Math.floor(diff / 30)}mo ago`;
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(value) {
    if (!value) return '—';
    return parseDate(value).toLocaleString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function TagChips({ tags = [], onRemove, max }) {
    const shown = max ? tags.slice(0, max) : tags;
    return (
        <div className="flex flex-wrap gap-1">
            {shown.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold">
                    {tag}
                    {onRemove && (
                        <button type="button" onClick={() => onRemove(tag)} className="hover:text-indigo-900" aria-label={`Remove ${tag}`}>
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </span>
            ))}
            {max && tags.length > max && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-semibold">+{tags.length - max}</span>
            )}
        </div>
    );
}

/** Free-text tag entry: Enter or comma adds a tag; suggestions come from existing tags. */
export function TagInput({ value = [], onChange, suggestions = [], placeholder = 'Add a tag…' }) {
    const [draft, setDraft] = useState('');
    const add = (raw) => {
        const tag = raw.trim();
        if (tag && !value.some(t => t.toLowerCase() === tag.toLowerCase())) onChange([...value, tag]);
        setDraft('');
    };
    const options = suggestions.filter(s => !value.some(t => t.toLowerCase() === s.toLowerCase()));
    return (
        <div className="w-full min-h-11 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl flex flex-wrap items-center gap-1.5 focus-within:border-blue-400">
            <TagChips tags={value} onRemove={tag => onChange(value.filter(t => t !== tag))} />
            <input
                value={draft}
                list="tag-suggestions"
                onChange={e => (e.target.value.endsWith(',') ? add(e.target.value.slice(0, -1)) : setDraft(e.target.value))}
                onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); add(draft); }
                    if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
                }}
                onBlur={() => draft && add(draft)}
                placeholder={value.length ? '' : placeholder}
                className="flex-1 min-w-[100px] bg-transparent text-sm outline-none"
            />
            <datalist id="tag-suggestions">
                {options.map(s => <option key={s} value={s} />)}
            </datalist>
        </div>
    );
}

export const inputClass = 'w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all';

export function Field({ label, children, hint, className = '' }) {
    return (
        <label className={`block ${className}`}>
            <span className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</span>
            {children}
            {hint && <span className="block text-xs text-gray-400 mt-1">{hint}</span>}
        </label>
    );
}

export function OwnerSelect({ owners = [], value, onChange, allowUnassigned = true, className = inputClass, disabled }) {
    return (
        <select value={value || ''} onChange={e => onChange(e.target.value || null)} className={className} disabled={disabled}>
            {allowUnassigned && <option value="">Unassigned</option>}
            {owners.map(o => <option key={o.user_id} value={o.user_id}>{o.name}</option>)}
        </select>
    );
}

/** Input for one tenant-defined custom field. */
export function CustomFieldInput({ field, value, onChange }) {
    if (field.field_type === 'SELECT') {
        return (
            <select value={value ?? ''} onChange={e => onChange(e.target.value)} className={inputClass}>
                <option value="">—</option>
                {field.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        );
    }
    const type = { NUMBER: 'number', DATE: 'date', URL: 'url' }[field.field_type] || 'text';
    return <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} className={inputClass} />;
}

export function ErrorNote({ message }) {
    if (!message) return null;
    return (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{message}</span>
        </div>
    );
}

export function Modal({ title, subtitle, onClose, children, footer, width = 'max-w-lg' }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative bg-white rounded-3xl shadow-2xl w-full ${width} max-h-[90vh] flex flex-col overflow-hidden`}
                onClick={e => e.stopPropagation()}>
                <div className="h-1.5 w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, #2d6bbf, #73C8D2)' }} />
                <div className="px-6 pt-5 pb-3 flex items-start justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                        {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors" aria-label="Close">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="px-6 pb-4 overflow-y-auto">{children}</div>
                {footer && <div className="px-6 pb-6 pt-2 flex gap-2.5 flex-shrink-0">{footer}</div>}
            </div>
        </div>
    );
}

export function PrimaryButton({ children, loading, className = '', ...props }) {
    return (
        <button {...props} disabled={loading || props.disabled}
            className={`h-10 px-5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 hover:shadow-md ${className}`}
            style={{ background: BRAND_GRADIENT }}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {children}
        </button>
    );
}

export function SecondaryButton({ children, className = '', ...props }) {
    return (
        <button {...props}
            className={`h-10 px-4 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${className}`}>
            {children}
        </button>
    );
}
