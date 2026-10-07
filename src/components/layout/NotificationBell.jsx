import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsApi } from '../../api/sales';
import { relativeDate } from '../contacts/shared';

/** In-app notifications with an unread badge; email copies are optional (BR-SF-07). */
export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { data } = useQuery({ queryKey: ['notifications'], queryFn: () => notificationsApi.list(), refetchInterval: 60000 });
    const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
    const markRead = useMutation({ mutationFn: notificationsApi.read, onSuccess: refresh });
    const setEmail = useMutation({ mutationFn: notificationsApi.setEmail, onSuccess: refresh });

    useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const unread = data?.unread || 0;
    const items = data?.items || [];
    const openItem = (n) => {
        if (!n.read) markRead.mutate([n.notification_id]);
        setOpen(false);
        if (n.link) navigate(n.link.replace(/^\/vector/, ''));
    };

    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setOpen(o => !o)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
                className="relative h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                <Bell className="w-4 h-4" />
                {unread > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </button>
            {open && (
                <div className="absolute right-0 top-12 w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-800">Notifications</p>
                        {unread > 0 && (
                            <button onClick={() => markRead.mutate(undefined)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                            </button>
                        )}
                    </div>
                    <div className="max-h-[420px] overflow-y-auto">
                        {!items.length && <p className="text-sm text-slate-400 text-center py-10">Nothing yet</p>}
                        {items.map(n => (
                            <button key={n.notification_id} onClick={() => openItem(n)}
                                className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 flex gap-3 ${n.read ? '' : 'bg-indigo-50/40'}`}>
                                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-transparent' : 'bg-indigo-500'}`} />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium text-slate-800">{n.title}</span>
                                    {n.body && <span className="block text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</span>}
                                    <span className="block text-[11px] text-slate-400 mt-1">{relativeDate(n.created_at)}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                    <label className="flex items-center justify-between px-4 py-3 bg-slate-50 text-xs text-slate-600">
                        Also send me these by email
                        <input type="checkbox" className="accent-indigo-600" checked={!!data?.email_enabled}
                            onChange={e => setEmail.mutate(e.target.checked)} />
                    </label>
                </div>
            )}
        </div>
    );
}
