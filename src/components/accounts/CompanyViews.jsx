import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, ChevronDown, Loader2, Save, Trash2 } from 'lucide-react';
import { companiesApi } from '../../api/accounts';
import { errorMessage } from '../../api/contacts';
import { useConfirm } from '../ui/ConfirmDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/DropdownMenu';
import { ErrorNote, Field, inputClass, Modal, PrimaryButton, SecondaryButton } from '../contacts/shared';

export const VIEWS_KEY = ['views', 'COMPANY'];

/** Saved company views (BR-CM-19, F-14): loaded when the menu opens; picking one applies its filters, columns and sort. */
export function CompanyViewsMenu({ current, onApply, onSave }) {
    const queryClient = useQueryClient();
    const confirm = useConfirm();
    const triggerRef = useRef(null);
    const [open, setOpen] = useState(false);
    const { data: views = [], isLoading } = useQuery({ queryKey: VIEWS_KEY, queryFn: companiesApi.views, enabled: open });
    const remove = useMutation({
        mutationFn: companiesApi.deleteView,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: VIEWS_KEY }),
    });
    const askDelete = async (v) => {
        if (await confirm({ title: `Delete view “${v.name}”?`, confirmLabel: 'Delete', danger: true, returnFocusRef: triggerRef })) remove.mutate(v.view_id);
    };
    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <button ref={triggerRef}
                    className="h-9 px-3 flex items-center gap-1.5 text-sm font-medium rounded-xl border border-slate-200 text-slate-600 bg-white">
                    <Bookmark className="w-4 h-4" /> {current?.name || 'All companies'} <ChevronDown className="w-3.5 h-3.5" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="z-30 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5" aria-label="Saved views">
                <DropdownMenuItem onSelect={() => onApply(null)}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 font-medium text-slate-700">All companies</DropdownMenuItem>
                {isLoading && <div className="py-3 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-indigo-500" /></div>}
                {views.map(v => (
                    <div key={v.view_id} className="flex items-center gap-1">
                        <DropdownMenuItem onSelect={() => onApply(v)}
                            className={`flex-1 text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 ${current?.view_id === v.view_id ? 'text-indigo-700 font-semibold' : 'text-slate-700'}`}>
                            {v.name}{v.shared && <span className="ml-1.5 text-[10px] text-slate-400 uppercase">shared</span>}
                        </DropdownMenuItem>
                        {v.can_edit && (
                            <DropdownMenuItem onSelect={() => askDelete(v)}
                                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg" aria-label={`Delete view ${v.name}`}><Trash2 className="w-3.5 h-3.5" /></DropdownMenuItem>
                        )}
                    </div>
                ))}
                {!isLoading && views.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">No saved views yet.</p>}
                <DropdownMenuItem onSelect={() => onSave()}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-indigo-50 text-indigo-600 font-semibold flex items-center gap-1.5 border-t border-slate-100 mt-1">
                    <Save className="w-4 h-4" /> Save current view…
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/** Save the current filters, columns and sort as a company view (new, or update the one applied). */
export function SaveCompanyViewModal({ view, state, canShare, onClose, onSaved }) {
    const [name, setName] = useState(view?.name || '');
    const [shared, setShared] = useState(view?.shared || false);
    const [asNew, setAsNew] = useState(!view?.can_edit);
    const [error, setError] = useState(null);
    const save = useMutation({
        mutationFn: () => {
            const payload = { name: name.trim(), shared, filters: state.filters, columns: state.columns, sort: state.sort };
            return asNew ? companiesApi.createView(payload) : companiesApi.updateView(view.view_id, payload);
        },
        onSuccess: onSaved,
        onError: err => setError(errorMessage(err)),
    });
    return (
        <Modal title={asNew ? 'Save company view' : `Update “${view.name}”`} subtitle="Filters, columns and sort" onClose={onClose}
            footer={<><SecondaryButton onClick={onClose} className="flex-1">Cancel</SecondaryButton>
                <PrimaryButton onClick={() => save.mutate()} loading={save.isPending} disabled={!name.trim()} className="flex-1"><Save className="w-4 h-4" /> Save</PrimaryButton></>}>
            <div className="space-y-3">
                {view?.can_edit && (
                    <div className="flex gap-4 text-sm">
                        <label className="flex items-center gap-1.5"><input type="radio" className="accent-indigo-600" checked={!asNew} onChange={() => setAsNew(false)} /> Update this view</label>
                        <label className="flex items-center gap-1.5"><input type="radio" className="accent-indigo-600" checked={asNew} onChange={() => setAsNew(true)} /> Save as new</label>
                    </div>
                )}
                <Field label="Name"><input className={inputClass} value={name} onChange={e => setName(e.target.value)} autoFocus /></Field>
                {canShare && <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="accent-indigo-600" checked={shared} onChange={e => setShared(e.target.checked)} /> Share with everyone in the workspace</label>}
                <ErrorNote message={error} />
            </div>
        </Modal>
    );
}
