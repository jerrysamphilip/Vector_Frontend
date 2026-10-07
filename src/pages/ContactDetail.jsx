import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, Mail, Phone, Smartphone, Building2, Linkedin, MapPin, Pencil, Trash2, Loader2,
    StickyNote, PhoneCall, CalendarDays, Send, Inbox, Eye, MousePointerClick, AlertOctagon,
    MailX, Megaphone, ListPlus, Check, X, Globe2, History, CheckSquare, Square, AlertTriangle, ListTodo, Plus,
} from 'lucide-react';
import { contactsApi, tasksApi, errorMessage } from '../api/contacts';
import { dealsApi, leadsApi, moneyShort } from '../api/sales';
import { NewLeadModal } from './Leads';
import { DealStatusBadge, LeadStageBadge } from '../components/sales/shared';
import {
    Avatar, TagInput, OwnerSelect, CustomFieldInput, Field, inputClass, ErrorNote,
    PrimaryButton, SecondaryButton, formatDateTime, relativeDate, parseDate, useCrmMeta,
    StageBadge, StatusBadge, formatCustomValue,
} from '../components/contacts/shared';

const CALL_OUTCOMES = ['Connected', 'Left voicemail', 'No answer', 'Wrong number', 'Busy'];

const TIMELINE_FILTERS = [
    ['', 'All'], ['NOTE', 'Notes'], ['CALL', 'Calls'], ['EMAIL', 'Emails'], ['MEETING', 'Meetings'],
    ['TASK', 'Tasks'], ['PROPERTY', 'Changes'], ['CAMPAIGN,LIST', 'Campaigns & lists'],
];

const KIND_STYLE = {
    NOTE: { icon: StickyNote, color: 'bg-amber-100 text-amber-700', label: 'Note' },
    LIST_NOTE: { icon: StickyNote, color: 'bg-amber-50 text-amber-600', label: 'List note' },
    CALL: { icon: PhoneCall, color: 'bg-emerald-100 text-emerald-700', label: 'Call' },
    MEETING: { icon: CalendarDays, color: 'bg-violet-100 text-violet-700', label: 'Meeting' },
    EMAIL_LOGGED: { icon: Mail, color: 'bg-blue-50 text-blue-700', label: 'Email (logged)' },
    EMAIL_SENT: { icon: Send, color: 'bg-blue-100 text-blue-700', label: 'Email sent' },
    EMAIL_RECEIVED: { icon: Inbox, color: 'bg-cyan-100 text-cyan-700', label: 'Reply received' },
    EMAIL_OPENED: { icon: Eye, color: 'bg-slate-100 text-slate-600', label: 'Opened' },
    EMAIL_CLICKED: { icon: MousePointerClick, color: 'bg-slate-100 text-slate-600', label: 'Clicked a link' },
    EMAIL_BOUNCED: { icon: AlertOctagon, color: 'bg-red-100 text-red-600', label: 'Bounced' },
    UNSUBSCRIBED: { icon: MailX, color: 'bg-red-100 text-red-600', label: 'Unsubscribed' },
    CAMPAIGN_ENROLLED: { icon: Megaphone, color: 'bg-indigo-100 text-indigo-700', label: 'Added to campaign' },
    ADDED_TO_LIST: { icon: ListPlus, color: 'bg-slate-100 text-slate-600', label: 'Added to list' },
    PROPERTY_CHANGE: { icon: History, color: 'bg-slate-100 text-slate-500', label: 'Property changed' },
    TASK: { icon: ListTodo, color: 'bg-rose-100 text-rose-700', label: 'Task' },
};

const card = 'bg-white rounded-2xl border border-gray-100 p-5';
const cardShadow = { boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };

function toLocalInput(date = new Date()) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

// ── Composer: note / call / email / meeting / task ─────────────
function Composer({ contactId, owners, onLogged }) {
    const [type, setType] = useState('NOTE');
    const blank = { subject: '', body: '', outcome: 'Connected', duration_minutes: '', occurred_at: toLocalInput(), due_at: '', priority: 'MEDIUM', owner_id: '' };
    const [form, setForm] = useState(blank);
    const [error, setError] = useState(null);
    const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

    const save = useMutation({
        mutationFn: () => type === 'TASK'
            ? tasksApi.create({ title: form.subject, notes: form.body || undefined, prospect_id: contactId, priority: form.priority,
                due_at: form.due_at ? new Date(form.due_at).toISOString() : undefined, owner_id: form.owner_id || undefined })
            : contactsApi.logActivity(contactId, {
                activity_type: type, subject: form.subject || undefined, body: form.body || undefined,
                outcome: type === 'CALL' ? form.outcome : undefined,
                duration_minutes: ['CALL', 'MEETING'].includes(type) && form.duration_minutes ? Number(form.duration_minutes) : undefined,
                occurred_at: type !== 'NOTE' && form.occurred_at ? new Date(form.occurred_at).toISOString() : undefined,
            }),
        onSuccess: () => { setForm(blank); setError(null); onLogged(); },
        onError: err => setError(errorMessage(err)),
    });

    const tabs = [['NOTE', 'Note', StickyNote], ['CALL', 'Call', PhoneCall], ['EMAIL', 'Email', Mail], ['MEETING', 'Meeting', CalendarDays], ['TASK', 'Task', ListTodo]];
    const subjectPlaceholder = { CALL: 'Call subject', EMAIL: 'Email subject', MEETING: 'Meeting title', TASK: 'What needs doing?' }[type];
    const canSave = type === 'TASK' ? form.subject.trim() : (form.body.trim() || form.subject.trim());

    return (
        <div className={card} style={cardShadow}>
            <div className="flex gap-1 mb-4 flex-wrap">
                {tabs.map(([value, label, Icon]) => (
                    <button key={value} onClick={() => setType(value)}
                        className={`h-8 px-3 rounded-lg text-sm font-medium flex items-center gap-1.5 ${type === value ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <Icon className="w-3.5 h-3.5" /> {value === 'NOTE' || value === 'TASK' ? label : `Log ${label.toLowerCase()}`}
                    </button>
                ))}
            </div>
            <div className="space-y-3">
                {type !== 'NOTE' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input className={`${inputClass} ${type === 'TASK' ? 'sm:col-span-3' : ''}`} value={form.subject} onChange={set('subject')} placeholder={subjectPlaceholder} />
                        {type !== 'TASK' && <input type="datetime-local" className={inputClass} value={form.occurred_at} onChange={set('occurred_at')} aria-label="When" />}
                        {type === 'CALL' && (
                            <div className="flex gap-2">
                                <select className={inputClass} value={form.outcome} onChange={set('outcome')} aria-label="Outcome">{CALL_OUTCOMES.map(o => <option key={o}>{o}</option>)}</select>
                                <input type="number" min="0" className={`${inputClass} w-24`} value={form.duration_minutes} onChange={set('duration_minutes')} placeholder="Mins" aria-label="Duration in minutes" />
                            </div>
                        )}
                        {type === 'MEETING' && <input type="number" min="0" className={inputClass} value={form.duration_minutes} onChange={set('duration_minutes')} placeholder="Minutes" aria-label="Duration in minutes" />}
                        {type === 'TASK' && <>
                            <Field label="Due"><input type="datetime-local" className={inputClass} value={form.due_at} onChange={set('due_at')} /></Field>
                            <Field label="Priority"><select className={inputClass} value={form.priority} onChange={set('priority')}><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></Field>
                            <Field label="Assign to"><select className={inputClass} value={form.owner_id} onChange={set('owner_id')}><option value="">Me</option>{owners.map(o => <option key={o.user_id} value={o.user_id}>{o.name}</option>)}</select></Field>
                        </>}
                    </div>
                )}
                <textarea rows={type === 'NOTE' ? 3 : 2} value={form.body} onChange={set('body')}
                    placeholder={{ NOTE: 'Write a note about this contact…', TASK: 'Notes (optional)', EMAIL: 'What did the email say?' }[type] || 'What was discussed?'}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 resize-y" />
                <ErrorNote message={error} />
                <div className="flex justify-end">
                    <PrimaryButton onClick={() => save.mutate()} loading={save.isPending} disabled={!canSave}>
                        {{ NOTE: 'Save note', CALL: 'Log call', EMAIL: 'Log email', MEETING: 'Log meeting', TASK: 'Create task' }[type]}
                    </PrimaryButton>
                </div>
            </div>
        </div>
    );
}

// ── Timeline ────────────────────────────────────────────────────
function ActivityBody({ item, onChanged }) {
    const a = item.activity;
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({ subject: a.subject || '', body: a.body || '', outcome: a.outcome || '' });
    const save = useMutation({ mutationFn: () => contactsApi.updateActivity(a.activity_id, draft), onSuccess: () => { setEditing(false); onChanged(); } });
    const remove = useMutation({ mutationFn: () => contactsApi.deleteActivity(a.activity_id), onSuccess: onChanged });

    if (editing) {
        return (
            <div className="space-y-2 mt-1">
                {a.activity_type !== 'NOTE' && <input className={inputClass} value={draft.subject} onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))} placeholder="Subject" />}
                {a.activity_type === 'CALL' && (
                    <select className={inputClass} value={draft.outcome} onChange={e => setDraft(d => ({ ...d, outcome: e.target.value }))}>{CALL_OUTCOMES.map(o => <option key={o}>{o}</option>)}</select>
                )}
                <textarea rows={3} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" value={draft.body} onChange={e => setDraft(d => ({ ...d, body: e.target.value }))} />
                <div className="flex gap-2">
                    <PrimaryButton onClick={() => save.mutate()} loading={save.isPending} className="h-8 px-3 text-xs"><Check className="w-3.5 h-3.5" /> Save</PrimaryButton>
                    <SecondaryButton onClick={() => setEditing(false)} className="h-8 px-3 text-xs">Cancel</SecondaryButton>
                </div>
            </div>
        );
    }
    return (
        <div>
            {a.subject && (a.activity_type !== 'NOTE' || !a.body) && <p className={`text-sm ${a.activity_type === 'NOTE' ? 'text-slate-700' : 'font-semibold text-slate-800'}`}>{a.subject}</p>}
            {(a.outcome || a.duration_minutes) && <p className="text-xs text-slate-500 mt-0.5">{[a.outcome, a.duration_minutes ? `${a.duration_minutes} min` : null].filter(Boolean).join(' · ')}</p>}
            {a.body && <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{a.body}</p>}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                <span>{a.created_by_name ? `by ${a.created_by_name}` : ''}</span>
                {item.can_edit && <>
                    <button onClick={() => setEditing(true)} className="hover:text-indigo-600 flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit</button>
                    <button onClick={() => window.confirm('Delete this activity?') && remove.mutate()} className="hover:text-red-600 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
                </>}
            </div>
        </div>
    );
}

function TimelineItem({ item, onChanged }) {
    const style = KIND_STYLE[item.kind] || KIND_STYLE.NOTE;
    const Icon = style.icon;
    let body = null;
    let label = style.label;
    if (item.activity) body = <ActivityBody item={item} onChanged={onChanged} />;
    else if (item.kind === 'PROPERTY_CHANGE') {
        const c = item.change;
        label = c.field === 'created' ? 'Created' : c.field === 'deleted' ? (c.new_value ? 'Deleted' : 'Restored') : `${c.label} changed`;
        body = (
            <p className="text-sm text-slate-600">
                {['created', 'deleted'].includes(c.field) ? (c.new_value || 'Restored') : <>
                    <span className="line-through text-slate-400">{c.old_value || 'empty'}</span> → <span className="font-medium text-slate-800">{c.new_value || 'empty'}</span>
                </>}
                <span className="text-xs text-slate-400"> · {c.changed_by_name ? `by ${c.changed_by_name}` : 'system'} · {c.source.toLowerCase()}</span>
            </p>
        );
    } else if (item.kind === 'TASK') {
        const t = item.task;
        label = t.status === 'DONE' ? 'Task completed' : 'Task';
        body = (
            <div>
                <p className={`text-sm font-semibold ${t.status === 'DONE' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{t.title}</p>
                <p className="text-xs text-slate-500">{[t.owner_name && `for ${t.owner_name}`, t.due_at && `due ${formatDateTime(t.due_at)}`, t.priority.toLowerCase()].filter(Boolean).join(' · ')}</p>
                {t.notes && <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{t.notes}</p>}
            </div>
        );
    } else if (item.kind === 'EMAIL_SENT' || item.kind === 'EMAIL_RECEIVED') {
        const e = item.email;
        body = (
            <div>
                <p className="text-sm font-semibold text-slate-800">{e.subject || '(no subject)'}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                    {item.kind === 'EMAIL_SENT' ? `To ${e.to_email}` : `From ${e.from_email || e.to_email}`}
                    {e.campaign_name ? ` · ${e.campaign_name}` : ''}{item.kind === 'EMAIL_SENT' && (e.final_status || e.status) ? ` · ${(e.final_status || e.status).toLowerCase()}` : ''}
                </p>
                {e.failure_reason && ['FAILED', 'BOUNCED', 'CANCELLED', 'REJECTED'].includes(e.status) && <p className="text-xs text-red-600 mt-0.5">{e.failure_reason}</p>}
                {e.snippet && <p className="text-sm text-slate-600 mt-1 line-clamp-3 whitespace-pre-wrap">{e.snippet}</p>}
                {item.kind === 'EMAIL_RECEIVED' && e.conversation_id && <Link to="/app/inbox" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 mt-1 inline-block">Open in Inbox →</Link>}
            </div>
        );
    } else if (item.email) body = <p className="text-sm text-slate-600">{item.email.subject || '(no subject)'}</p>;
    else if (item.campaign) body = (
        <p className="text-sm text-slate-600">
            <Link to={`/app/campaigns/${item.campaign.campaign_id}`} className="font-semibold text-indigo-600 hover:text-indigo-800">{item.campaign.campaign_name}</Link>
            <span className="text-slate-400"> · {item.campaign.status?.toLowerCase()}</span>
        </p>
    );
    else if (item.list) body = (
        <div>
            <p className="text-sm text-slate-600">{item.list.list_name}</p>
            {item.body && <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{item.body}</p>}
        </div>
    );

    return (
        <li className="relative pl-12 pb-6 last:pb-0">
            <span className="absolute left-[15px] top-8 bottom-0 w-px bg-slate-100" />
            <span className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center ${style.color}`}><Icon className="w-4 h-4" /></span>
            <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
                <time className="text-xs text-slate-400 whitespace-nowrap" title={formatDateTime(item.at)}>{relativeDate(item.at)} · {parseDate(item.at).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}</time>
            </div>
            <div className="mt-1">{body}</div>
        </li>
    );
}

// ── Left column: CRM properties + details ───────────────────────
function CrmCard({ contact, meta, onUpdate, error }) {
    const unsub = contact.consent_status === 'UNSUBSCRIBED';
    return (
        <div className={card} style={cardShadow}>
            <h2 className="text-sm font-bold text-slate-800 mb-3">About this contact</h2>
            <div className="space-y-3">
                <Field label="Lifecycle stage" hint={contact.can_override_lifecycle ? null : 'Moves forward only'}>
                    <select className={inputClass} value={contact.lifecycle_stage || ''} onChange={e => onUpdate({ lifecycle_stage: e.target.value })}>
                        {!contact.lifecycle_stage && <option value="">—</option>}
                        {(meta?.lifecycle_stages || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </Field>
                <Field label="Lead status">
                    <select className={inputClass} value={contact.lead_status || ''} onChange={e => onUpdate({ lead_status: e.target.value || null })}>
                        <option value="">—</option>
                        {(meta?.lead_statuses || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </Field>
                <Field label="Email subscription">
                    <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-semibold ${unsub ? 'text-red-600' : 'text-emerald-700'}`}>{unsub ? 'Unsubscribed' : 'Subscribed'}</span>
                        <button onClick={() => window.confirm(unsub
                            ? 'Resubscribe this contact? They are removed from the global unsubscribe list and can be emailed again. Only do this with their consent.'
                            : 'Unsubscribe this contact? They are added to the global unsubscribe list and queued emails are cancelled.') && onUpdate({ consent_status: unsub ? 'OPT_IN' : 'UNSUBSCRIBED' })}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">{unsub ? 'Resubscribe' : 'Unsubscribe'}</button>
                    </div>
                </Field>
                <Field label="Legal basis for processing">
                    <select className={inputClass} value={contact.legal_basis || ''} onChange={e => onUpdate({ legal_basis: e.target.value || null })}>
                        <option value="">Not recorded</option>
                        {(meta?.legal_bases || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </Field>
                <ErrorNote message={error} />
            </div>
        </div>
    );
}

function DetailsCard({ contact, fields, onSaved }) {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({});
    const [error, setError] = useState(null);
    const start = () => {
        setForm({
            first_name: contact.first_name || '', last_name: contact.last_name || '', email: contact.email || '',
            phone: contact.phone || '', mobile_phone: contact.mobile_phone || '', designation: contact.designation || '',
            company_name: contact.company_name || '', industry: contact.industry || '', linkedin_url: contact.linkedin_url || '',
            poc_city: contact.poc_city || '', poc_state: contact.poc_state || '', poc_country: contact.poc_country || '',
            lead_source: contact.lead_source || '',
            custom_fields: Object.fromEntries(fields.map(f => [f.field_key, contact.custom_fields?.[f.field_key] ?? (f.field_type === 'MULTI_CHECKBOX' ? [] : '')])),
        });
        setError(null);
        setEditing(true);
    };
    const save = useMutation({
        mutationFn: () => {
            const payload = { ...form };
            if (payload.company_name === (contact.company_name || '')) delete payload.company_name;
            if (!payload.email) delete payload.email;
            return contactsApi.update(contact.prospect_id, payload);
        },
        onSuccess: (data) => { setEditing(false); onSaved(data); },
        onError: err => setError(errorMessage(err)),
    });
    const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
    const groups = fields.reduce((acc, f) => { (acc[f.group_name || 'Other properties'] ||= []).push(f); return acc; }, {});

    const rows = [
        [Mail, 'Email', contact.email && <a href={`mailto:${contact.email}`} className="text-indigo-600 hover:underline break-all">{contact.email}</a>],
        [Phone, 'Phone', contact.phone && <a href={`tel:${contact.phone}`} className="text-indigo-600 hover:underline">{contact.phone}</a>],
        [Smartphone, 'Mobile', contact.mobile_phone && <a href={`tel:${contact.mobile_phone}`} className="text-indigo-600 hover:underline">{contact.mobile_phone}</a>],
        [Building2, 'Industry', contact.industry],
        [MapPin, 'Location', [contact.poc_city, contact.poc_state, contact.poc_country].filter(Boolean).join(', ')],
        [Globe2, 'Time zone', contact.timezone],
        [Linkedin, 'LinkedIn', contact.linkedin_url && <a href={contact.linkedin_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Profile</a>],
        [ListPlus, 'Lead source', contact.lead_source],
        [CalendarDays, 'Created', formatDateTime(contact.created_at)],
        [Send, 'Last contacted', contact.last_contacted_at ? formatDateTime(contact.last_contacted_at) : null],
        [History, 'Last activity', contact.last_activity_at ? formatDateTime(contact.last_activity_at) : null],
    ];

    return (
        <div className={card} style={cardShadow}>
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-800">Details</h2>
                {!editing && <button onClick={start} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit</button>}
            </div>
            {editing ? (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <Field label="First name"><input className={inputClass} value={form.first_name} onChange={set('first_name')} /></Field>
                        <Field label="Last name"><input className={inputClass} value={form.last_name} onChange={set('last_name')} /></Field>
                    </div>
                    <Field label="Email"><input type="email" className={inputClass} value={form.email} onChange={set('email')} /></Field>
                    <div className="grid grid-cols-2 gap-2">
                        <Field label="Phone"><input type="tel" className={inputClass} value={form.phone} onChange={set('phone')} /></Field>
                        <Field label="Mobile"><input type="tel" className={inputClass} value={form.mobile_phone} onChange={set('mobile_phone')} /></Field>
                    </div>
                    <Field label="Job title"><input className={inputClass} value={form.designation} onChange={set('designation')} /></Field>
                    <Field label="Company" hint="Changing it links the contact to that company"><input className={inputClass} value={form.company_name} onChange={set('company_name')} /></Field>
                    <Field label="Industry"><input className={inputClass} value={form.industry} onChange={set('industry')} /></Field>
                    <Field label="Lead source"><input className={inputClass} value={form.lead_source} onChange={set('lead_source')} /></Field>
                    <div className="grid grid-cols-3 gap-2">
                        <Field label="City"><input className={inputClass} value={form.poc_city} onChange={set('poc_city')} /></Field>
                        <Field label="State"><input className={inputClass} value={form.poc_state} onChange={set('poc_state')} /></Field>
                        <Field label="Country"><input className={inputClass} value={form.poc_country} onChange={set('poc_country')} /></Field>
                    </div>
                    <Field label="LinkedIn"><input type="url" className={inputClass} value={form.linkedin_url} onChange={set('linkedin_url')} /></Field>
                    {Object.entries(groups).map(([group, gf]) => (
                        <div key={group} className="space-y-3 pt-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{group}</p>
                            {gf.map(f => (
                                <Field key={f.field_id} label={`${f.label}${f.required ? ' *' : ''}`}>
                                    <CustomFieldInput field={f} value={form.custom_fields[f.field_key]}
                                        onChange={v => setForm(s => ({ ...s, custom_fields: { ...s.custom_fields, [f.field_key]: v } }))} />
                                </Field>
                            ))}
                        </div>
                    ))}
                    <ErrorNote message={error} />
                    <div className="flex gap-2">
                        <PrimaryButton onClick={() => save.mutate()} loading={save.isPending} className="flex-1">Save</PrimaryButton>
                        <SecondaryButton onClick={() => setEditing(false)} className="flex-1">Cancel</SecondaryButton>
                    </div>
                </div>
            ) : (
                <dl className="space-y-2.5">
                    {rows.map(([Icon, label, value]) => (
                        <div key={label} className="flex items-start gap-3 text-sm">
                            <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <dt className="w-24 text-slate-500 flex-shrink-0">{label}</dt>
                            <dd className="text-slate-800 min-w-0">{value || <span className="text-slate-300">—</span>}</dd>
                        </div>
                    ))}
                    {Object.entries(groups).map(([group, gf]) => (
                        <div key={group}>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-4 mb-2">{group}</p>
                            {gf.map(f => (
                                <div key={f.field_id} className="flex items-start gap-3 text-sm py-1">
                                    <span className="w-4 flex-shrink-0" />
                                    <dt className="w-24 text-slate-500 flex-shrink-0 truncate" title={f.label}>{f.label}</dt>
                                    <dd className="text-slate-800 min-w-0 break-words">{formatCustomValue(f, contact.custom_fields?.[f.field_key]) ?? <span className="text-slate-300">—</span>}</dd>
                                </div>
                            ))}
                        </div>
                    ))}
                </dl>
            )}
        </div>
    );
}

function SideCard({ title, children, empty, action }) {
    return (
        <div className={card} style={cardShadow}>
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-800">{title}</h2>
                {action}
            </div>
            {children || <p className="text-sm text-slate-400">{empty}</p>}
        </div>
    );
}

function TasksCard({ contactId, onChanged }) {
    const queryClient = useQueryClient();
    const { data } = useQuery({ queryKey: ['tasks', 'contact', contactId], queryFn: () => tasksApi.list({ prospect_id: contactId, status: 'ALL' }) });
    const toggle = useMutation({
        mutationFn: t => tasksApi.update(t.task_id, { status: t.status === 'DONE' ? 'OPEN' : 'DONE' }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); onChanged(); },
    });
    const items = data?.items || [];
    const open = items.filter(t => t.status === 'OPEN');
    const done = items.filter(t => t.status === 'DONE').slice(0, 3);
    return (
        <SideCard title={`Tasks${open.length ? ` (${open.length})` : ''}`} empty="No tasks. Use the Task tab to add one.">
            {items.length > 0 && (
                <ul className="space-y-2">
                    {[...open, ...done].map(t => (
                        <li key={t.task_id} className="flex items-start gap-2 text-sm">
                            <button onClick={() => toggle.mutate(t)} className="mt-0.5 text-slate-400 hover:text-indigo-600" aria-label={t.status === 'DONE' ? 'Reopen task' : 'Complete task'}>
                                {t.status === 'DONE' ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                            </button>
                            <div className="min-w-0">
                                <p className={t.status === 'DONE' ? 'text-slate-400 line-through' : 'text-slate-800'}>{t.title}</p>
                                <p className={`text-xs ${t.overdue ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                                    {[t.due_at && (t.overdue ? `Overdue · ${formatDateTime(t.due_at)}` : `Due ${formatDateTime(t.due_at)}`), t.owner_name].filter(Boolean).join(' · ')}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </SideCard>
    );
}

/** The contact's lead and deals (BRD v2.0 5.6, 5.7). */
function SalesCard({ contact }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [creating, setCreating] = useState(false);
    const id = contact.prospect_id;
    const { data: leads } = useQuery({ queryKey: ['leads', 'contact', id], queryFn: () => leadsApi.list({ prospect_id: id, page_size: 10 }) });
    const { data: deals } = useQuery({ queryKey: ['deals', 'contact', id], queryFn: () => dealsApi.list({ prospect_id: id, page_size: 10, sort_by: 'created_at', sort_order: 'desc' }) });
    const leadItems = leads?.items || [];
    const dealItems = deals?.items || [];
    const hasOpenLead = leadItems.some(l => ['NEW', 'CONTACTED', 'ENGAGED', 'SQL'].includes(l.stage));
    return (
        <SideCard title="Sales" empty="No lead or opportunity yet."
            action={!hasOpenLead && <button onClick={() => setCreating(true)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">+ Create lead</button>}>
            {(leadItems.length > 0 || dealItems.length > 0) && (
                <ul className="space-y-2">
                    {leadItems.map(l => (
                        <li key={l.lead_id}><Link to={`/app/leads/${l.lead_id}`} className="flex items-center justify-between gap-2 text-sm hover:text-indigo-700">
                            <span className="truncate">Lead · {l.owner_name}</span><LeadStageBadge stage={l.stage} label={l.stage_label} /></Link></li>
                    ))}
                    {dealItems.map(d => (
                        <li key={d.opportunity_id}><Link to={`/app/deals/${d.opportunity_id}`} className="flex items-center justify-between gap-2 text-sm hover:text-indigo-700">
                            <span className="truncate">{d.name} · {moneyShort(d.amount)}</span><DealStatusBadge status={d.status} stageName={d.stage_name} /></Link></li>
                    ))}
                </ul>
            )}
            {creating && <NewLeadModal contact={contact} onClose={() => setCreating(false)}
                onCreated={l => { setCreating(false); queryClient.invalidateQueries({ queryKey: ['leads'] }); navigate(`/app/leads/${l.lead_id}`); }} />}
        </SideCard>
    );
}

// ── Page ────────────────────────────────────────────────────────
export default function ContactDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { meta, stageLabel, statusLabel } = useCrmMeta();
    const [timelineFilter, setTimelineFilter] = useState('');
    const [timelineUser, setTimelineUser] = useState('');
    const [quickError, setQuickError] = useState(null);

    const { data: contact, isLoading, error } = useQuery({ queryKey: ['contact', id], queryFn: () => contactsApi.get(id), retry: false });
    const { data: timeline, isFetching: timelineLoading } = useQuery({
        queryKey: ['contact-timeline', id, timelineFilter, timelineUser],
        queryFn: () => contactsApi.timeline(id, { types: timelineFilter, user_id: timelineUser }),
        enabled: !!contact,
    });
    const { data: owners = [] } = useQuery({ queryKey: ['contact-owners'], queryFn: contactsApi.owners });
    const { data: fields = [] } = useQuery({ queryKey: ['contact-fields'], queryFn: contactsApi.fields });
    const { data: facets } = useQuery({ queryKey: ['contact-facets'], queryFn: contactsApi.facets });

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['contact', id] });
        queryClient.invalidateQueries({ queryKey: ['contact-timeline', id] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
    };
    const onSaved = data => {
        queryClient.setQueryData(['contact', id], data);
        queryClient.invalidateQueries({ queryKey: ['contact-timeline', id] });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        queryClient.invalidateQueries({ queryKey: ['contact-facets'] });
    };

    const quickUpdate = useMutation({
        mutationFn: payload => contactsApi.update(id, payload),
        onSuccess: data => { setQuickError(null); onSaved(data); },
        onError: err => setQuickError(errorMessage(err)),
    });
    const remove = useMutation({
        mutationFn: () => contactsApi.remove(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contacts'] }); navigate('/app/contacts'); },
    });

    if (isLoading) return <div className="py-32 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-indigo-500" /></div>;
    if (error || !contact) {
        return (
            <div className="py-24 text-center">
                <p className="text-lg font-bold text-slate-800">Contact not found</p>
                <p className="text-sm text-slate-500 mt-1">It may have been deleted or merged, or it's owned by someone else.</p>
                <Link to="/app/contacts" className="inline-block mt-5 text-sm font-semibold text-indigo-600">← Back to contacts</Link>
            </div>
        );
    }

    const s = contact.stats;
    const stats = [
        ['Emails sent', s.emails_sent], ['Opened', s.emails_opened], ['Replies', s.replies],
        ['Calls', s.calls], ['Meetings', s.meetings], ['Open tasks', s.open_tasks],
    ];

    return (
        <div className="w-full space-y-5">
            <button onClick={() => navigate(-1)} className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>

            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={cardShadow}>
                <div className="h-1.5" style={{ background: '#4f46e5' }} />
                <div className="p-6 flex flex-col lg:flex-row lg:items-start gap-5">
                    <Avatar first={contact.first_name} last={contact.last_name} seed={contact.email} size="lg" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{contact.full_name}</h1>
                            <StageBadge value={contact.lifecycle_stage} label={stageLabel[contact.lifecycle_stage]} />
                            <StatusBadge value={contact.lead_status} label={statusLabel[contact.lead_status]} />
                            {contact.consent_status === 'UNSUBSCRIBED' && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Unsubscribed</span>}
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {contact.designation}
                            {contact.designation && (contact.account || contact.company_name) && ' at '}
                            {contact.account
                                ? <Link to={`/app/accounts/${contact.account.account_id}`} className="font-semibold text-indigo-600 hover:text-indigo-800">{contact.account.name}</Link>
                                : contact.company_name}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-sm flex-wrap">
                            <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600"><Mail className="w-4 h-4" />{contact.email}</a>
                            {contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600"><Phone className="w-4 h-4" />{contact.phone}</a>}
                            {contact.mobile_phone && <a href={`tel:${contact.mobile_phone}`} className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600"><Smartphone className="w-4 h-4" />{contact.mobile_phone}</a>}
                        </div>
                        {contact.quality_flags?.length > 0 && (
                            <div className="mt-3 flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 max-w-xl">
                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> <span>{contact.quality_flags.join(' · ')}</span>
                            </div>
                        )}
                        <div className="mt-4 max-w-xl">
                            <TagInput value={contact.tags} onChange={tags => quickUpdate.mutate({ tags })} suggestions={(facets?.tags || []).map(t => t.tag)} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 lg:w-56">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Owner</p>
                            {contact.can_edit_owner
                                ? <OwnerSelect owners={owners} value={contact.owner_id} onChange={owner_id => quickUpdate.mutate({ owner_id })} />
                                : <p className="text-sm font-medium text-slate-800">{contact.owner_name || 'Unassigned'}</p>}
                        </div>
                        {contact.can_delete && (
                            <button onClick={() => window.confirm(`Delete ${contact.full_name}? You can restore them from Recently deleted for 90 days.`) && remove.mutate()}
                                className="h-9 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl flex items-center justify-center gap-1.5 border border-red-100">
                                {remove.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete contact
                            </button>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-3 lg:grid-cols-6 border-t border-slate-100 divide-x divide-slate-100">
                    {stats.map(([label, value]) => (
                        <div key={label} className="px-5 py-3">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                            <p className="text-lg font-bold text-slate-800">{value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Three columns: properties · activity · associations (BR-CM-12) */}
            <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_300px] gap-5 items-start">
                <div className="space-y-5">
                    <CrmCard contact={contact} meta={meta} onUpdate={payload => quickUpdate.mutate(payload)} error={quickError} />
                    <DetailsCard contact={contact} fields={fields} onSaved={onSaved} />
                </div>

                <div className="space-y-5 min-w-0">
                    <Composer contactId={id} owners={owners} onLogged={refresh} />
                    <div className={card} style={cardShadow}>
                        <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
                            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">Activity {timelineLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}</h2>
                            <select value={timelineUser} onChange={e => setTimelineUser(e.target.value)} className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-600" aria-label="Filter by user">
                                <option value="">Everyone</option>
                                {owners.map(o => <option key={o.user_id} value={o.user_id}>{o.name}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-1 flex-wrap mb-5">
                            {TIMELINE_FILTERS.map(([value, label]) => (
                                <button key={label} onClick={() => setTimelineFilter(value)}
                                    className={`h-7 px-2.5 rounded-lg text-xs font-semibold ${timelineFilter === value ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{label}</button>
                            ))}
                        </div>
                        {(timeline?.items || []).length === 0 ? (
                            <p className="text-sm text-slate-400 py-8 text-center">Nothing here yet.</p>
                        ) : (
                            <ul>
                                {timeline.items.map((item, i) => (
                                    <TimelineItem key={`${item.kind}-${item.activity?.activity_id || item.change?.change_id || item.task?.task_id || item.email?.message_id || item.list?.list_id || item.campaign?.campaign_id}-${i}`} item={item} onChanged={refresh} />
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="space-y-5 lg:col-start-2 2xl:col-start-auto">
                    <SalesCard contact={contact} />
                    <SideCard title="Company" empty="Not linked to a company.">
                        {contact.account && (
                            <div className="text-sm">
                                <Link to={`/app/accounts/${contact.account.account_id}`} className="font-semibold text-indigo-600 hover:text-indigo-800">{contact.account.name}</Link>
                                <p className="text-xs text-slate-500 mt-0.5">{[contact.account.domain, contact.account.industry].filter(Boolean).join(' · ')}</p>
                                <p className="text-xs text-slate-500 mt-1">{contact.account.contact_count} contact{contact.account.contact_count === 1 ? '' : 's'}{contact.account.lifecycle_stage ? ` · ${stageLabel[contact.account.lifecycle_stage] || contact.account.lifecycle_stage}` : ''}</p>
                            </div>
                        )}
                    </SideCard>
                    <TasksCard contactId={id} onChanged={refresh} />
                    <SideCard title="Lists" empty="Not on any list.">
                        {contact.lists.length > 0 && (
                            <ul className="space-y-2">
                                {contact.lists.map(l => (
                                    <li key={l.list_id} className="text-sm flex justify-between gap-2">
                                        <Link to={`/app/contacts?list_id=${l.list_id}`} className="text-slate-700 hover:text-indigo-600 truncate">{l.list_name}</Link>
                                        <span className="text-xs text-slate-400 whitespace-nowrap">{l.list_type === 'ACTIVE' ? 'active' : relativeDate(l.added_at)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </SideCard>
                    <SideCard title="Campaigns" empty="Not in any campaign yet.">
                        {contact.campaigns.length > 0 && (
                            <ul className="space-y-2.5">
                                {contact.campaigns.map(c => (
                                    <li key={c.campaign_id} className="text-sm">
                                        <Link to={`/app/campaigns/${c.campaign_id}`} className="font-semibold text-indigo-600 hover:text-indigo-800">{c.campaign_name}</Link>
                                        <p className="text-xs text-slate-500">Step {c.current_step} · {c.status?.toLowerCase()} · enrolled {relativeDate(c.enrolled_at)}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </SideCard>
                </div>
            </div>
        </div>
    );
}
