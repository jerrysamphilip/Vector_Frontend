import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { managerCandidates, hierarchyError } from '../../lib/hierarchy';
import { useDialog } from '../common/useDialog';

// Sales hierarchy (BRD 5.4): level + "Reports to" fields and the dialog that sets them for one member.

// ── Sales hierarchy fields (BRD 5.4): level + "Reports to" ───────────
export const LEVEL_LABELS = { 1: 'CEO / COO / Sales Head', 2: 'Business Development', 3: 'Business Executive', 4: 'Market Research' };

export function HierarchyFields({ hierarchy, userId, level, managerId, onChange }) {
    const users = hierarchy?.users || [];
    const levels = hierarchy?.levels?.length ? hierarchy.levels : Object.entries(LEVEL_LABELS).map(([k, v]) => ({ level: Number(k), label: v }));
    const candidates = managerCandidates(users, userId, level);
    const selectCls = 'w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-400';
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5" htmlFor="hier-level">Sales level</label>
                <select id="hier-level" className={selectCls} value={level || ''}
                    onChange={e => {
                        const next = e.target.value ? Number(e.target.value) : null;
                        const keep = managerCandidates(users, userId, next).some(u => u.user_id === managerId);
                        onChange(next, keep ? managerId : (managerCandidates(users, userId, next).slice(-1)[0]?.user_id || null));
                    }}>
                    <option value="">Not in sales hierarchy</option>
                    {levels.map(l => <option key={l.level} value={l.level}>L{l.level} · {l.label}</option>)}
                </select>
            </div>
            <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5" htmlFor="hier-manager">Reports to</label>
                <select id="hier-manager" className={selectCls} value={managerId || ''} disabled={!level || level <= 1}
                    onChange={e => onChange(level, e.target.value || null)}>
                    <option value="">{!level || level <= 1 ? 'No manager' : 'Choose a manager'}</option>
                    {candidates.map(m => <option key={m.user_id} value={m.user_id}>{m.name} (L{m.sales_level})</option>)}
                </select>
                {level > 1 && candidates.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">Nobody is at a higher level yet: set up their manager first.</p>
                )}
            </div>
        </div>
    );
}

export default function HierarchyModal({ user, hierarchy, onClose, onSave, isSaving, error }) {
    const current = (hierarchy?.users || []).find(u => u.user_id === user.user_id);
    const [level, setLevel] = useState(current?.sales_level || null);
    const [managerId, setManagerId] = useState(current?.manager_id || null);
    const problem = hierarchyError(hierarchy?.users || [], user.user_id, level, managerId);
    const { titleId, dialogProps } = useDialog({ onClose });
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div {...dialogProps} className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden outline-none">
                <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                    <div>
                        <h3 id={titleId} className="font-semibold !text-white">Sales hierarchy</h3>
                        <p className="text-xs text-white/70">{user.first_name} {user.last_name} · {user.email}</p>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10"><X className="w-4 h-4" /></button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <p className="text-xs text-gray-500">People in the hierarchy see their own records and their team's. A manager must sit at a higher level, and nobody can report to someone in their own team.</p>
                    {!current ? (
                        <p className="text-sm text-gray-500">This account is not active, so it is not part of the hierarchy.</p>
                    ) : (
                        <HierarchyFields hierarchy={hierarchy} userId={user.user_id} level={level} managerId={managerId}
                            onChange={(l, m) => { setLevel(l); setManagerId(m); }} />
                    )}
                    {(error || (current && problem)) && (
                        <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error || problem}</div>
                    )}
                    <div className="flex items-center gap-3 pt-1">
                        <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
                        <button type="button" disabled={!current || !!problem || isSaving}
                            onClick={() => onSave({ sales_level: level, manager_id: level > 1 ? managerId : null })}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                            {isSaving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
