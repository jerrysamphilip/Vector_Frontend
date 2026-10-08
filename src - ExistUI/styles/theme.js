/**
 * Shared Theme Colors - Matching Sidebar Design
 * Use these constants across all components for consistency
 */

export const THEME = {
    // Primary colors (blue family - sidebar accent)
    primary: '#3b82f6',       // blue-500
    primaryLight: '#60a5fa',  // blue-400
    primaryDark: '#2563eb',   // blue-600
    primaryBg: '#eff6ff',     // blue-50

    // Secondary/Accent (cyan - for success actions)
    accent: '#06b6d4',        // cyan-500
    accentLight: '#22d3ee',   // cyan-400
    accentBg: '#ecfeff',      // cyan-50

    // Success (emerald)
    success: '#10b981',       // emerald-500
    successLight: '#34d399',  // emerald-400
    successBg: '#ecfdf5',     // emerald-50

    // Warning (amber)
    warning: '#f59e0b',       // amber-500
    warningLight: '#fbbf24',  // amber-400
    warningBg: '#fffbeb',     // amber-50

    // Danger (red)
    danger: '#ef4444',        // red-500
    dangerLight: '#f87171',   // red-400
    dangerBg: '#fef2f2',      // red-50

    // Neutral (slate - for muted content)
    muted: '#64748b',         // slate-500
    mutedLight: '#94a3b8',    // slate-400
    mutedBg: '#f8fafc',       // slate-50

    // Text colors
    textPrimary: '#1e293b',   // slate-800
    textSecondary: '#475569', // slate-600
    textMuted: '#94a3b8',     // slate-400

    // Borders
    border: '#e2e8f0',        // slate-200
    borderLight: '#f1f5f9',   // slate-100
};

// Button variants matching theme
export const BUTTON_VARIANTS = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
    success: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600',
    outline: 'border-2 border-blue-500 text-blue-500 hover:bg-blue-50',
};

// Status badge colors
export const STATUS_COLORS = {
    active: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    paused: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    draft: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
    failed: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
    sent: { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500' },
};

export default THEME;
