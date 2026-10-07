import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, Mail, Phone, Smartphone, Building2, Linkedin, MapPin, Pencil, Trash2, Loader2,
    StickyNote, PhoneCall, CalendarDays, Send, Inbox, Eye, MousePointerClick, AlertOctagon,
    MailX, Megaphone, ListPlus, Check, X, Globe2,
} from 'lucide-react';
import { contactsApi, errorMessage } from '../api/contacts';
import {
    Avatar, TagInput, OwnerSelect, CustomFieldInput, Field, inputClass, ErrorNote,
    PrimaryButton, SecondaryButton, formatDateTime, relativeDate, parseDate,
} from '../components/contacts/shared';

const CALL_OUTCOMES = ['Connected', 'Left voicemail', 'No answer', 'Wrong number', 'Busy'];

const TIMELINE_FILTERS = [
    ['', 'All'], ['NOTE', 'Notes'], ['CALL', 'Calls'], ['MEETING', 'Meetings'], ['EMAIL', 'Emails'], ['CAMPAIGN,LIST', 'Campaigns & lists'],
];

const KIND_STYLE = {
    NOTE: { icon: StickyNote, color: 'bg-amber-100 text-amber-700', label: 'Note' },
    LIST_NOTE: { icon: StickyNote, color: 'bg-amber-50 text-amber-600', label: 'List note' },
    CALL: { icon: PhoneCall, color: 'bg-emerald-100 text-emerald-700', label: 'Call' },
    MEETING: { icon: CalendarDays, color: 'bg-violet-100 text-violet-700', label: 'Meeting' },
    EMAIL_SENT: { icon: Send, color: 'bg-blue-100 text-blue-700', label: 'Email sent' },
    EMAIL_RECEIVED: { icon: Inbox, color: 'bg-cyan-100 text-cyan-700', label: 'Reply received' },
    EMAIL_OPENED: { icon: Eye, color: 'bg-slate-100 text-slate-600', label: 'Opened' },
    EMAIL_CLICKED: { icon: MousePointerClick, color: 'bg-slate-100 text-slate-600', label: 'Clicked a link' },
    EMAIL_BOUNCED: { icon: AlertOctagon, color: 'bg-red-100 text-red-600', label: 'Bounced' },
    UNSUBSCRIBED: { icon: MailX, color: 'bg-red-100 text-red-600', label: 'Unsubscribed' },
    CAMPAIGN_ENROLLED: { icon: Megaphone, color: 'bg-indigo-100 text-indigo-700', label: 'Added to campaign' },
    ADDED_TO_LIST: { icon: ListPlus, color: 'bg-slate-100 text-slate-600', label: 'Added to list' },
};

function toLocalInput(date = new Date()) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

// ── Log activity ────────────────────────────────────────────────
function ActivityComposer({ contactId, onLogged }) {
    const [type, setType] = useState('NOTE');
    const [form, setForm] = useState({ subject: '', body: '', outcome: 'Connected', duration_minutes: '', occurred_at: toLocalInput() });
    const [error, setError] = useState(null);
    const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

    const log = useMutation({
        mutationFn: () => contactsApi.logActivity(contactId, {
            activity_type: type,
            subject: form.subject || undefined,
            body: form.body || undefined,
            outcome: type === 'CALL' ? form.outcome : undefined,
            duration_minutes: type !== 'NOTE' && form.duration_minutes ? Number(form.duration_minutes) : undefined,
            occurred_at: type !== 'NOTE' && form.occurred_at ? new Date(form.occurred_at).toISOString() : undefined,
        }),
        onSuccess: () => {
            setForm(f => ({ ...f, subject: '', body: '', duration_minutes: '', occurred_at: toLocalInput() }));
            setError(null);
            onLogged();
        },
        onError: err => setError(errorMessage(err)),
    });

    const tabs = [['NOTE', 'Note', StickyNote], ['CALL', 'Log call', PhoneCall], ['MEETING', 'Log meeting', CalendarDays]];

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex gap-1 mb-4">
                {tabs.map(([value, label, Icon]) => (
                    <button key={value} onClick={() => setType(value)}
                        className={`h-8 px-3 rounded-lg text-sm font-medium flex items-center gap-1.5 ${type === value ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <Icon className="w-3.5 h-3.5" /> {label}
                    </button>
                ))}
            </div>
            <div className="space-y-3">
                {type !== 'NOTE' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input className={inputClass} value={form.subject} onChange={set('subject')} placeholder={type === 'CALL' ? 'Call subject' : 'Meeting title'} />
                        <input type="datetime-local" className={inputClass} value={form.occurred_at} onChange={set('occurred_at')} aria-label="When" />
                        <div className="flex gap-2">
                            {type === 'CALL' && (
                                <select className={inputClass} value={form.outcome} onChange={set('outcome')} aria-label="Outcome">
                                    {CALL_OUTCOMES.map(o => <option key={o}>{o}</option>)}
                                </select>
                            )}
                            <input type="number" min="0" className={`${inputClass} ${type === 'CALL' ? 'w-24' : ''}`} value={form.duration_minutes} onChange={set('duration_minutes')} placeholder="Mins" aria-label="Duration in minutes" />
                        </div>
                    </div>
                )}
                <textarea rows={type === 'NOTE' ? 3 : 2} value={form.body} onChange={set('body')}
                    placeholder={type === 'NOTE' ? 'Write a note about this contact…' : 'What was discussed?'}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 resize-y" />
                <ErrorNote message={error} />
                <div className="flex justify-end">
                    <PrimaryButton onClick={() => log.mutate()} loading={log.isPending} disabled={!form.body.trim() && !form.subject.trim()}>
                        {type === 'NOTE' ? 'Save note' : type === 'CALL' ? 'Log call' : 'Log meeting'}
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
    const save = useMutation({
        mutationFn: () => contactsApi.updateActivity(a.activity_id, draft),
        onSuccess: () => { setEditing(false); onChanged(); },
    });
    const remove = useMutation({ mutationFn: () => contactsApi.deleteActivity(a.activity_id), onSuccess: onChanged });

    if (editing) {
        return (
            <div className="space-y-2 mt-1">
                {a.activity_type !== 'NOTE' && <input className={inputClass} value={draft.subject} onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))} placeholder="Subject" />}
                {a.activity_type === 'CALL' && (
                    <select className={inputClass} value={draft.outcome} onChange={e => setDraft(d => ({ ...d, outcome: e.target.value }))}>
                        {CALL_OUTCOMES.map(o => <option key={o}>{o}</option>)}
                    </select>
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
        <div className="group">
            {a.subject && a.activity_type !== 'NOTE' && <p className="text-sm font-semibold text-slate-800">{a.subject}</p>}
            {a.subject && a.activity_type === 'NOTE' && !a.body && <p className="text-sm text-slate-700">{a.subject}</p>}
            {(a.outcome || a.duration_minutes) && (
                <p className="text-xs text-slate-500 mt-0.5">{[a.outcome, a.duration_minutes ? `${a.duration_minutes} min` : null].filter(Boolean).join(' · ')}</p>
            )}
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
    if (item.activity) body = <ActivityBody item={item} onChanged={onChanged} />;
    else if (item.kind === 'EMAIL_SENT' || item.kind === 'EMAIL_RECEIVED') {
        const e = item.email;
        body = (
            <div>
                <p className="text-sm font-semibold text-slate-800">{e.subject || '(no subject)'}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                    {item.kind === 'EMAIL_SENT' ? `To ${e.to_email}` : `From ${e.from_email || e.to_email}`}
                    {e.campaign_name ? ` · ${e.campaign_name}` : ''}{e.status && item.kind === 'EMAIL_SENT' ? ` · ${e.status.toLowerCase()}` : ''}
                </p>
                {e.snippet && <p className="text-sm text-slate-600 mt-1 line-clamp-3 whitespace-pre-wrap">{e.snippet}</p>}
                {item.kind === 'EMAIL_RECEIVED' && e.conversation_id && (
                    <Link to="/app/inbox" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 mt-1 inline-block">Open in Inbox →</Link>
                )}
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
            <span className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center ${style.color}`}>
                <Icon className="w-4 h-4" />
            </span>
            <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{style.label}</p>
                <time className="text-xs text-slate-400 whitespace-nowrap" title={formatDateTime(item.at)}>{relativeDate(item.at)} · {parseDate(item.at).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}</time>
            </div>
            <div className="mt-1">{body}</div>
        </li>
    );
}

// ── Details (view / edit) ───────────────────────────────────────
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
            custom_fields: Object.fromEntries(fields.map(f => [f.field_key, contact.custom_fields?.[f.field_key] ?? ''])),
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

    const rows = [
        [Mail, 'Email', contact.email && <a href={`mailto:${contact.email}`} className="text-indigo-600 hover:underline break-all">{contact.email}</a>],
        [Phone, 'Phone', contact.phone && <a href={`tel:${contact.phone}`} className="text-indigo-600 hover:underline">{contact.phone}</a>],
        [Smartphone, 'Mobile', contact.mobile_phone && <a href={`tel:${contact.mobile_phone}`} className="text-indigo-600 hover:underline">{contact.mobile_phone}</a>],
        [Building2, 'Industry', contact.industry],
        [MapPin, 'Location', [contact.poc_city, contact.poc_state, contact.poc_country].filter(Boolean).join(', ')],
        [Globe2, 'Timezone', contact.timezone],
        [Linkedin, 'LinkedIn', contact.linkedin_url && <a href={contact.linkedin_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline break-all">Profile</a>],
    ];

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
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
                    <Field label="Company" hint="Changing it links the contact to that account"><input className={inputClass} value={form.company_name} onChange={set('company_name')} /></Field>
                    <Field label="Industry"><input className={inputClass} value={form.industry} onChange={set('industry')} /></Field>
                    <div className="grid grid-cols-3 gap-2">
                        <Field label="City"><input className={inputClass} value={form.poc_city} onChange={set('poc_city')} /></Field>
                        <Field label="State"><input className={inputClass} value={form.poc_state} onChange={set('poc_state')} /></Field>
                        <Field label="Country"><input className={inputClass} value={form.poc_country} onChange={set('poc_country')} /></Field>
                    </div>
                    <Field label="LinkedIn"><input type="url" className={inputClass} value={form.linkedin_url} onChange={set('linkedin_url')} /></Field>
                    {fields.map(f => (
                        <Field key={f.field_id} label={f.label}>
                            <CustomFieldInput field={f} value={form.custom_fields[f.field_key]}
                                onChange={v => setForm(s => ({ ...s, custom_fields: { ...s.custom_fields, [f.field_key]: v } }))} />
                        </Field>
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
                            <dt className="w-20 text-slate-500 flex-shrink-0">{label}</dt>
                            <dd className="text-slate-800 min-w-0">{value || <span className="text-slate-300">—</span>}</dd>
                        </div>
                    ))}
                    {fields.length > 0 && <div className="border-t border-slate-100 my-3" />}
                    {fields.map(f => {
                        const value = contact.custom_fields?.[f.field_key];
                        return (
                            <div key={f.field_id} className="flex items-start gap-3 text-sm">
                                <span className="w-4 flex-shrink-0" />
                                <dt className="w-20 text-slate-500 flex-shrink-0 truncate" title={f.label}>{f.label}</dt>
                                <dd className="text-slate-800 min-w-0 break-words">
                                    {value === undefined || value === '' ? <span className="text-slate-300">—</span>
                                        : f.field_type === 'URL' ? <a href={value} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{value}</a>
                                        : String(value)}
                                </dd>
                            </div>
                        );
                    })}
                </dl>
            )}
        </div>
    );
}

function SideCard({ title, children, empty }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h2 className="text-sm font-bold text-slate-800 mb-3">{title}</h2>
            {children || <p className="text-sm text-slate-400">{empty}</p>}
        </div>
    );
}

// ── Page ────────────────────────────────────────────────────────
export default function ContactDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [timelineFilter, setTimelineFilter] = useState('');

    const { data: contact, isLoading, error } = useQuery({ queryKey: ['contact', id], queryFn: () => contactsApi.get(id), retry: false });
    const { data: timeline, isFetching: timelineLoading } = useQuery({
        queryKey: ['contact-timeline', id, timelineFilter],
        queryFn: () => contactsApi.timeline(id, timelineFilter),
        enabled: !!contact,
    });
    const { data: owners = [] } = useQuery({ queryKey: ['contact-owners'], queryFn: contactsApi.owners });
    const { data: fields = [] } = useQuery({ queryKey: ['contact-fields'], queryFn: contactsApi.fields });
    const { data: facets } = useQuery({ queryKey: ['contact-facets'], queryFn: contactsApi.facets });

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['contact', id] });
        queryClient.invalidateQueries({ queryKey: ['contact-timeline', id] });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
    };
    const onSaved = data => {
        queryClient.setQueryData(['contact', id], data);
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        queryClient.invalidateQueries({ queryKey: ['contact-facets'] });
    };

    const quickUpdate = useMutation({ mutationFn: payload => contactsApi.update(id, payload), onSuccess: onSaved });
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
        ['Calls', s.calls], ['Meetings', s.meetings], ['Last emailed', s.last_emailed_at ? relativeDate(s.last_emailed_at) : '—'],
    ];

    return (
        <div className="w-full space-y-5">
            <button onClick={() => navigate(-1)} className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #2d6bbf, #73C8D2)' }} />
                <div className="p-6 flex flex-col lg:flex-row lg:items-start gap-5">
                    <Avatar first={contact.first_name} last={contact.last_name} seed={contact.email} size="lg" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold text-gray-900">{contact.full_name}</h1>
                            {contact.consent_status === 'UNSUBSCRIBED' && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Unsubscribed</span>}
                            {contact.is_valid_email === false && <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Email invalid</span>}
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
                        <div className="mt-4 max-w-xl">
                            <TagInput value={contact.tags} onChange={tags => quickUpdate.mutate({ tags })}
                                suggestions={(facets?.tags || []).map(t => t.tag)} />
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
                            <button onClick={() => window.confirm(`Delete ${contact.full_name}? Their emails, activity and campaign history are deleted too.`) && remove.mutate()}
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

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
                {/* Left: profile */}
                <div className="space-y-5">
                    <DetailsCard contact={contact} fields={fields} onSaved={onSaved} />
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
                    <SideCard title="Lists" empty="Not on any list (added manually).">
                        {contact.lists.length > 0 && (
                            <ul className="space-y-2">
                                {contact.lists.map(l => (
                                    <li key={l.list_id} className="text-sm flex justify-between gap-2">
                                        <Link to={`/app/contacts?list_id=${l.list_id}`} className="text-slate-700 hover:text-indigo-600 truncate">{l.list_name}</Link>
                                        <span className="text-xs text-slate-400 whitespace-nowrap">{relativeDate(l.added_at)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </SideCard>
                    {contact.persona && (
                        <SideCard title="Persona">
                            <p className="text-sm text-slate-700">{contact.persona.persona_type.replace(/_/g, ' ').toLowerCase()}</p>
                        </SideCard>
                    )}
                </div>

                {/* Right: activity */}
                <div className="xl:col-span-2 space-y-5">
                    <ActivityComposer contactId={id} onLogged={refresh} />
                    <div className="bg-white rounded-2xl border border-gray-100 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
                            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                Activity {timelineLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                            </h2>
                            <div className="flex gap-1 flex-wrap">
                                {TIMELINE_FILTERS.map(([value, label]) => (
                                    <button key={label} onClick={() => setTimelineFilter(value)}
                                        className={`h-7 px-2.5 rounded-lg text-xs font-semibold ${timelineFilter === value ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {(timeline?.items || []).length === 0 ? (
                            <p className="text-sm text-slate-400 py-8 text-center">Nothing here yet. Log a call, meeting or note above.</p>
                        ) : (
                            <ul>
                                {timeline.items.map((item, i) => <TimelineItem key={`${item.kind}-${item.activity?.activity_id || item.email?.message_id || item.list?.list_id || item.campaign?.campaign_id}-${i}`} item={item} onChanged={refresh} />)}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
            {quickUpdate.isError && <div className="fixed bottom-6 right-6 bg-red-600 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
                {errorMessage(quickUpdate.error)} <button onClick={() => quickUpdate.reset()} aria-label="Dismiss"><X className="w-4 h-4" /></button>
            </div>}
        </div>
    );
}
