import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckSquare, Square, Plus, Loader2, AlertCircle, Bell, Trash2, Phone, Mail, CalendarDays, ListTodo } from 'lucide-react';
import { contactsApi, tasksApi, errorMessage } from '../api/contacts';
import { getStoredUser, hasPermission } from '../lib/authStorage';
import {
    BRAND_GRADIENT, ErrorNote, Field, inputClass, Modal, OwnerSelect, PrimaryButton, SecondaryButton, formatDateTime, relativeDate,
} from '../components/contacts/shared';

const TYPE_ICON = { TODO: ListTodo, CALL: Phone, EMAIL: Mail, MEETING: CalendarDays };
const PRIORITY_STYLE = { HIGH: 'bg-red-50 text-red-700', MEDIUM: 'bg-amber-50 text-amber-700', LOW: 'bg-slate-100 text-slate-500' };

function NewTaskModal({ owners, canAssign, onClose, onSaved }) {
    const me = getStoredUser();
    const [form, setForm] = useState({ title: '', notes: '', task_type: 'TODO', priority: 'MEDIUM', due_at: '', reminder_at: '', owner_id: me?.user_id || '' });
    const [error, setError] = useState(null);
    const set = key => e => setForm(f => ({ ...f, [key]: e?.target ? e.target.value : e }));
    const save = useMutation({
        mutationFn: () => tasksApi.create({
            title: form.title.trim(), notes: form.notes || undefined, task_type: form.task_type, priority: form.priority,
            due_at: form.due_at ? new Date(form.due_at).toISOString() : undefined,
            reminder_at: form.reminder_at ? new Date(form.reminder_at).toISOString() : undefined,
            owner_id: form.owner_id || undefined,
        }),
        onSuccess: onSaved,
        onError: err => setError(errorMessage(err)),
    });
    return (
        <Modal title="New task" onClose={onClose}
            footer={<>
                <SecondaryButton onClick={onClose} className="flex-1">Cancel</SecondaryButton>
                <PrimaryButton onClick={() => save.mutate()} loading={save.isPending} disabled={!form.title.trim()} className="flex-1">Create task</PrimaryButton>
            </>}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Title" className="sm:col-span-2"><input className={inputClass} value={form.title} onChange={set('title')} autoFocus /></Field>
                <Field label="Type">
                    <select className={inputClass} value={form.task_type} onChange={set('task_type')}>
                        {[['TODO', 'To-do'], ['CALL', 'Call'], ['EMAIL', 'Email'], ['MEETING', 'Meeting']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </Field>
                <Field label="Priority">
                    <select className={inputClass} value={form.priority} onChange={set('priority')}>
                        {['HIGH', 'MEDIUM', 'LOW'].map(p => <option key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</option>)}
                    </select>
                </Field>
                <Field label="Due"><input type="datetime-local" className={inputClass} value={form.due_at} onChange={set('due_at')} /></Field>
                <Field label="Reminder"><input type="datetime-local" className={inputClass} value={form.reminder_at} onChange={set('reminder_at')} /></Field>
                {canAssign && <Field label="Assigned to" className="sm:col-span-2"><OwnerSelect owners={owners} value={form.owner_id} onChange={set('owner_id')} allowUnassigned={false} /></Field>}
                <Field label="Notes" className="sm:col-span-2">
                    <textarea rows={3} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400" value={form.notes} onChange={set('notes')} />
                </Field>
            </div>
            <p className="text-xs text-slate-400 mt-3">To link a task to a contact, create it from the contact’s page.</p>
            <div className="mt-3"><ErrorNote message={error} /></div>
        </Modal>
    );
}

export default function Tasks() {
    const queryClient = useQueryClient();
    const canManage = hasPermission('manage_prospects');
    const [scope, setScope] = useState('mine');
    const [due, setDue] = useState('');
    const [status, setStatus] = useState('OPEN');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState(null);

    const params = { scope, status, due: due || undefined, page_size: 200 };
    const { data, isLoading, isFetching } = useQuery({ queryKey: ['tasks', params], queryFn: () => tasksApi.list(params), placeholderData: keepPreviousData });
    const { data: owners = [] } = useQuery({ queryKey: ['contact-owners'], queryFn: contactsApi.owners });

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['tasks'] });
    const toggle = useMutation({
        mutationFn: t => tasksApi.update(t.task_id, { status: t.status === 'DONE' ? 'OPEN' : 'DONE' }),
        onSuccess: refresh, onError: err => setError(errorMessage(err)),
    });
    const remove = useMutation({ mutationFn: tasksApi.remove, onSuccess: refresh, onError: err => setError(errorMessage(err)) });

    const items = data?.items || [];
    const tab = (value, label, current, set) => (
        <button key={label} onClick={() => set(value)}
            className={`px-3 h-8 text-sm font-medium rounded-lg ${current === value ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</button>
    );

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
                    <p className="text-sm text-gray-400 mt-1">Follow-ups, calls and to-dos across your contacts</p>
                </div>
                <button onClick={() => setCreating(true)} style={{ background: BRAND_GRADIENT }}
                    className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm hover:shadow-md whitespace-nowrap">
                    <Plus className="w-4 h-4" /> New task
                </button>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-xl">
                {[['Open', data?.my_open, 'text-slate-800', () => { setScope('mine'); setStatus('OPEN'); setDue(''); }],
                  ['Overdue', data?.my_overdue, 'text-red-600', () => { setScope('mine'); setStatus('OPEN'); setDue('overdue'); }],
                  ['Reminders due', data?.my_reminders_due, 'text-amber-600', null]].map(([label, n, color, onClick]) => (
                    <button key={label} onClick={onClick || undefined} disabled={!onClick}
                        className="bg-white rounded-2xl border border-gray-100 px-4 py-3 text-left hover:border-indigo-200 disabled:hover:border-gray-100">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">My {label.toLowerCase()}</p>
                        <p className={`text-2xl font-bold ${color}`}>{n ?? '–'}</p>
                    </button>
                ))}
            </div>

            <ErrorNote message={error} />
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="px-5 py-4 flex items-center gap-3 flex-wrap" style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}>
                    <div className="flex bg-white rounded-xl border border-slate-200 p-0.5">
                        {tab('mine', 'Assigned to me', scope, setScope)}
                        {tab('created', 'Created by me', scope, setScope)}
                        {canManage && tab('all', 'Everyone', scope, setScope)}
                    </div>
                    <div className="flex bg-white rounded-xl border border-slate-200 p-0.5">
                        {[['', 'Any date'], ['overdue', 'Overdue'], ['today', 'Due today'], ['week', 'Next 7 days'], ['none', 'No due date']].map(([v, l]) => tab(v, l, due, setDue))}
                    </div>
                    <div className="flex bg-white rounded-xl border border-slate-200 p-0.5">
                        {[['OPEN', 'Open'], ['DONE', 'Done'], ['ALL', 'All']].map(([v, l]) => tab(v, l, status, setStatus))}
                    </div>
                    <span className="ml-auto text-sm text-slate-500 flex items-center gap-2">{isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{data?.total ?? 0} task{data?.total !== 1 ? 's' : ''}</span>
                </div>

                {isLoading ? (
                    <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                ) : items.length === 0 ? (
                    <div className="py-20 text-center">
                        <CheckSquare className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                        <p className="font-semibold text-slate-800">Nothing here</p>
                        <p className="text-sm text-slate-500 mt-1">No tasks match these filters.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-50">
                        {items.map(t => {
                            const Icon = TYPE_ICON[t.task_type] || ListTodo;
                            const done = t.status === 'DONE';
                            return (
                                <li key={t.task_id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50/60">
                                    <button onClick={() => toggle.mutate(t)} className="mt-0.5 text-slate-400 hover:text-emerald-600" aria-label={done ? 'Reopen task' : 'Complete task'}>
                                        {done ? <CheckSquare className="w-5 h-5 text-emerald-500" /> : <Square className="w-5 h-5" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold flex items-center gap-2 ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                            <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />{t.title}
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold no-underline ${PRIORITY_STYLE[t.priority]}`}>{t.priority.toLowerCase()}</span>
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                            {t.prospect_id && <Link to={`/app/contacts/${t.prospect_id}`} className="font-medium text-indigo-600 hover:text-indigo-800">{t.contact_name || t.contact_email}</Link>}
                                            {t.account_id && <Link to={`/app/accounts/${t.account_id}`} className="font-medium text-indigo-600 hover:text-indigo-800">{t.company_name}</Link>}
                                            {t.opportunity_id && <Link to={`/app/deals/${t.opportunity_id}`} className="font-medium text-indigo-600 hover:text-indigo-800">Deal: {t.opportunity_name}</Link>}
                                            {scope !== 'mine' && t.owner_name && <span>for {t.owner_name}</span>}
                                            {t.reminder_due && <span className="flex items-center gap-1 text-amber-600"><Bell className="w-3 h-3" />reminder</span>}
                                        </p>
                                        {t.notes && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.notes}</p>}
                                    </div>
                                    <div className="text-right whitespace-nowrap">
                                        {t.due_at ? (
                                            <p className={`text-xs font-semibold flex items-center gap-1 justify-end ${t.overdue ? 'text-red-600' : 'text-slate-600'}`} title={formatDateTime(t.due_at)}>
                                                {t.overdue && <AlertCircle className="w-3.5 h-3.5" />}{formatDateTime(t.due_at)}
                                            </p>
                                        ) : <p className="text-xs text-slate-400">No due date</p>}
                                        {done && t.completed_at && <p className="text-[11px] text-slate-400">done {relativeDate(t.completed_at)}</p>}
                                    </div>
                                    <button onClick={() => window.confirm(`Delete the task "${t.title}"?`) && remove.mutate(t.task_id)}
                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg" aria-label="Delete task"><Trash2 className="w-4 h-4" /></button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {creating && <NewTaskModal owners={owners} canAssign={canManage} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); refresh(); }} />}
        </div>
    );
}
