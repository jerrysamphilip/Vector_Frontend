import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Network, Loader2, ChevronRight } from 'lucide-react';
import { hierarchyApi } from '../api/sales';
import { errorMessage } from '../api/contacts';
import { Avatar, ErrorNote } from '../components/contacts/shared';
import { PageHeader, card, cardShadow, selectSm } from '../components/sales/shared';

const LEVEL_TONE = { 1: 'bg-violet-100 text-violet-800', 2: 'bg-indigo-100 text-indigo-800', 3: 'bg-sky-100 text-sky-800', 4: 'bg-teal-100 text-teal-800' };

function Row({ user, depth, byManager, data, edit, busyId }) {
    const reports = byManager[user.user_id] || [];
    const [open, setOpen] = useState(true);
    const managers = data.users.filter(u => u.sales_level && u.user_id !== user.user_id
        && (!user.sales_level || u.sales_level < user.sales_level));
    return (
        <>
            <div className="grid grid-cols-[1fr_220px_240px_90px] gap-3 items-center px-5 py-2.5 border-b border-slate-50 hover:bg-slate-50/60">
                <div className="flex items-center gap-2 min-w-0" style={{ paddingLeft: depth * 24 }}>
                    {reports.length ? (
                        <button onClick={() => setOpen(o => !o)} className="text-slate-400 hover:text-slate-700" aria-label={open ? 'Collapse' : 'Expand'}>
                            <ChevronRight className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} />
                        </button>
                    ) : <span className="w-4" />}
                    <Avatar first={user.name.split(' ')[0]} last={user.name.split(' ')[1]} seed={user.email} size="sm" />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email} · {user.role.toLowerCase().replace('_', ' ')}</p>
                    </div>
                </div>
                <div>
                    {data.can_edit ? (
                        <select className={`${selectSm} w-full`} value={user.sales_level || ''} disabled={busyId === user.user_id}
                            onChange={e => {
                                const level = e.target.value ? Number(e.target.value) : null;
                                if (!level || level === 1) { edit(user, level, null); return; }
                                // Keep the current manager if still above; else the nearest level above
                                const current = data.users.find(u => u.user_id === user.manager_id);
                                const candidates = data.users.filter(u => u.sales_level && u.sales_level < level && u.user_id !== user.user_id)
                                    .sort((a, b) => b.sales_level - a.sales_level);
                                edit(user, level, current?.sales_level < level ? current.user_id : candidates[0]?.user_id || null);
                            }}
                            aria-label={`Level for ${user.name}`}>
                            <option value="">Not in sales hierarchy</option>
                            {data.levels.map(l => <option key={l.level} value={l.level}>L{l.level} · {l.label}</option>)}
                        </select>
                    ) : user.sales_level
                        ? <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${LEVEL_TONE[user.sales_level]}`}>L{user.sales_level} · {user.level_label}</span>
                        : <span className="text-sm text-slate-400">—</span>}
                </div>
                <div>
                    {data.can_edit && user.sales_level > 1 ? (
                        <select className={`${selectSm} w-full`} value={user.manager_id || ''} disabled={busyId === user.user_id}
                            onChange={e => edit(user, user.sales_level, e.target.value || null)} aria-label={`Manager for ${user.name}`}>
                            <option value="">Choose a manager…</option>
                            {managers.map(m => <option key={m.user_id} value={m.user_id}>{m.name} (L{m.sales_level})</option>)}
                        </select>
                    ) : <span className="text-sm text-slate-500">{data.users.find(u => u.user_id === user.manager_id)?.name || '—'}</span>}
                </div>
                <div className="text-sm text-slate-600 text-right">{user.direct_reports || ''}</div>
            </div>
            {open && reports.map(r => <Row key={r.user_id} user={r} depth={depth + 1} byManager={byManager} data={data} edit={edit} busyId={busyId} />)}
        </>
    );
}

export default function SalesTeam() {
    const queryClient = useQueryClient();
    const { data, isLoading } = useQuery({ queryKey: ['hierarchy'], queryFn: hierarchyApi.get });
    const [error, setError] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const save = useMutation({
        mutationFn: ({ user, level, manager }) => hierarchyApi.set(user.user_id, { sales_level: level, manager_id: manager }),
        onMutate: ({ user }) => { setBusyId(user.user_id); setError(null); },
        onSuccess: () => ['hierarchy', 'contact-owners', 'contacts'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] })),
        onError: err => setError(errorMessage(err)),
        onSettled: () => setBusyId(null),
    });
    const edit = (user, level, manager) => save.mutate({ user, level, manager });

    const { roots, byManager, outside } = useMemo(() => {
        const users = data?.users || [];
        const ids = new Set(users.map(u => u.user_id));
        const byManager = {};
        users.forEach(u => { if (u.sales_level && u.manager_id && ids.has(u.manager_id)) (byManager[u.manager_id] ||= []).push(u); });
        return {
            byManager,
            roots: users.filter(u => u.sales_level && !(u.manager_id && ids.has(u.manager_id))).sort((a, b) => a.sales_level - b.sales_level),
            outside: users.filter(u => !u.sales_level),
        };
    }, [data]);

    return (
        <div className="w-full space-y-6">
            <PageHeader title="Sales team" subtitle="Four levels: everyone sees their own records and those of the people below them" />
            <div className={`${card} px-5 py-4 text-sm text-slate-600 grid sm:grid-cols-4 gap-3`} style={cardShadow}>
                {(data?.levels || []).map(l => (
                    <div key={l.level}><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${LEVEL_TONE[l.level]}`}>L{l.level}</span> {l.label}</div>
                ))}
            </div>
            <ErrorNote message={error} />
            <div className={`${card} overflow-hidden`} style={cardShadow}>
                <div className="grid grid-cols-[1fr_220px_240px_90px] gap-3 px-5 py-3 bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    <span>Person</span><span>Level</span><span>Reports to</span><span className="text-right">Team</span>
                </div>
                {isLoading ? <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div> : (
                    <>
                        {roots.map(u => <Row key={u.user_id} user={u} depth={0} byManager={byManager} data={data} edit={edit} busyId={busyId} />)}
                        {outside.length > 0 && (
                            <>
                                <p className="px-5 pt-4 pb-1 text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <Network className="w-3.5 h-3.5" /> Not in the sales hierarchy (access follows their role)
                                </p>
                                {outside.map(u => <Row key={u.user_id} user={u} depth={0} byManager={{}} data={data} edit={edit} busyId={busyId} />)}
                            </>
                        )}
                    </>
                )}
            </div>
            {data && !data.can_edit && <p className="text-xs text-slate-400">Only admins can change levels and managers.</p>}
        </div>
    );
}
