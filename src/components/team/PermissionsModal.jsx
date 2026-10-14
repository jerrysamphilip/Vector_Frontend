import { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { useDialog } from '../common/useDialog';
import { PERMISSION_LIST, RoleBadge, Avatar } from './teamShared';

// Per-member permission overrides (super admins): toggle, save or reset to the role defaults.

// ── Permissions Modal ──────────────────────────────────────────
export default function PermissionsModal({ user, onClose, onSave, onReset, isSaving, isResetting }) {
    const [draft, setDraft] = useState(new Set(user.permissions || []));
    const hasChanges = JSON.stringify([...draft].sort()) !== JSON.stringify([...(user.permissions || [])].sort());
    const { titleId, dialogProps } = useDialog({ onClose });

    const toggle = (key) => {
        setDraft(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div {...dialogProps} className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden outline-none">

                {/* Gradient header */}
                <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Avatar firstName={user.first_name} lastName={user.last_name} email={user.email} size="lg" />
                            <div>
                                <h3 id={titleId} className="font-semibold !text-white text-base">
                                    {user.first_name} {user.last_name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <RoleBadge role={user.role} />
                                    <span className="text-xs text-white/70">{user.email}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} aria-label="Close" className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 flex-shrink-0">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="mt-3 text-xs text-white/75 leading-relaxed">
                        Toggle which features this member can access. Changes override their default role permissions.
                    </p>
                </div>

                {/* Permission toggles */}
                <div className="px-6 py-4 space-y-2 max-h-[360px] overflow-y-auto">
                    {PERMISSION_LIST.map(p => {
                        const enabled = draft.has(p.key);
                        return (
                            <button key={p.key} onClick={() => toggle(p.key)}
                                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                                    enabled ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg leading-none">{p.icon}</span>
                                    <div>
                                        <p className={`text-sm font-semibold ${enabled ? 'text-blue-800' : 'text-slate-700'}`}>{p.label}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                                    </div>
                                </div>
                                <div className={`relative w-10 h-5 rounded-full flex-shrink-0 transition-colors ${enabled ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? 'left-5' : 'left-0.5'}`} />
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button onClick={onReset} disabled={isResetting}
                        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset to defaults
                    </button>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <button disabled={!hasChanges || isSaving}
                            onClick={() => onSave([...draft])}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                        >
                            {isSaving ? 'Saving…' : 'Save Permissions'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
