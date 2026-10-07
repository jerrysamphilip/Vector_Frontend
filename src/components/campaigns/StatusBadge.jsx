import React from 'react';

export default function StatusBadge({ status }) {
    const styles = {
        ACTIVE: {
            bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            glow: 'shadow-[0_0_8px_rgba(16,185,129,0.15)]',
            label: 'Active'
        },
        PAUSED: {
            bg: 'bg-amber-50 text-amber-700 border-amber-200',
            glow: '',
            label: 'Paused'
        },
        COMPLETED: {
            bg: 'bg-blue-50 text-blue-700 border-blue-200',
            glow: '',
            label: 'Completed'
        },
        DRAFT: {
            bg: 'bg-slate-100 text-slate-600 border-slate-200',
            glow: '',
            label: 'Draft'
        },
        ERROR: {
            bg: 'bg-rose-50 text-rose-700 border-rose-200',
            glow: 'shadow-[0_0_8px_rgba(244,63,94,0.15)]',
            label: 'Error'
        }
    };

    const style = styles[status] || styles.DRAFT;

    return (
        <span className={`
            inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider 
            border ${style.bg} ${style.glow}
        `}>
            {style.label}
        </span>
    );
}
