import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Contact, Target, Briefcase, CheckSquare, Mail } from 'lucide-react';
import ContactFormModal from '../contacts/ContactFormModal';
import { NewLeadModal } from '../../pages/Leads';
import { DealFormModal } from '../../pages/Deals';
import { NewTaskModal } from '../../pages/Tasks';
import { useTeamOwners } from '../sales/shared';
import { getStoredUser, hasPermission } from '../../lib/authStorage';

/** One "+ New" button for the records people create most. */
export default function NewMenu() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const owners = useTeamOwners();
    const ref = useRef(null);
    const [open, setOpen] = useState(false);
    const [modal, setModal] = useState(null);
    const me = getStoredUser();
    const canAssign = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(me?.role);
    useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);
    const items = [
        { key: 'contact', label: 'Contact', icon: Contact },
        { key: 'lead', label: 'Lead', icon: Target },
        { key: 'deal', label: 'Deal', icon: Briefcase },
        { key: 'task', label: 'Task', icon: CheckSquare },
        ...(hasPermission('manage_campaigns') ? [{ key: 'campaign', label: 'Campaign', icon: Mail }] : []),
    ];
    const pick = (key) => {
        setOpen(false);
        if (key === 'campaign') navigate('/app/campaigns/new');
        else setModal(key);
    };
    const done = (keys, to) => { setModal(null); keys.forEach(k => qc.invalidateQueries({ queryKey: [k] })); if (to) navigate(to); };
    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setOpen(v => !v)} className="h-9 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> New
            </button>
            {open && (
                <div className="absolute right-0 top-11 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1">
                    {items.map(i => (
                        <button key={i.key} onClick={() => pick(i.key)} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50">
                            <i.icon className="w-4 h-4 text-slate-400" /> {i.label}
                        </button>
                    ))}
                </div>
            )}
            {modal === 'contact' && <ContactFormModal owners={owners} canAssign={canAssign} onClose={() => setModal(null)}
                onCreated={c => done(['contacts', 'accounts'], `/app/contacts/${c.prospect_id}`)} />}
            {modal === 'lead' && <NewLeadModal onClose={() => setModal(null)} onCreated={l => done(['leads'], `/app/leads/${l.lead_id}`)} />}
            {modal === 'deal' && <DealFormModal onClose={() => setModal(null)} onSaved={d => done(['deals'], `/app/deals/${d.opportunity_id}`)} />}
            {modal === 'task' && <NewTaskModal owners={owners} canAssign={canAssign} onClose={() => setModal(null)} onSaved={() => done(['tasks'])} />}
        </div>
    );
}
