import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Globe, Phone, MapPin, Users, Pencil, Trash2, Loader2, Plus, Mail } from 'lucide-react';
import { accountsApi, contactsApi } from '../api/contacts';
import { hasPermission } from '../lib/authStorage';
import { AccountFormModal } from './Accounts';
import ContactFormModal from '../components/contacts/ContactFormModal';
import { Avatar, OwnerSelect, TagChips, relativeDate } from '../components/contacts/shared';

export default function AccountDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const canManage = hasPermission('manage_prospects');
    const [editing, setEditing] = useState(false);
    const [adding, setAdding] = useState(false);

    const { data: account, isLoading, error } = useQuery({ queryKey: ['account', id], queryFn: () => accountsApi.get(id), retry: false });
    const { data: owners = [] } = useQuery({ queryKey: ['contact-owners'], queryFn: contactsApi.owners });
    const { data: fields = [] } = useQuery({ queryKey: ['contact-fields'], queryFn: contactsApi.fields });

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['account', id] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
    };
    const setOwner = useMutation({ mutationFn: owner_id => accountsApi.update(id, { owner_id }), onSuccess: refresh });
    const remove = useMutation({
        mutationFn: () => accountsApi.remove(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accounts'] }); navigate('/app/accounts'); },
    });

    if (isLoading) return <div className="py-32 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-indigo-500" /></div>;
    if (error || !account) {
        return (
            <div className="py-24 text-center">
                <p className="text-lg font-bold text-slate-800">Account not found</p>
                <Link to="/app/accounts" className="inline-block mt-5 text-sm font-semibold text-indigo-600">← Back to accounts</Link>
            </div>
        );
    }

    const website = account.website || (account.domain ? `https://${account.domain}` : null);
    const stats = [['Contacts', account.stats.contacts], ['Emails sent', account.stats.emails_sent], ['Replies', account.stats.replies]];

    return (
        <div className="w-full space-y-5">
            <button onClick={() => navigate(-1)} className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #2d6bbf, #73C8D2)' }} />
                <div className="p-6 flex flex-col lg:flex-row gap-5">
                    <Avatar first={account.name} last={account.name.split(/\s+/)[1]} seed={account.name} size="lg" square />
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-gray-900">{account.name}</h1>
                        <p className="text-sm text-slate-500 mt-0.5">{[account.industry, account.emp_band && `${account.emp_band} employees`].filter(Boolean).join(' · ') || 'No industry set'}</p>
                        <div className="flex items-center gap-4 mt-3 text-sm text-slate-600 flex-wrap">
                            {website && <a href={website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-indigo-600"><Globe className="w-4 h-4" />{account.domain || account.website}</a>}
                            {account.phone && <a href={`tel:${account.phone}`} className="flex items-center gap-1.5 hover:text-indigo-600"><Phone className="w-4 h-4" />{account.phone}</a>}
                            {(account.city || account.country) && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{[account.city, account.state, account.country].filter(Boolean).join(', ')}</span>}
                        </div>
                        {account.description && <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap max-w-2xl">{account.description}</p>}
                    </div>
                    <div className="flex flex-col gap-3 lg:w-56">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Owner</p>
                            {canManage
                                ? <OwnerSelect owners={owners} value={account.owner_id} onChange={owner_id => setOwner.mutate(owner_id)} />
                                : <p className="text-sm font-medium text-slate-800">{account.owner_name || 'Unassigned'}</p>}
                        </div>
                        {account.can_edit && (
                            <button onClick={() => setEditing(true)} className="h-9 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl flex items-center justify-center gap-1.5 border border-slate-200">
                                <Pencil className="w-4 h-4" /> Edit account
                            </button>
                        )}
                        {canManage && (
                            <button onClick={() => window.confirm(`Delete ${account.name}? Its contacts are kept and unlinked.`) && remove.mutate()}
                                className="h-9 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl flex items-center justify-center gap-1.5 border border-red-100">
                                {remove.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete account
                            </button>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-3 border-t border-slate-100 divide-x divide-slate-100">
                    {stats.map(([label, value]) => (
                        <div key={label} className="px-5 py-3">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                            <p className="text-lg font-bold text-slate-800">{value}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500" /> Contacts at {account.name}</h2>
                    <div className="flex items-center gap-3">
                        <Link to={`/app/contacts?account_id=${account.account_id}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">Open in Contacts</Link>
                        <button onClick={() => setAdding(true)} className="h-8 px-3 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5" /> Add contact
                        </button>
                    </div>
                </div>
                {account.contacts.length === 0 ? (
                    <p className="text-sm text-slate-400 py-10 text-center">No contacts linked to this account yet.</p>
                ) : (
                    <ul className="divide-y divide-slate-50">
                        {account.contacts.map(c => (
                            <li key={c.prospect_id}>
                                <Link to={`/app/contacts/${c.prospect_id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/70">
                                    <Avatar first={c.first_name} last={c.last_name} seed={c.email} size="sm" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{c.full_name}</p>
                                        <p className="text-xs text-slate-500 truncate">{c.designation || '—'}</p>
                                    </div>
                                    <div className="hidden md:block text-sm text-slate-600 w-64 truncate"><Mail className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />{c.email}</div>
                                    <div className="hidden lg:block w-40"><TagChips tags={c.tags} max={2} /></div>
                                    <div className="text-sm text-slate-500 w-32 truncate">{c.owner_name || 'Unassigned'}</div>
                                    <div className="text-xs text-slate-400 w-20 text-right">{c.last_activity_at ? relativeDate(c.last_activity_at) : '—'}</div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {editing && <AccountFormModal account={account} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refresh(); }} />}
            {adding && (
                <ContactFormModal onClose={() => setAdding(false)} owners={owners} fields={fields} canAssign={canManage}
                    defaults={{ company_name: account.name }}
                    onCreated={() => { setAdding(false); refresh(); }} />
            )}
        </div>
    );
}
