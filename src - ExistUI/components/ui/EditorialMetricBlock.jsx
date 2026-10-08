import React from 'react';

export default function EditorialMetricBlock({ label, value, subtext, accentColor = "text-slate-900" }) {
    return (
        <div className="rounded-[20px] p-8 bg-[var(--brand-orange)] shadow-lg shadow-orange-500/10">
            <div className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide">
                {label}
            </div>

            <div className="mt-3 text-5xl font-sans font-bold leading-none text-[var(--text-primary)] tracking-tight">
                {value}
            </div>

            {subtext && (
                <div className="mt-6 text-xs text-[var(--text-muted)] flex items-center gap-2">
                    {accentColor && <span className={`w-2 h-2 rounded-full ${accentColor}`} />}
                    {subtext}
                </div>
            )}
        </div>
    );
}
